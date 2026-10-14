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
| `summary` | One line. The headline of the release. | `"OAuth and PKCE hardening, ..."` |

## Body

- Start with the narrative paragraph. Do not repeat the title or the date. The page shows them.
- Use `##` for sections and `###` for items inside a section.
- Each item comes from a commit, PR or API diff. Do not invent items.
- Link to a PR as `[#123](https://github.com/pipeshub-ai/pipeshub-ai/pull/123)`.
- Link to another version as `[0.9.0](/changelog/platform?version=0.9.0)`.
- Write MDX: escape `{`, `}` and `<` outside code spans and code blocks.
- Do not use imports, exports or custom components.

## What the job may change

A release job adds or replaces exactly one file: `changelog/{product}/{version}.mdx`.
It changes no other file. `changelog/{product}.mdx` is generated:

```bash
node scripts/changelog/build-index.mjs          # write
node scripts/changelog/build-index.mjs --check  # verify
```
