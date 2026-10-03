import { expect, type Page } from '@playwright/test';

export type ControlGroup = 'object' | 'dimensions' | 'envelope' | 'cladding' | 'scope' | 'openings';

/**
 * On a phone /angary folds the configurator's groups into an accordion, «Об’єкт» open (03.10): open the group a control
 * lives in before using it. Wider than 760 px — and on /configurator-preview — every group is open and this does
 * nothing. It waits for the accordion first: until hydration the server markup has every group open, and a value typed
 * into it then would be folded away under the test.
 */
export async function openControlGroup(page: Page, group: ControlGroup) {
  if ((page.viewportSize()?.width ?? Infinity) > 760) return;
  await expect(page.locator('#configurator .hc-controls')).toHaveAttribute('data-accordion', '');
  const toggle = page.locator(`#configurator [aria-controls="hc-${group}-panel"]`);
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}
