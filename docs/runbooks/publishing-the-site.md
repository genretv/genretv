# Publishing the GenreTV Site

GenreTV publishes the application and end-user documentation as one GitHub Pages artifact. The application is served at `https://genretv.github.io/`; the documentation is served at `https://genretv.github.io/docs/`.

## Repository Setup

1. Keep source code and workflow history in `genretv/genretv`.
2. Configure GitHub Pages for the `main` branch of `genretv/genretv.github.io`.
3. Create a dedicated SSH deploy-key pair for Pages publishing.
4. Add the public key to `genretv/genretv.github.io` as a write-enabled deploy key.
5. Add the private key to `genretv/genretv` as the Actions secret `GENRETV_PAGES_DEPLOY_KEY`.
6. Add these public Actions variables to `genretv/genretv`:
   - `GENRETV_SUPABASE_URL`
   - `GENRETV_PUBLISHABLE_KEY`
   - `GENRETV_FUNCTIONS_REGION` when the deployment needs an explicit Edge Functions region

The deploy key should be scoped only to the Pages repository. Do not use a personal access token with broader account or organization access.

## Verify Locally

Run:

```sh
bun run build:site
```

The output is `apps/docs/dist/`:

- `index.html` and Vite assets belong to the hash-routed application.
- `docs/index.html` and its nested assets belong to Astro/Starlight.

To refresh the four orientation screenshots against the isolated E2E infrastructure, run:

```sh
bun run docs:screenshots
```

This command starts the E2E stack and a dedicated Vite server, captures the schedule, management, publishing, and maintainer-review screens, then tears the E2E stack down. It does not use or modify the normal local stack.

## Deploy

Merging a relevant change to `main` triggers `.github/workflows/site.yml`. A maintainer can also use the workflow's manual dispatch action. The workflow installs the frozen lockfile, builds the complete site, and publishes `apps/docs/dist/` to the external repository's `main` branch.

The deployment uses orphan history intentionally. Every successful publish replaces the generated branch and removes the previous deployment history, including the history and contents that existed before GenreTV adopted this workflow. The authoritative history remains in `genretv/genretv`; do not make source edits directly in `genretv/genretv.github.io`.

Because orphan publishing replaces the complete branch, never add a second workflow that deploys only the app or only the documentation. It would erase the other half of the site.
