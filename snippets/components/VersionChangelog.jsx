// Each child is the body of one version, in the same order as `versions`.
export const VersionChangelog = ({ versions = [], children }) => {
  const bodies = Array.isArray(children) ? children : [children];
  const [selected, setSelected] = useState(versions[0] ? versions[0].version : '');

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

  const choose = (event) => {
    const next = event.target.value;
    setSelected(next);
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
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label htmlFor="changelog-version" className="font-medium text-gray-900 dark:text-gray-100">
          Version
        </label>
        <select
          id="changelog-version"
          value={current.version}
          onChange={choose}
          style={{ minWidth: "22rem" }}
          className="rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          {versions.map((v) => (
            <option key={v.version} value={v.version}>
              {v.version} · {formatDate(v.date)}
              {v === latestStable ? ' · Latest' : ''}
              {v.channel !== 'Stable' ? ' · ' + v.channel : ''}
            </option>
          ))}
        </select>
        {current === latestStable && (
          <span className="rounded-full bg-primary/10 text-primary dark:text-primary-light px-3 py-1 text-sm font-medium">
            Latest
          </span>
        )}
        {current.channel !== 'Stable' && (
          <span className="rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 px-3 py-1 text-sm font-medium">
            {current.channel}
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
