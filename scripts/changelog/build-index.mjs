#!/usr/bin/env node
// Builds the product changelog summary pages and sidebar from the version files.
//
//   changelog/{product}/{version}.mdx   <- input, one page per release (frontmatter + body);
//                                          its Newer / Older navigation lines are written here
//   changelog/{product}.mdx             <- output, generated: one summary entry per release
//   docs.json                           <- output: the product's sidebar group, newest release first
//
// Usage:
//   node scripts/changelog/build-index.mjs          write the outputs
//   node scripts/changelog/build-index.mjs --check  exit 1 if an output is missing or stale
//
// No dependencies. The format of a version file is in scripts/changelog/SPEC.md.

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHANGELOG_DIR = join(ROOT, 'changelog');
const DOCS_JSON = join(ROOT, 'docs.json');

// One entry for each product that has a changelog. A directory under changelog/
// that is not listed here is an error, so a typo in a product name is caught.
const PRODUCTS = {
  platform: {
    name: 'PipesHub',
    title: 'Platform Changelog',
    description: 'Release notes for the PipesHub Workplace AI platform',
    icon: 'bolt',
    intro:
      'What changed in each PipesHub release, newest first. Every entry below sums up a release in a few lines; ' +
      'open it for the highlights, upgrade notes and a link to the full GitHub release. **Stable** releases are ' +
      'recommended for production; **Beta**, **Alpha** and **Pre-release** builds preview the next stable release.',
  },
};

const CHANNELS = ['Stable', 'Beta', 'Alpha', 'Pre-release'];
const REQUIRED = ['title', 'version', 'date', 'channel', 'release_url', 'description', 'summary'];
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
  // Newest release date first; releases on the same date by version.
  return versions
    .filter((v) => SEMVER.test(v.version))
    .sort((a, b) => b.date.localeCompare(a.date) || compareSemver(b.version, a.version));
}

const js = (value) => JSON.stringify(value);
// Frontmatter text placed in MDX: {, } and < would start an expression or a tag.
const mdxText = (text) => text.replace(/[{}<]/g, (c) => `&#${c.charCodeAt(0)};`);
const pagePath = (product, version) => `changelog/${product}/${version}`;

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

// The RSS item of an <Update>. Mintlify publishes changelog/{product}/rss.xml from the page's
// <Update> entries; without these props it titles each item with its label and dates it
// from the page's last commit.
function rssItem(meta, v) {
  const item = { title: `${meta.name} ${v.version}`, description: v.summary, date: v.date };
  // Mintlify reads only plain identifier keys (title:), not quoted ones ("title":).
  return `{ ${Object.entries(item).map(([key, value]) => `${key}: ${js(value)}`).join(', ')} }`;
}

// The summary page: one <Update> per release, linking to the release's own page.
function renderPage(product, versions) {
  const meta = PRODUCTS[product];
  const entries = versions.map((v) => {
    const when = formatDate(v.date) + (v.channel === 'Stable' ? '' : ` · ${v.channel}`);
    return [
      `<Update label=${js(v.version)} description=${js(when)} rss={${rssItem(meta, v)}}>`,
      `**[${mdxText(v.description)}](/${pagePath(product, v.version)})**`,
      '',
      mdxText(v.summary),
      '</Update>',
    ].join('\n');
  });
  return [
    '---',
    `title: ${js(meta.title)}`,
    `description: ${js(meta.description)}`,
    `icon: ${meta.icon}`,
    '---',
    '',
    '{/* Generated by scripts/changelog/build-index.mjs. Do not edit by hand. */}',
    '',
    meta.intro,
    '',
    entries.length ? entries.join('\n\n') : 'No releases yet.',
    '',
  ].join('\n');
}

// Mintlify's own previous/next footer says "Next" for the older release, so each release page
// also gets explicit "Newer" / "Older" links, under its Released line and at its end.
const NAV_MARK = '{/* Release navigation, generated by scripts/changelog/build-index.mjs. */}';
// What releaseNav writes: Newer, All releases and Older links joined by " · ", in that order.
const NAV_LINE = /^(\[← Newer: [^\]]+\]\([^)]+\) · )?\[All releases\]\([^)]+\)( · \[Older: [^\]]+ →\]\([^)]+\))?$/;

function releaseNav(product, versions, i) {
  const link = (label, v) => `[${label}](/${pagePath(product, v.version)})`;
  return [
    i > 0 && link(`← Newer: ${versions[i - 1].version}`, versions[i - 1]),
    `[All releases](/changelog/${product})`,
    i < versions.length - 1 && link(`Older: ${versions[i + 1].version} →`, versions[i + 1]),
  ].filter(Boolean).join(' · ');
}

// The release page with its navigation lines in place: an existing pair (marker + links) is
// replaced; otherwise one goes after the Released line and one at the end of the page.
function withNav(text, file, nav) {
  const lines = text.replace(/\n+$/, '').split('\n');
  const marks = lines.flatMap((line, i) => (line === NAV_MARK ? [i] : []));
  if (marks.length === 0) {
    const released = lines.findIndex((line) => line.startsWith('Released '));
    if (released < 0) {
      fail(`${file}: no "Released ..." line to put the release navigation under`);
      return text;
    }
    lines.splice(released + 1, 0, '', NAV_MARK, nav);
    lines.push('', NAV_MARK, nav);
  } else if (marks.length === 2) {
    // Replace only a line this script wrote; anything else after a marker is release text.
    const stale = marks.filter((i) => !NAV_LINE.test(lines[i + 1] ?? ''));
    if (stale.length) {
      fail(`${file}:${stale[0] + 2}: a release navigation marker must be followed by its navigation line`);
      return text;
    }
    for (const i of marks) lines[i + 1] = nav;
  } else {
    fail(`${file}: expected 0 or 2 release navigation markers, found ${marks.length}`);
    return text;
  }
  return lines.join('\n') + '\n';
}

// The product's sidebar entry: the summary page with every release under it, newest first.
// Every release stays in navigation, so Mintlify keeps it in search and previous/next.
// Replaces the entry in place, whether it is still the plain page or an earlier group.
function updateNav(nav, product, versions) {
  const root = `changelog/${product}`;
  const group = {
    group: PRODUCTS[product].title,
    icon: PRODUCTS[product].icon,
    root,
    expanded: false,
    // changelog-sidebar.js shows these in batches behind a "Show more" row.
    pages: versions.map((v) => pagePath(product, v.version)),
  };
  let found = false;
  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        if (item === root || (item && item.root === root)) {
          node[i] = group;
          found = true;
        } else visit(item);
      });
    } else if (node && typeof node === 'object') Object.values(node).forEach(visit);
  };
  visit(nav);
  if (!found) fail(`docs.json: no navigation entry for ${root}`);
}

const check = process.argv.includes('--check');
const products = readdirSync(CHANGELOG_DIR).filter((n) => statSync(join(CHANGELOG_DIR, n)).isDirectory());
for (const product of products) {
  if (!PRODUCTS[product]) {
    fail(`changelog/${product}/ is not a known product. Known: ${Object.keys(PRODUCTS).join(', ')}`);
  }
}
const outputs = new Map();
const docs = JSON.parse(readFileSync(DOCS_JSON, 'utf8'));
for (const product of Object.keys(PRODUCTS)) {
  const dir = join(CHANGELOG_DIR, product);
  if (!existsSync(dir)) continue;
  const versions = loadVersions(product);
  outputs.set(join(CHANGELOG_DIR, `${product}.mdx`), renderPage(product, versions));
  versions.forEach((v, i) => {
    const file = join(ROOT, `${v.file}`);
    outputs.set(file, withNav(readFileSync(file, 'utf8'), v.file, releaseNav(product, versions, i)));
  });
  updateNav(docs.navigation, product, versions);
}
outputs.set(DOCS_JSON, JSON.stringify(docs, null, 2) + '\n');

for (const [file, next] of outputs) {
  const name = file.slice(ROOT.length + 1);
  const current = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (current === next) continue;
  if (check) fail(`${name} is out of date. Run: node scripts/changelog/build-index.mjs`);
  else {
    writeFileSync(file, next);
    console.log(`wrote ${name}`);
  }
}
