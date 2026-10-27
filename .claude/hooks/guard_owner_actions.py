"""PreToolUse guard for what only the owner approves (AGENTS.md; CLAUDE.md → «Лише з OK власника»).

Reads the hook's JSON on stdin. Prints a PreToolUse "ask" decision — a person confirms in the permission prompt, with the
reason shown — or nothing (the call goes on through the usual permission rules). AGENTS.md lets the owner request a merge
or a deploy explicitly, so nothing here is a hard block: the prompt is where that request is given.

Commands are read as a shell would split them, not by prefix: prose (a quoted message, a heredoc body) is not a command,
a quoted single token ("main") still is, and a string run by `bash -c` / `eval` is read as a command again. This is a
guardrail for honest mistakes, not a security boundary — the boundary is the ruleset on `main` and Cloudflare's access.
"""
import json
import os
import re
import subprocess
import sys

SEPARATORS = {';', '&&', '||', '|', '&', '(', ')', '\n', '{', '}'}
SHELLS = {'bash', 'sh', 'zsh', 'dash'}
WRAPPERS = {'sudo', 'env', 'time', 'nice', 'nohup', 'timeout', 'xargs', 'command', 'exec'}
PROTECTED_FILES = (
    (re.compile(r'(^|/)lighthouserc\.cjs$'), 'Lighthouse budgets: no loosening without the owner’s OK.'),
    (re.compile(r'(^|/)sonar-project\.properties$'), 'Sonar scope and rules: no loosening without the owner’s OK.'),
    (re.compile(r'-snapshots/'), 'A visual baseline: only an owner-approved diff (DEC-18, docs/ci-tier-model.md).'),
    (re.compile(r'(^|/)\.claude/(settings\.json|hooks/)'), 'The guard itself (.claude/settings.json, .claude/hooks/): the owner reviews changes to it.'),
)
WRITE_COMMANDS = {'cp', 'mv', 'rm', 'ln', 'install', 'truncate', 'rsync', 'tee', 'dd', 'unlink'}


def tokenize(text):
    """Shell-like words and operators. A quoted string with whitespace (prose) becomes the word 'Q'; a quoted single
    token keeps its text. Returns (tokens, quoted_bodies) where quoted_bodies maps a token index to the raw string."""
    tokens, bodies, word, i, n = [], {}, '', 0, len(text)
    text = text.replace('\\\n', ' ')
    n = len(text)

    def flush():
        nonlocal word
        if word:
            tokens.append(word)
            word = ''

    while i < n:
        c = text[i]
        if c == '\\' and i + 1 < n:
            word += text[i + 1]
            i += 2
            continue
        if c in '"\'':
            j, body = i + 1, ''
            while j < n and text[j] != c:
                if c == '"' and text[j] == '\\' and j + 1 < n:
                    body += text[j + 1]
                    j += 2
                    continue
                body += text[j]
                j += 1
            i = j + 1
            if re.search(r'\s', body):
                flush()
                bodies[len(tokens)] = body
                tokens.append('Q')
            else:
                word += body
            continue
        if text.startswith('<<', i) and not text.startswith('<<<', i):
            m = re.match(r'<<-?\s*(["\']?)(\w+)\1', text[i:])
            if m:
                flush()
                tag = m.group(2)
                end_of_line = text.find('\n', i)
                rest = text[i + m.end():] if end_of_line < 0 else text[i + m.end():end_of_line]
                body_end = re.search(r'\n\s*' + re.escape(tag) + r'[ \t]*(?=\n|$)', text[end_of_line:]) if end_of_line >= 0 else None
                tokens.append('HEREDOC')
                # the rest of the opening line is still command text; only the body is prose
                sub_tokens, _ = tokenize(rest)
                tokens.extend(sub_tokens)
                i = end_of_line + body_end.end() if body_end else n
                continue
        if c.isspace():
            flush()
            if c == '\n':
                tokens.append('\n')
            i += 1
            continue
        two = text[i:i + 2]
        if two in ('&&', '||', '>>'):
            flush()
            tokens.append(two)
            i += 2
            continue
        if c in ';|&(){}><':
            flush()
            tokens.append(c)
            i += 1
            continue
        word += c
        i += 1
    flush()
    return tokens, bodies


def commands(text, depth=0):
    """Split into simple commands (lists of words); strings run by a shell -c or eval are expanded in place."""
    tokens, bodies = tokenize(text)
    result, current = [], []
    for index, token in enumerate(tokens):
        if token in SEPARATORS:
            if current:
                result.append(current)
            current = []
            continue
        if token == 'Q' and index in bodies and depth < 3 and current:
            words = [w for w in current if not w.startswith('-')]
            if (current[-1] == '-c' and any(w in SHELLS for w in words)) or (words and words[-1] == 'eval'):
                result.extend(commands(bodies[index], depth + 1))
                continue
        current.append(token)
    if current:
        result.append(current)
    return result


def strip_wrappers(words):
    """`timeout 60 git push`, `env A=1 git push`, `sudo git push` → `git push …`."""
    while words:
        head = words[0]
        if re.match(r'^[A-Za-z_][A-Za-z0-9_]*=', head):
            words = words[1:]
        elif head in WRAPPERS:
            words = words[1:]
            while words and (words[0].startswith('-') or re.match(r'^\d+[smhd]?$', words[0])):
                words = words[1:]
        else:
            break
    return words


def current_branch(cwd):
    try:
        out = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=cwd or None, capture_output=True, text=True, timeout=5)
        return out.stdout.strip() if out.returncode == 0 else ''
    except (OSError, subprocess.SubprocessError):
        return ''


def check_git(words, cwd):
    if words[0] != 'git':
        return None
    rest = words[1:]
    while rest and rest[0].startswith('-'):
        rest = rest[2:] if rest[0] in ('-C', '-c') else rest[1:]
    if not rest or rest[0] != 'push':
        return None
    args = rest[1:]
    flags = [a for a in args if a.startswith('-')]
    positional = [a for a in args if not a.startswith('-')]
    if any(a in ('--all', '--mirror') for a in flags):
        return 'Pushing every branch includes main: the owner merges into main (DEC-30).'
    refspecs = positional[1:]
    if any(re.search(r'(^|[:+]|refs/heads/)main$', r) for r in refspecs):
        return 'Pushing to main: the owner merges into main (DEC-30).'
    if not refspecs or any(r.lstrip('+') in ('HEAD', '@') for r in refspecs):
        if current_branch(cwd) == 'main':
            return 'This checkout is on main: `git push` without a branch pushes to main (DEC-30).'
    if any(f in ('--force', '-f', '--force-with-lease', '--force-if-includes') or f.startswith('--force-with-lease=')
           or re.match(r'^-[a-zA-Z]*f[a-zA-Z]*$', f) for f in flags) or any(r.startswith('+') for r in refspecs):
        return 'Force push: only on a branch this session created, never on someone else’s branch.'
    return None


def check_gh(words, raw):
    if words[0] != 'gh':
        return None
    sub = [w for w in words[1:] if not w.startswith('-')]
    if sub[:2] == ['pr', 'merge']:
        return 'Merging a pull request: only on the owner’s explicit request (AGENTS.md, DEC-30).'
    if sub[:1] == ['api']:
        method = None
        for i, w in enumerate(words):
            if w in ('-X', '--method') and i + 1 < len(words):
                method = words[i + 1].upper()
            elif w.startswith('--method='):
                method = w.split('=', 1)[1].upper()
        writes = method in ('POST', 'PUT', 'PATCH', 'DELETE') or (method is None and any(
            w in ('-f', '-F', '--field', '--raw-field', '--input') for w in words))
        joined = ' '.join(words) + ' ' + raw
        if re.search(r'\bgraphql\b', joined) and re.search(r'mergePullRequest|enablePullRequestAutoMerge|mergeBranch|updateRef|deleteRef|createRuleset|updateRuleset', raw):
            return 'A GraphQL mutation that merges or moves branches: only with the owner’s OK.'
        if writes and re.search(r'/(pulls/\d+/merge|merges|rulesets|branches/[^/\s]+/protection|git/refs)\b', joined):
            return 'A write to merges, refs, rulesets or branch protection: only with the owner’s OK.'
    return None


def check_deploy(words):
    joined = ' '.join(words)
    if re.search(r'\bwrangler\b.*\b(deploy|publish|rollback)\b', joined) or re.search(r'\bwrangler\b.*\bversions\s+(deploy|upload)\b', joined):
        return 'A Cloudflare deploy: only on the owner’s OK for that deployment (AGENTS.md).'
    if re.search(r'\bwrangler\b.*\bsecret\s+(put|delete|bulk)\b', joined):
        return 'A production secret change: only with the owner’s OK.'
    if re.search(r'\bwrangler\b.*\bd1\b.*--remote\b', joined):
        return 'A query or migration against the production D1: only with the owner’s OK.'
    if re.search(r'(\bvinext|@vinext/cloudflare)\b.*\bdeploy\b', joined):
        return 'A Cloudflare deploy: only on the owner’s OK for that deployment (AGENTS.md).'
    return None


def check_baselines(words):
    joined = ' '.join(words)
    if re.search(r'--update-snapshots|\btest:visual:update\b', joined) or (
            re.search(r'\bplaywright\b', joined) and '-u' in words):
        return 'Refreshing visual baselines: only for diffs the owner reviewed and approved (DEC-18, docs/ci-tier-model.md).'
    return None


def check_protected_writes(words, tokens_text):
    """`sed -i`, `cp`, `tee`, `>` and friends aimed at a protected file."""
    for pattern, reason in PROTECTED_FILES:
        targets = [w for w in words if pattern.search(w)]
        if not targets:
            continue
        head = words[0]
        positional = [w for w in words[1:] if not w.startswith('-')]
        if head in ('cp', 'ln', 'install', 'rsync'):
            # copying a protected file elsewhere reads it; only a protected destination changes it
            if positional and pattern.search(positional[-1]):
                return reason
        elif head in WRITE_COMMANDS or (head in ('sed', 'perl') and any(re.match(r'^-[a-zA-Z]*i', w) for w in words[1:])):
            return reason
        for target in targets:
            if re.search(r'>>?\s*' + re.escape(target), tokens_text):
                return reason
    return None


def decide(payload):
    tool = payload.get('tool_name') or ''
    tool_input = payload.get('tool_input') or {}
    cwd = payload.get('cwd') or os.getcwd()
    if tool == 'Bash':
        raw = tool_input.get('command') or ''
        for words in commands(raw):
            words = strip_wrappers(words)
            if not words:
                continue
            for check in (lambda: check_git(words, cwd), lambda: check_gh(words, raw), lambda: check_deploy(words),
                          lambda: check_baselines(words)):
                reason = check()
                if reason:
                    return reason
        # redirections are separate tokens: look at each simple command's words joined back with them
        tokens, _ = tokenize(raw)
        text = ' '.join(tokens)
        for words in commands(raw):
            reason = check_protected_writes(strip_wrappers(words), text)
            if reason:
                return reason
        return None
    if tool in ('Edit', 'Write', 'MultiEdit', 'NotebookEdit'):
        path = tool_input.get('file_path') or tool_input.get('notebook_path') or ''
        for pattern, reason in PROTECTED_FILES:
            if pattern.search(path):
                return reason
    return None


def main():
    try:
        reason = decide(json.load(sys.stdin))
    except Exception as error:  # a guard that cannot read the call asks rather than lets it through
        reason = f'The owner-action guard could not check this call ({type(error).__name__}); confirm it yourself.'
    if reason:
        print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'permissionDecision': 'ask',
                                                 'permissionDecisionReason': reason}}, ensure_ascii=False))


if __name__ == '__main__':
    main()
