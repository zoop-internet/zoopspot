# Zoop Web Management Console & Landing

The official web frontend for the **Zoop** platform.

- **Production URL**: [https://zoop-9jc.pages.dev](https://zoop-9jc.pages.dev)
- **Tech Stack**: React 18, TypeScript, Vite, WebCrypto Ed25519 client identity.
- **Rendering**: Static site generation with 24 prerendered SEO routes (`node scripts/prerender.mjs`).
- **Continuous Deployment**: Automatically built and deployed to Cloudflare Pages on every push to `main` touching `web/**` via GitHub Actions (`.github/workflows/deploy-pages.yml`).

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```
