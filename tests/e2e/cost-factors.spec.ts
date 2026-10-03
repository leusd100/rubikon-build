import { expect, test } from '@playwright/test';

// The cost-factor drawing (CostFactorsFigure), shared by /angary (on the «Креслення» sheet) and /yak-pratsyuiemo. Owner,
// 04.10: the site's crane is an автокран on four outriggers on its pad (badge 6 on the outriggers), not a tower crane;
// snow lies on the whole roof; nothing crosses the building, a badge or a dimension. The drawing is decorative, so its
// rules are checked on its geometry: every drawn line sampled, the building as the outline of its slab, wall and frames.

const ROUTES = ['/angary', '/yak-pratsyuiemo'] as const;

for (const route of ROUTES) {
  test(`${route} cost drawing: the crane, the snow and the badges keep clear of each other`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route, { waitUntil: 'load' });
    const svg = page.locator('.proc-factors svg').first();
    await svg.scrollIntoViewIfNeeded();

    const geometry = await svg.evaluate((drawing) => {
      const ns = 'http://www.w3.org/2000/svg';
      type Point = [number, number];
      const sample = (d: string): Point[] => {
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', d);
        drawing.querySelector('defs')!.appendChild(path);
        const points: Point[] = [];
        const length = path.getTotalLength();
        for (let at = 0; at <= length; at += 0.5) {
          const { x, y } = path.getPointAtLength(at);
          points.push([x, y]);
        }
        path.remove();
        return points;
      };
      const pieces = (selector: string) => [...drawing.querySelectorAll<SVGPathElement>(selector)]
        .flatMap((path) => path.getAttribute('d')!.split(/(?=M)/));
      const pointsOf = (selector: string) => pieces(selector).flatMap(sample);
      const gap = (points: Point[], [x, y]: Point) => Math.min(...points.map(([px, py]) => Math.hypot(px - x, py - y)));

      // The building: the convex outline of its slab, side wall and frames (the snow arrows stand outside it)
      const corners = pointsOf('path[data-part="foundation"], path[data-part="insulation"], [data-part="structure"] path:not(.cf-loads)')
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const half = (points: Point[]) => points.reduce<Point[]>((chain, point) => {
        while (chain.length >= 2 && cross(chain.at(-2)!, chain.at(-1)!, point) <= 0) chain.pop();
        chain.push(point);
        return chain;
      }, []);
      const lower = half(corners);
      const upper = half([...corners].reverse());
      const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
      /** Distance to the building's outline, negative inside it */
      const toBuilding = ([x, y]: Point) => {
        const sides = new Set<number>();
        let nearest = Infinity;
        hull.forEach(([ax, ay], index) => {
          const [bx, by] = hull[(index + 1) % hull.length];
          sides.add(Math.sign(cross([ax, ay], [bx, by], [x, y])));
          const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
          nearest = Math.min(nearest, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
        });
        // inside: on the same side of every edge
        return sides.has(1) && sides.has(-1) ? nearest : -nearest;
      };

      const badges = [...drawing.querySelectorAll<SVGGElement>('.cf-badge')].map((badge) => {
        const { e, f } = badge.transform.baseVal.consolidate()!.matrix;
        return { key: badge.dataset.part!, at: [e, f] as Point, r: Number.parseFloat(getComputedStyle(badge.querySelector('circle')!).r) };
      });
      const site = pointsOf('[data-part="logistics"] path');
      const dimensions = pointsOf('path[data-part="dimensions"]');
      const others = pointsOf('path[data-part]:not([data-part="logistics"]), [data-part]:not([data-part="logistics"]) path');
      const loads = pieces('.cf-loads');
      const shafts = loads.filter((piece) => piece.includes('V'));
      // Which side of the ridge each arrow stands: the ridge runs through the frames' apexes
      const apexes = pieces('[data-part="structure"] path:not(.cf-loads)')
        .map((piece) => piece.slice(1).split('L').map((pair) => pair.split(',').map(Number) as Point))
        .filter((vertices) => vertices.length === 5)
        .map((vertices) => vertices[2]);
      const [r1, r2] = [apexes[0], apexes.at(-1)!];
      const tips = shafts.map((piece) => {
        const [, x, , tipY] = /M([\d.]+),([\d.]+)V([\d.]+)/.exec(piece)!.map(Number);
        return [x, tipY] as Point;
      });

      const slab = pointsOf('path[data-part="foundation"]');
      const centre: Point = [slab.reduce((sum, [x]) => sum + x, 0) / slab.length, slab.reduce((sum, [, y]) => sum + y, 0) / slab.length];

      return {
        insideSelfCheck: toBuilding(centre),
        siteToBuilding: Math.min(...site.map(toBuilding)),
        siteToDimensions: Math.min(...site.map((point) => gap(dimensions, point))),
        siteToBadges: Object.fromEntries(badges.filter((badge) => badge.key !== 'logistics').map((badge) => [badge.key, gap(site, badge.at) - badge.r])),
        loadsToBadges: Math.min(...badges.map((badge) => gap(pointsOf('.cf-loads'), badge.at) - badge.r)),
        badge6: (() => {
          const badge = badges.find((item) => item.key === 'logistics')!;
          return { onSite: gap(site, badge.at), r: badge.r, othersClear: gap(others, badge.at) - badge.r };
        })(),
        arrows: shafts.length,
        arrowSides: tips.map((tip) => Math.sign(cross(r1, r2, tip))),
      };
    });

    // The crane, its pad and the road stand beside the building and cross neither a badge nor a dimension
    expect(geometry.insideSelfCheck).toBeLessThan(0);
    expect(geometry.siteToBuilding).toBeGreaterThan(6);
    expect(geometry.siteToDimensions).toBeGreaterThan(1.5);
    for (const [key, clearance] of Object.entries(geometry.siteToBadges)) expect(clearance, `badge ${key}`).toBeGreaterThan(1);
    // Badge 6 sits on the crane's outriggers, nothing else under it
    expect(geometry.badge6.onSite).toBeLessThan(geometry.badge6.r / 2);
    expect(geometry.badge6.othersClear).toBeGreaterThan(1);
    // Snow on the whole roof: three arrows down each slope, above the roof and clear of every badge
    expect(geometry.arrows).toBe(6);
    expect(geometry.arrowSides.filter((side) => side > 0)).toHaveLength(3);
    expect(geometry.arrowSides.filter((side) => side < 0)).toHaveLength(3);
    expect(geometry.loadsToBadges).toBeGreaterThan(1);
  });

  test(`${route} cost drawing: each factor lights its own part and number`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route, { waitUntil: 'load' });
    const figure = page.locator('.proc-factors').first();
    const rows = figure.locator('li');
    await expect(rows).toHaveCount(7);
    for (const key of await rows.evaluateAll((items) => items.map((item) => item.getAttribute('data-factor')!))) {
      const row = figure.locator(`li[data-factor="${key}"]`);
      // the mouse points; a tap lights it on a phone
      if (testInfo.project.name === 'mobile-chromium') await row.tap();
      else await row.hover();
      await expect(figure).toHaveAttribute('data-active', key);
      await expect.poll(() => figure.locator(`.cf-badge[data-part="${key}"]`).evaluate((badge) => getComputedStyle(badge).opacity)).toBe('1');
      await expect.poll(() => figure.locator(`.cf-part[data-part="${key}"]`).evaluate((part) => getComputedStyle(part).opacity)).toBe('1');
      await expect.poll(() => figure.locator(`.cf-part[data-part]:not([data-part="${key}"])`).evaluateAll((parts) => parts.map((part) => getComputedStyle(part).opacity)))
        .not.toContain('1');
    }
  });

  // Every badge whole inside the drawing and clear of the others — at a phone's larger radius too (04.10: the sizes' 1 was
  // cut flat by the drawing's bottom edge, and the foundation's 3 touched the schedule's 7)
  test(`${route} cost drawing: every badge is whole and apart`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route, { waitUntil: 'load' });
    const svg = page.locator('.proc-factors svg').first();
    await svg.scrollIntoViewIfNeeded();
    const problems = await svg.evaluate((drawing) => {
      const view = (drawing as SVGSVGElement).viewBox.baseVal;
      const badges = [...drawing.querySelectorAll<SVGGElement>('.cf-badge')].map((badge) => {
        const { e, f } = badge.transform.baseVal.consolidate()!.matrix;
        const circle = badge.querySelector('circle')!;
        const style = getComputedStyle(circle);
        return { key: badge.dataset.part!, x: e, y: f, r: Number.parseFloat(style.r) + Number.parseFloat(style.strokeWidth) / 2 };
      });
      const found: string[] = [];
      for (const badge of badges) {
        if (badge.x - badge.r < view.x || badge.y - badge.r < view.y || badge.x + badge.r > view.x + view.width || badge.y + badge.r > view.y + view.height) found.push(`${badge.key} leaves the drawing`);
        for (const other of badges) {
          if (other.key <= badge.key) continue;
          if (Math.hypot(badge.x - other.x, badge.y - other.y) < badge.r + other.r + 2) found.push(`${badge.key} × ${other.key}`);
        }
      }
      return found;
    });
    expect(problems).toEqual([]);
  });
}
