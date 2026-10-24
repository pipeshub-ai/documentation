# Changelog file spec

Every release of a product has one file: `changelog/{product}/{version}.mdx`.
`{version}` has no `v` prefix. Example: `changelog/platform/0.9.1.mdx`.

Products: `platform`. (SDKs and MCP are added later.)

## Frontmatter

All fields are required. Values are double-quoted strings.

| Field | Format | Example |
| --- | --- | --- |
| `title` | Same as `version` | `"0.9.1"` |
| `version` | Semver, no `v`. Must match the file name. | `"0.9.1"`, `"0.6.0-beta"` |
| `date` | `YYYY-MM-DD` | `"2026-09-28"` |
| `channel` | `Stable`, `Beta`, `Alpha` or `Pre-release` | `"Stable"` |
| `release_url` | HTTPS URL of the GitHub release | `"https://github.com/.../releases/tag/v0.9.1"` |
| `description` | One line. The headline of the release, shown under the page title. | `"OAuth and PKCE hardening, ..."` |
| `summary` | Two sentences, no links: what changed for users. Shown on the changelog page. | `"A same-day security and reliability patch on 0.9.0: ..."` |

## Body

- Start with the line `Released {Month} {D}, {YYYY} · {channel} · [View on GitHub]({release_url})`, then the narrative paragraph.
- Use `##` for sections and `###` for items inside a section. The page title is the version.
- Each item comes from a commit, PR or API diff. Do not invent items.
- Link to a PR as `[#123](https://github.com/pipeshub-ai/pipeshub-ai/pull/123)`.
- Link to another version as `[0.9.0](/changelog/platform/0.9.0)`.
- A heading you link to within the same file keeps the id GitHub gives it: `## Upgrade notes {#upgrade-notes}`.
- Write MDX: escape `{`, `}` and `<` outside code spans and code blocks.
- Do not use imports, exports or custom components.

## Page

Each version is its own page. `changelog/{product}.mdx` is the summary page: one Mintlify `<Update>` entry per version, newest date first, labelled with the version, showing its date, headline and summary, linking to the version's page.

In `docs.json` the product is a sidebar group whose root is the summary page, with every version under it, newest first, so each version page stays in search. Previous/next at the foot of a version page follows that order. `changelog-sidebar.js` and `style.css` show the versions 5 at a time behind "Show more" / "Show less".

## What the job may change

A release job adds or replaces exactly one file: `changelog/{product}/{version}.mdx`.
It changes no other file. `changelog/{product}.mdx` and the sidebar group in `docs.json` are generated:

```bash
node scripts/changelog/build-index.mjs          # write
node scripts/changelog/build-index.mjs --check  # verify
```
