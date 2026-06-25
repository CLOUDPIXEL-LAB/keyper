# MEMORY.md

## 2026-06-14: PostHog Docs Site Analytics Setup

### What was decided
- Set up PostHog tracking on the Astro Starlight documentation site using a custom component override (`src/components/Head.astro`).
- Pass build-time environment variables (`VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST`) from the Astro frontmatter (Node context) to the bundled browser script using data attributes on a hidden `#posthog-config` element.
- Implement event listeners inside the bundled script to capture installer downloads (EXE, AppImage, DEB), code block clipboard copies, and Pagefind search input queries (debounced).

### Why
- In Astro, client-side script tags are bundled by Vite and only have access to `PUBLIC_` prefixed variables (non-prefixed variables evaluate to `undefined` for safety). Since the user set up `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST` in Cloudflare and local environment variables, the standard client-side `import.meta.env` check evaluated to `undefined` and was tree-shaken by the compiler.
- Passing the variables through the frontmatter allows reading `VITE_` prefixed variables at build time and injecting them dynamically into the HTML output.
- Intercepting events globally via standard event delegation avoids having to write custom HTML inside MDX files.

### What was rejected and why
- **Inline script snippet in `astro.config.mjs`**: Rejected because it clutters the configuration and bypasses Vite's native bundler.
- **Renaming env variables to `PUBLIC_`**: Rejected because the user already set up their Cloudflare Pages environment variables, and adapting the codebase to existing variables is cleaner and more seamless.
- **Injecting manual React click handlers**: Rejected because Astro Starlight pages are built as static HTML and do not hydrate React context for basic content blocks.

## 2026-06-24: Website Dependency Security Resolution (esbuild)

### What was decided
- Use npm dependency `overrides` in the documentation website's `package.json` to lock `esbuild` to version `0.28.1`.

### Why
- The `esbuild` development server had a path traversal vulnerability (GHSA-g7r4-m6w7-qqqr) on Windows affecting versions `0.27.3 - 0.28.0`.
- Running `npm audit fix --force` proposed upgrading Astro to `v7.0.2`, which is a major version bump and a breaking change for the website.
- Overriding `esbuild` to `0.28.1` directly resolves the security vulnerability while preserving the stability of the Astro `v6.x` documentation site without config/routing breaking changes.

### What was rejected and why
- **Upgrading Astro to v7.0.2**: Rejected due to high risk of build breakage and major version upgrade overhead.

## 2026-06-24: Grid/List View Toggle Implementation

### What was decided
- Implement a view mode toggle ('grid' | 'list') for the main credentials display on the self-hosted dashboard.
- Persist user preference in `localStorage` under `keyper-view-mode`.
- Design a compact list item component inside `CredentialsGrid.tsx` using flexbox and responsive utilities (hiding tags on smaller screens, using badges, showing actions on hover).

### Why
- Card views are visually rich but consume significant vertical space, making it harder to scan a long list of credentials.
- List views offer a structured, data-dense alternative that allows users to quickly locate and copy credentials.
- Persisting state ensures a consistent preference across browser sessions.

### What was rejected and why
- **Traditional HTML tables (`<table>`)**: Rejected because table rendering on mobile requires heavy responsive restructuring (e.g. converting `display: table` to `display: block`). Flexbox layouts are more natively fluid and responsive.
