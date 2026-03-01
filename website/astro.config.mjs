// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://keyper-docs.pages.dev',
	integrations: [
		starlight({
			title: 'Keyper Docs',
			description: 'Official documentation for Keyper self-hosted credential management.',
			logo: {
				src: './src/assets/logo.png',
				alt: 'Keyper',
			},
			favicon: '/favicon.png',
			customCss: ['./src/styles/keyper-theme.css'],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/pinkpixel-dev/keyper' },
				{ icon: 'external', label: 'Web App', href: 'https://keyper.pinkpixel.dev' },
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Overview', slug: 'getting-started/overview' },
						{ label: 'Screenshots', slug: 'getting-started/screenshots' },
						{ label: 'Install and Run', slug: 'getting-started/install-and-run' },
					],
				},
				{
					label: 'Architecture',
					items: [
						{ label: 'System Overview', slug: 'architecture/system-overview' },
						{ label: 'Runtime Flow', slug: 'architecture/runtime-flow' },
					],
				},
				{
					label: 'Security',
					items: [
						{ label: 'Security Model', slug: 'security/security-model' },
						{ label: 'Cryptography', slug: 'security/cryptography' },
					],
				},
				{
					label: 'Data',
					items: [
						{ label: 'Database Schema', slug: 'data/database-schema' },
						{ label: 'Credential Lifecycle', slug: 'data/credential-lifecycle' },
					],
				},
				{
					label: 'Operations',
					items: [
						{ label: 'Cloudflare Deployment', slug: 'operations/cloudflare-deployment' },
						{ label: 'Self-Hosting', slug: 'operations/self-hosting' },
						{ label: 'Troubleshooting', slug: 'operations/troubleshooting' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Configuration', slug: 'reference/configuration' },
						{ label: 'Testing and Quality', slug: 'reference/testing-and-quality' },
						{ label: 'Source Map', slug: 'reference/source-map' },
						{ label: 'Known Gaps', slug: 'reference/known-gaps' },
					],
				},
			],
		}),
	],
});
