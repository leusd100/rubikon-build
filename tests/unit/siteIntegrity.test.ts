import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { directions } from '../../app/data/directions';
import { relatedDirections } from '../../app/data/relatedDirections';
import { siteRoutes, primaryNavigation } from '../../app/data/navigation';
import { directionPages } from '../../app/data/directionPages';
import sitemap from '../../app/sitemap';
import robots from '../../app/robots';
import { siteUrl } from '../../app/lib/seo';

const problems: string[] = [];
const note = (c: boolean, m: string) => { if (!c) problems.push(m); };
const ROOT = process.cwd();
const ids: ReadonlySet<string> = new Set<string>(directions.map((d) => d.id));

describe('INTEGRITY', () => {
  it('site data is internally consistent', () => {
    // 1. Every direction has a real route on disk, and its href matches its id.
    for (const d of directions) {
      note(existsSync(join(ROOT, 'app', d.id, 'page.tsx')), `direction "${d.id}": no app/${d.id}/page.tsx`);
      note(d.href === `/${d.id}`, `direction "${d.id}": href ${d.href} != /${d.id}`);
      for (const [field, v] of Object.entries(d)) {
        if (typeof v === 'string') note(v.trim().length > 0, `direction "${d.id}": empty ${field}`);
      }
    }
    // 2. No duplicate ids or numbers.
    note(new Set(directions.map((d) => d.id)).size === directions.length, 'duplicate direction ids');
    note(new Set(directions.map((d) => d.number)).size === directions.length, 'duplicate direction numbers');

    // 3. Related directions point at real ids and never at themselves.
    for (const [from, list] of Object.entries(relatedDirections as Record<string, Array<{ id: string; relation: string }>>)) {
      note(ids.has(from), `relatedDirections key "${from}" is not a direction id`);
      for (const r of list) {
        note(ids.has(r.id), `relatedDirections["${from}"] -> unknown id "${r.id}"`);
        note(r.id !== from, `relatedDirections["${from}"] links to itself`);
        note(r.relation.trim().length > 0, `relatedDirections["${from}"].${r.id}: empty relation`);
      }
    }

    // 4. Every direction has page content, and every content key is a real direction.
    for (const id of ids) note(id in directionPages, `directionPages missing "${id}"`);
    for (const key of Object.keys(directionPages)) note(ids.has(key), `directionPages has unknown key "${key}"`);

    // 5. Navigation targets exist: absolute routes must be real pages.
    const routeExists = (href: string) => {
      if (href.startsWith('#')) return true;
      const path = href.split('#')[0];
      if (path === '/') return existsSync(join(ROOT, 'app', 'page.tsx'));
      return existsSync(join(ROOT, 'app', path.replace(/^\//, ''), 'page.tsx'));
    };
    for (const [name, href] of Object.entries(siteRoutes)) note(routeExists(href), `siteRoutes.${name} -> ${href} has no page`);
    for (const item of primaryNavigation as ReadonlyArray<{ href: string; label: string }>) {
      note(routeExists(item.href), `nav "${item.label}" -> ${item.href} has no page`);
    }

    // 6. Hero images referenced by directions exist in public/.
    for (const d of directions) {
      for (const [field, v] of [['image', d.image], ['heroPoster', d.heroPoster], ['heroPosterMobile', d.heroPosterMobile]] as const) {
        if (typeof v === 'string' && v.startsWith('/')) {
          note(existsSync(join(ROOT, 'public', v.replace(/^\//, ''))), `direction "${d.id}".${field} -> missing public${v}`);
        }
      }
    }

    // 7. Every page that exists is either in the sitemap or disallowed in robots.txt — the two
    //    ways a route can be "handled". A new page that is in neither is the failure this catches:
    //    silently unlisted, silently crawlable.
    const sitemapPaths = new Set(sitemap().map((e) => e.url.replace(siteUrl, '') || '/'));
    const rules = robots().rules;
    const firstRule = Array.isArray(rules) ? rules[0] : rules;
    const rawDisallow = firstRule?.disallow;
    const disallowed = new Set<string>(
      typeof rawDisallow === 'string' ? [rawDisallow] : rawDisallow ?? [],
    );
    const pageRoutes = readdirSync(join(ROOT, 'app'), { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(ROOT, 'app', e.name, 'page.tsx')))
      .map((e) => `/${e.name}`);
    pageRoutes.push('/');
    for (const route of pageRoutes) {
      note(sitemapPaths.has(route) || disallowed.has(route),
        `route ${route} is in neither the sitemap nor robots.txt disallow`);
    }
    // ...and nothing disallowed may also be advertised in the sitemap.
    for (const d of disallowed) note(!sitemapPaths.has(d), `${d} is both disallowed and in the sitemap`);
    // Every sitemap entry must be a real page.
    for (const path of sitemapPaths) {
      note(path === '/' ? existsSync(join(ROOT, 'app', 'page.tsx')) : existsSync(join(ROOT, 'app', path.replace(/^\//, ''), 'page.tsx')),
        `sitemap advertises ${path} which has no page`);
    }

    const unique = [...new Set(problems)];
    expect(unique, unique.join('\n')).toEqual([]);
  });
});
