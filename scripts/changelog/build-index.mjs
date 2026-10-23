#!/usr/bin/env node
// Builds the product changelog pages from the version files.
//
//   changelog/{product}/{version}.mdx   <- input, one file per release (frontmatter + body)
//   changelog/{product}.mdx             <- output, generated: imports every version file
//
// Usage:
//   node scripts/changelog/build-index.mjs          write the pages
//   node scripts/changelog/build-index.mjs --check  exit 1 if a page is missing or stale
//
// No dependencies. The format of a version file is in scripts/changelog/SPEC.md.

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHANGELOG_DIR = join(ROOT, 'changelog');

// One entry for each product that has a changelog. A directory under changelog/
// that is not listed here is an error, so a typo in a product name is caught.
const PRODUCTS = {
  platform: {
    title: 'Platform Changelog',
    name: 'PipesHub',
    description: 'Release notes for the PipesHub Workplace AI platform',
    icon: 'bolt',
  },
};

const CHANNELS = ['Stable', 'Beta', 'Alpha', 'Pre-release'];
const REQUIRED = ['title', 'version', 'date', 'channel', 'release_url', 'summary'];
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

const fail = (message) => {
  console.error(`changelog: ${message}`);
  process.exitCode = 1;
};

function parseFrontmatter(text, file) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${file}: missing frontmatter`);
  const data = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) throw new Error(`${file}: cannot read frontmatter line "${line}"`);
    let value = kv[2].trim();
    if (value.startsWith('"')) value = JSON.parse(value);
    data[kv[1]] = value;
  }
  return data;
}

function compareSemver(a, b) {
  const [, a1, a2, a3, aPre] = a.match(SEMVER);
  const [, b1, b2, b3, bPre] = b.match(SEMVER);
  for (const [x, y] of [[a1, b1], [a2, b2], [a3, b3]]) {
    if (Number(x) !== Number(y)) return Number(x) - Number(y);
  }
  if (!aPre && !bPre) return 0;
  if (!aPre) return 1; // a release is newer than its own pre-release
  if (!bPre) return -1;
  // SemVer 11.4: dot-separated identifiers, numeric ones compare as numbers and rank below text.
  const x = aPre.split('.');
  const y = bPre.split('.');
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    const xn = /^\d+$/.test(x[i]);
    const yn = /^\d+$/.test(y[i]);
    if (xn && yn) return Number(x[i]) - Number(y[i]);
    if (xn !== yn) return xn ? -1 : 1;
    return x[i] < y[i] ? -1 : 1;
  }
  return x.length - y.length;
}

function loadVersions(product) {
  const dir = join(CHANGELOG_DIR, product);
  const versions = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.mdx')).sort()) {
    const file = `changelog/${product}/${name}`;
    let data;
    try {
      data = parseFrontmatter(readFileSync(join(dir, name), 'utf8'), file);
    } catch (error) {
      fail(error.message);
      continue;
    }
    const missing = REQUIRED.filter((key) => !data[key]);
    if (missing.length) {
      fail(`${file}: missing frontmatter ${missing.join(', ')}`);
      continue;
    }
    if (!SEMVER.test(data.version)) fail(`${file}: version "${data.version}" is not semver`);
    if (data.title !== data.version) fail(`${file}: title must equal version`);
    if (`${data.version}.mdx` !== name) fail(`${file}: file name must be ${data.version}.mdx`);
    // The second test rejects dates that do not exist, such as 2026-02-30.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) ||
        new Date(`${data.date}T00:00:00Z`).toISOString().slice(0, 10) !== data.date) {
      fail(`${file}: date must be a real date in YYYY-MM-DD format`);
    }
    if (!CHANNELS.includes(data.channel)) fail(`${file}: channel must be one of ${CHANNELS.join(', ')}`);
    if (!/^https:\/\//.test(data.release_url)) fail(`${file}: release_url must be an https URL`);
    versions.push({ ...data, file });
  }
  return versions
    .filter((v) => SEMVER.test(v.version))
    .sort((a, b) => compareSemver(b.version, a.version));
}

const identifier = (version) => 'V' + version.replace(/[^0-9A-Za-z]/g, '_');
// Heading id of a version on its product page, e.g. 0.6.0-beta -> v0-6-0-beta.
const anchor = (version) => 'v' + version.toLowerCase().replace(/[^0-9a-z]+/g, '-');
const js = (value) => JSON.stringify(value);
// Frontmatter text placed in MDX: {, } and < would start an expression or a tag.
const mdxText = (text) => text.replace(/[{}<]/g, (c) => `&#${c.charCodeAt(0)};`);

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

// One <Update> per release date, newest first. Releases that share a date go in
// the same entry, so each date label (and the anchor Mintlify derives from it)
// appears once.
function groupByDate(versions) {
  const byDate = [...versions].sort(
    (a, b) => b.date.localeCompare(a.date) || compareSemver(b.version, a.version),
  );
  const groups = [];
  for (const v of byDate) {
    if (groups.length && groups[groups.length - 1].date === v.date) groups[groups.length - 1].versions.push(v);
    else groups.push({ date: v.date, versions: [v] });
  }
  return groups;
}

function renderRelease(v) {
  const channel = v.channel === 'Stable' ? 'Stable release' : `${v.channel} release`;
  return [
    `## ${v.version} — ${mdxText(v.summary)} {#${anchor(v.version)}}`,
    '',
    `${channel} · [View on GitHub](${v.release_url})`,
    '',
    // Mintlify renders paragraphs of an imported file as inline spans.
    `<div className="space-y-4 [&>span[data-as=p]]:block">`,
    `  <${identifier(v.version)} />`,
    '</div>',
  ].join('\n');
}

// One RSS item per <Update>. Mintlify takes the item from these props; without them
// it uses the date label as the title and the page's last commit as the date, and
// it does not include the imported release text.
function rssItem(meta, group) {
  const item = {
    title: `${meta.name} ${group.versions.map((v) => v.version).join(' and ')}`,
    description: group.versions.map((v) => `${v.version}: ${v.summary}`).join(' · '),
    date: group.date,
  };
  // Mintlify reads only plain identifier keys (title:), not quoted ones ("title":).
  return `{ ${Object.entries(item).map(([key, value]) => `${key}: ${js(value)}`).join(', ')} }`;
}

function renderPage(product, versions) {
  const meta = PRODUCTS[product];
  const imports = versions.map(
    (v) => `import ${identifier(v.version)} from '/changelog/${product}/${v.version}.mdx'`,
  );
  const entries = groupByDate(versions).map((group) =>
    [
      `<Update label=${js(formatDate(group.date))} rss={${rssItem(meta, group)}}>`,
      group.versions.map(renderRelease).join('\n\n'),
      '</Update>',
    ].join('\n'),
  );
  return [
    '---',
    `title: ${js(meta.title)}`,
    `description: ${js(meta.description)}`,
    `icon: ${meta.icon}`,
    'rss: true',
    '---',
    '',
    '{/* Generated by scripts/changelog/build-index.mjs. Do not edit by hand. */}',
    '',
    ...imports,
    '',
    entries.length ? entries.join('\n\n') : 'No releases yet.',
    '',
  ].join('\n');
}

const check = process.argv.includes('--check');
const products = readdirSync(CHANGELOG_DIR).filter((n) => statSync(join(CHANGELOG_DIR, n)).isDirectory());
for (const product of products) {
  if (!PRODUCTS[product]) {
    fail(`changelog/${product}/ is not a known product. Known: ${Object.keys(PRODUCTS).join(', ')}`);
  }
}
for (const product of Object.keys(PRODUCTS)) {
  const dir = join(CHANGELOG_DIR, product);
  if (!existsSync(dir)) continue;
  const versions = loadVersions(product);
  const page = join(CHANGELOG_DIR, `${product}.mdx`);
  const next = renderPage(product, versions);
  if (check) {
    if (!existsSync(page) || readFileSync(page, 'utf8') !== next) {
      fail(`changelog/${product}.mdx is out of date. Run: node scripts/changelog/build-index.mjs`);
    }
  } else if (!existsSync(page) || readFileSync(page, 'utf8') !== next) {
    writeFileSync(page, next);
    console.log(`wrote changelog/${product}.mdx (${versions.length} versions)`);
  }
}
