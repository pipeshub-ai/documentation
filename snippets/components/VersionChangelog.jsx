// Each child is the body of one version, in the same order as `versions`.
export const VersionChangelog = ({ versions = [], children }) => {
  const bodies = Array.isArray(children) ? children : [children];
  const [selected, setSelected] = useState(versions[0] ? versions[0].version : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById('changelog-version-' + active);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('version');
    if (fromUrl && versions.some((v) => v.version === fromUrl)) {
      setSelected(fromUrl);
    }
  }, []);

  if (versions.length === 0) {
    return <p>No releases yet.</p>;
  }

  const latestStable = versions.find((v) => v.channel === 'Stable');
  const current = versions.find((v) => v.version === selected) || versions[0];

  const toggle = (next) => {
    if (next) setActive(Math.max(0, versions.indexOf(current)));
    setOpen(next);
  };

  const onKeyDown = (e) => {
    const last = versions.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        toggle(true);
      }
      return;
    }
    const moves = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };
    if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(versions[active].version);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const choose = (next) => {
    setSelected(next);
    setOpen(false);
    buttonRef.current.focus();
    const url = new URL(window.location.href);
    url.searchParams.set('version', next);
    window.history.replaceState(null, '', url);
  };

  const formatDate = (iso) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
      <div ref={rootRef} style={{ width: "20rem" }} className="relative" onKeyDown={onKeyDown}>
        <button
          ref={buttonRef}
          type="button"
          role="combobox"
          aria-label="Version"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls="changelog-version-list"
          aria-activedescendant={open ? 'changelog-version-' + active : undefined}
          onClick={() => toggle(!open)}
          className="flex h-9 w-full items-center gap-2 rounded-md border border-gray-950/10 dark:border-white/10 bg-transparent hover:bg-gray-950/5 dark:hover:bg-white/5 text-sm text-gray-900 dark:text-gray-100 px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <span className="font-medium">{current.version}</span>
          <span className="text-gray-500 dark:text-gray-400">{formatDate(current.date)}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="ml-auto opacity-50" aria-hidden="true">
            <path d="M3 4.5l3 3 3-3" />
          </svg>
        </button>
        {open && (
          <div
            id="changelog-version-list"
            role="listbox"
            aria-label="Versions"
            style={{ scrollbarWidth: 'none' }}
            className="absolute left-0 z-20 mt-1 max-h-96 min-w-full overflow-y-auto rounded-md w-full border border-gray-950/10 dark:border-white/10 bg-white dark:bg-[#0b0f0f] text-gray-900 dark:text-gray-100 shadow-md p-1"
          >
            {versions.map((v, i) => (
              <div
                key={v.version}
                id={'changelog-version-' + i}
                role="option"
                aria-selected={v === current}
                onClick={() => choose(v.version)}
                onMouseEnter={() => setActive(i)}
                className={'relative flex items-center gap-2 whitespace-nowrap rounded-sm py-1.5 px-3 text-sm cursor-default ' + (i === active ? 'bg-gray-950/5 dark:bg-white/10' : '')}
              >
                <span>{v.version}</span>
                <span className="text-gray-500 dark:text-gray-400">{formatDate(v.date)}</span>
                {v.channel !== 'Stable' && <span className="text-xs text-gray-500 dark:text-gray-400">{v.channel}</span>}
                {v === current && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0" aria-hidden="true">
                    <path d="M3 7.5l2.5 2.5L11 4.5" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {current === latestStable && (
        <span className="rounded-full bg-primary/10 text-primary dark:text-primary-light px-2.5 py-0.5 text-xs font-medium">
          Latest
        </span>
      )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
        Released {formatDate(current.date)} ·{' '}
        <a href={current.releaseUrl} className="underline">
          View on GitHub
        </a>
      </p>
      <h2 className="mt-2">
        {current.version} — {current.summary}
      </h2>
      <div>{bodies[versions.indexOf(current)]}</div>
    </div>
  );
};
