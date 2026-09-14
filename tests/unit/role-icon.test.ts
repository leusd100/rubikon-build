import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleIcon, { ROLES } from '../../app/components/RoleIcon';

// The role icons are decoration beside a label: hidden from assistive tech, no colour or words of
// their own, and one distinct symbol per role.

describe('RoleIcon', () => {
  it('has exactly the eight approved roles, in a stable order', () => {
    expect(ROLES).toEqual(['rubikon', 'client', 'partner', 'result', 'documents', 'scope', 'schedule', 'why']);
  });

  it('draws each role as a hidden line drawing with no colour, style or text of its own', () => {
    const glyphs = new Set<string>();
    for (const role of ROLES) {
      const markup = renderToStaticMarkup(createElement(RoleIcon, { role }));
      expect(markup, role).toMatch(new RegExp(`^<svg class="role-icon role-icon-${role}" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">`));
      expect(markup, role).not.toMatch(/fill=|stroke=|style=|<title|<text/);
      glyphs.add(markup.replace(/^<svg[^>]*>/, ''));
    }
    expect(glyphs.size).toBe(ROLES.length);
  });
});
