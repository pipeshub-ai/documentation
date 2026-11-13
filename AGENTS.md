# AGENTS.md

Public Mintlify source for docs.pipeshub.com, the documentation of the open-source PipesHub product. Pages are `.mdx`; site config and navigation live in `docs.json`. There is no `package.json` and no build step.

## Preview and check

The Mintlify CLI is not preinstalled. Install it with `npm i -g mint` (older docs call it `mintlify`; same commands), then from the repo root:

- `mint dev` previews at http://localhost:3000.
- `mint broken-links` checks internal links. Run it before you finish.
- If you only touched `docs.json`, also confirm it parses: `python3 -m json.tool docs.json > /dev/null`.

## Navigation

- A page that is not listed in `docs.json` → `navigation.groups` does not appear in the sidebar. Add every new page there, as its path without `.mdx` (for example `connectors/confluence/confluence`), in the group where its neighbours are.
- When you rename or move a page, update its `docs.json` entry, every link to it, and add an entry to `redirects` in `docs.json` so old URLs keep working.

## Writing a page

- Copy a neighbouring page of the same kind and keep its structure. Page-type folders: `connectors/<name>/`, `toolsets/<name>/`, `ai-models/{llm,embedding,image-generation,stt,tts}/`, `mcp/` (client setup and `tools.mdx`), `developer/` (API, PATs, OAuth), `deployment/` (plus `deployment/vendor/` for cloud targets).
- Frontmatter: `title` and `description` on every page (usually double-quoted). Connector, toolset and MCP-client pages also set `icon: "/logo/<name>.png"` (or `.svg`); general pages may use a Font Awesome name such as `icon: "plug"`.
- Connector and toolset pages open with the same `not-prose` header card (logo, title, status badges). Copy it from a sibling rather than writing a new one.
- Use Mintlify components already in use: `<Note>`, `<Info>`, `<Warning>`, `<Tip>`, `<Steps>`/`<Step>`, `<Tabs>`/`<Tab>`, `<AccordionGroup>`/`<Accordion>`, `<CardGroup>`/`<Card>`. There is no `snippets/` directory.

## Images and logos

- Screenshots go under `images/<section>/...`. Put a new screenshot in the folder that page's existing images already use (check the `src` values on the page, or on a sibling page if it has none). Folder names do not reliably follow the page path: the Drive connector page (`connectors/google-workspace/drive/drive`), for example, uses `images/connectors/googleWorkspace/`.
- Product and vendor logos go flat in `logo/` (e.g. `logo/confluence.png`).
- Reference both with root-absolute paths: `![Alt](/images/...)` or `src="/logo/..."`.

### Screenshot rules (apply to every page, no exceptions)

- **Real browser view.** Capture the real viewport (1440 wide, app sidebar and header visible, dimmed backdrop behind a dialog or drawer, drawer docked as in the product), at 2x scale, then downscale to a 1440-wide PNG. Do not cut a dialog or drawer out of the page, and do not leave dead space in a drawer taller than its content. Trim only empty outer margins.
- **Complete.** The shot shows every field, tab and button the step refers to. Never crop away content.
- **Both themes.** Every product screenshot exists in light and dark: `name.png` (light) and `name-dark.png` (dark), same crop and data. Show both inside the page's `<Frame>` and let the site theme pick one:

  ```mdx
  <Frame>
    <img className="block dark:hidden" src="/images/<path>/name.png" alt="Describe the screen in 10+ characters" />
    <img className="hidden dark:block" src="/images/<path>/name-dark.png" alt="Describe the screen in 10+ characters" />
  </Frame>
  ```

  Third-party vendor console screenshots, logos and diagrams are single images.
- **Healthy state only.** No error banners, failure toasts, red validation states or "could not load" text, unless the page documents that exact error.
- **Real data.** Neutral demo values (no real people, emails, tokens or internal names). Lists show at least 5-6 items. No secrets, even masked-looking ones you are unsure about.
- **Current product.** Capture from a stack built from current upstream `main`, and check the page text against the labels you see.

## Links

- Internal links are root-absolute without the extension: `[MCP overview](/mcp/overview)`, `/connectors/confluence/confluence#section`. Do not use `./` or `../` relative links.
- External links are full `https://` URLs.

## Agent-facing pages

`llms.txt` is hand-written and overrides the one Mintlify would generate. It, `for-agents.mdx`, `for-agents-local-demo.mdx`, `for-agents-bootstrap.mdx`, and `docs.json` → `markdown.instructions` (prepended to every page's Markdown export) tell coding agents how to install PipesHub and connect over MCP. Update them when any of these change: install command or Docker defaults, ports or the instance URL, the `/mcp` endpoint, MCP tool list, PAT or OAuth flow, first-run steps, or SDK package names. `llms.txt` links use `https://docs.pipeshub.com/<path>.md`.

When you add or rename an MCP tool, update `mcp/tools.mdx` and the tool count in `llms.txt`.

## Changelog

User-facing release notes go in `changelog/platform/<version>.mdx`, listed under the changelog group in `docs.json` (and in `llms.txt`).

## Public-repo wording

This repo is public. Document only features that ship in the open-source PipesHub product. Do not mention internal tickets, customer names, unreleased plans or private repositories in pages, commit messages or branch names.
