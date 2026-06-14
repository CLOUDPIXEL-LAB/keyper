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
