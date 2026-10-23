// Platform Changelog sidebar: style.css shows the newest 5 releases; this adds a row at the end of the
// list with "Show less" on the left and "Show more" on the right, 5 releases per click.
// Mintlify loads every .js file in the repo on every page.
(() => {
  const BATCH = 5;
  const PREFIX = '/changelog/platform/';
  const KEY = 'changelog-sidebar-shown';
  let shown = Number(sessionStorage.getItem(KEY)) || BATCH; // survives page loads within the tab
  let arrived = null; // the open release, once its batches have been revealed

  const set = (n) => {
    shown = n;
    sessionStorage.setItem(KEY, String(n));
    apply();
  };

  // Chevron (lucide), pointing down for "Show more" and up for "Show less".
  const chevron = (points) =>
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${points}"/></svg>`;

  // Styled like the sidebar's own links, so it follows the site theme.
  const button = (label, icon, link, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `${icon}<span>${label}</span>`;
    b.className = link.className;
    b.style.cssText = 'flex:1 1 0;justify-content:center;align-items:center;gap:0.375rem;padding-left:0.75rem';
    b.addEventListener('click', onClick);
    return b;
  };

  const apply = () => {
    const first = document.querySelector(`#sidebar li[id^="${PREFIX}"]`);
    if (!first) return;
    const list = first.parentElement;
    const releases = [...list.children].filter((li) => li.id.startsWith(PREFIX));
    // Arriving at an older release reveals the batches up to it, as if "Show more" was clicked.
    // Only on arrival: afterwards "Show less" works, and style.css keeps the open release visible.
    const open = releases.findIndex((li) => li.dataset.active === 'true');
    if (open >= 0 && releases[open].id !== arrived) {
      arrived = releases[open].id;
      if (open >= shown) return set(Math.ceil((open + 1) / BATCH) * BATCH);
    }

    releases.forEach((li, i) => {
      if ((i < shown) !== li.hasAttribute('data-shown')) li.toggleAttribute('data-shown', i < shown);
    });

    let row = list.querySelector(':scope > li[data-changelog-more]');
    if (!row) {
      const link = first.querySelector('a');
      row = document.createElement('li');
      row.dataset.changelogMore = '';
      row.style.gap = '0.25rem';
      row.append(
        button('Show less', chevron('m18 15-6-6-6 6'), link, () => set(Math.max(BATCH, shown - BATCH))),
        button('Show more', chevron('m6 9 6 6 6-6'), link, () => set(Math.min(releases.length, shown + BATCH))),
      );
    }
    // One button takes the full width; two share it equally.
    const [less, more] = row.children;
    less.style.display = shown > BATCH ? '' : 'none';
    more.style.display = shown < releases.length ? '' : 'none';
    row.style.display = releases.length > BATCH ? 'flex' : 'none';
    if (list.lastElementChild !== row) list.append(row);
  };

  // The sidebar is re-rendered on navigation; re-apply at most once per frame.
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }).observe(document.body, { childList: true, subtree: true });
  apply();
})();
