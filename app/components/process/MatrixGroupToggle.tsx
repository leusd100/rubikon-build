'use client';

import { useState } from 'react';

// /yak-pratsyuiemo, a phone: one group of the responsibility table folds under its title (Phase 3, PROPOSED). The button
// keeps the group's id in the wrap's data-open list, and resp-matrix.css hides the rows of every group not in it — only on
// a phone and only once the head script has run (:root[data-theme]), so without JavaScript every row stays in view. On a
// wider screen the button is not shown and the group's plain title stands in its place.
export function MatrixGroupToggle({ group, title, count, rows, initiallyOpen }: Readonly<{
  group: string;
  title: string;
  /** «5 робіт» */
  count: string;
  /** The ids of the group's rows */
  rows: readonly string[];
  initiallyOpen: boolean;
}>) {
  const [open, setOpen] = useState(initiallyOpen);

  const toggle = (button: HTMLButtonElement) => {
    const wrap = button.closest<HTMLElement>('.resp-matrix-wrap');
    const next = !open;
    if (wrap) {
      const groups = new Set((wrap.dataset.open ?? '').split(' ').filter(Boolean));
      if (next) groups.add(group);
      else groups.delete(group);
      wrap.dataset.open = [...groups].join(' ');
    }
    setOpen(next);
  };

  return (
    <button
      type="button"
      className="rm-group-toggle"
      data-group={group}
      aria-expanded={open}
      aria-controls={rows.join(' ')}
      onClick={(event) => toggle(event.currentTarget)}
    >
      <span>{title}</span>{' '}
      <small className="rm-group-count">{count}</small>
      <i aria-hidden="true" />
    </button>
  );
}
