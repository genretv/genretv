# Publishing the GenreTV Site

GenreTV publishes one generated GitHub Pages site:

- application: `https://genretv.github.io/`
- end-user documentation: `https://genretv.github.io/docs/`

Source and generated output live in separate repositories in the `genretv` GitHub organization:

| Repository                  | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `genretv/genretv`           | Authoritative source, tests, workflow, and Git history |
| `genretv/genretv.github.io` | Generated Pages artifact only                          |

The `Site` workflow in `genretv/genretv` builds both surfaces into `apps/docs/dist/` and force-pushes
an orphan `main` branch to `genretv/genretv.github.io`. The first successful deployment intentionally
replaces the target repository's existing `main` branch contents and ancestry with a new root commit.
The target repository does not need to be empty, and its current `main` history should not be deleted
manually first.

`force_orphan` replaces only the published branch. It does not delete separate legacy branches or tags,
and GitHub may retain unreachable Git objects internally for some time. If the old repository has
additional branches or tags that should no longer be visible, remove those refs separately; they are
outside the deployment workflow's ownership.

## Before GitHub Setup

Complete the managed-backend setup in [GenreTV on Supabase and Electric Cloud](./genretv-on-cloud.md).
Before publishing the frontend, confirm all of the following:

1. `bun run cloud:dev` works against the GenreTV Supabase and Electric Cloud projects.
2. `bun run cloud:migrate`, `bun run cloud:secrets`, and `bun run cloud:functions` have completed.
3. `bun run cloud:seed` has been run once if the cloud database does not yet contain canonical data.
4. `GENRETV_ALLOWED_ORIGINS` in `genretv.cloud.env` contains these exact origins:

   ```text
   https://genretv.github.io,http://localhost:5660,http://127.0.0.1:5660
   ```

5. `bun run cloud:secrets` has been rerun after setting that CORS allow-list.

Do not put `GENRETV_SUPABASE_ACCESS_TOKEN`, database URLs, the Electric shape URL, or any secret key
in GitHub repository variables. The static site needs only public browser configuration.

## 1. Configure Supabase Auth URLs

In the **GenreTV** Supabase project, open **Authentication > URL Configuration** and set:

| Setting      | Value                        |
| ------------ | ---------------------------- |
| Site URL     | `https://genretv.github.io/` |
| Redirect URL | `https://genretv.github.io/` |

Keep the localhost redirect entries used during development. The production build uses hash routing,
so password recovery resolves under `https://genretv.github.io/#/reset-password` without requiring a
physical `/reset-password` file on Pages. The URL fragment is client-side, so the exact allowed
redirect remains `https://genretv.github.io/`.

## 2. Prepare the Pages Repository

Open `https://github.com/genretv/genretv.github.io`.

1. Confirm the repository is public. A public organization Pages site requires the specially named
   `genretv.github.io` repository.
2. Open **Settings > General** and confirm the default branch is `main`.
3. Open **Settings > Rules > Rulesets** and **Settings > Branches**. The generated `main` branch must
   permit the deploy key to force-push. Remove rules that prohibit force pushes to this generated
   branch, or explicitly bypass them for the deploy key if the organization policy supports that.
4. Do not add source files, workflows, or hand-edited content to this repository. Every deployment
   replaces the complete branch.
5. Do **not** delete the existing repository or rewrite/delete its `main` history before deployment.
   The orphan deployment performs that branch replacement atomically.
6. Inspect **Branches** and **Tags**. Delete obsolete non-`main` branches or tags only when they should
   no longer preserve visible references to the legacy site.

If `main` does not exist in a newly created repository, complete the first deployment before selecting
the Pages branch in step 6.

## 3. Create the Pages Deploy Key

From the `genretv/genretv` workspace root, generate a dedicated key pair:

```sh
mkdir -p tmp/pages-deploy
ssh-keygen -t ed25519 \
  -C "genretv site deployment" \
  -f tmp/pages-deploy/genretv-pages \
  -N ""
```

This creates:

| File                                 | Destination                      |
| ------------------------------------ | -------------------------------- |
| `tmp/pages-deploy/genretv-pages.pub` | Target repository deploy key     |
| `tmp/pages-deploy/genretv-pages`     | Source repository Actions secret |

The private key has no passphrase because GitHub Actions must use it non-interactively. It is dedicated
to this single generated repository and must not be reused elsewhere.

### Add the public key to the target repository

In `genretv/genretv.github.io`:

1. Open **Settings > Deploy keys**.
2. Select **Add deploy key**.
3. Use the title `GenreTV site deployment`.
4. Paste the complete contents of `tmp/pages-deploy/genretv-pages.pub`.
5. Enable **Allow write access**.
6. Select **Add key**.

### Add the private key to the source repository

In `genretv/genretv`:

1. Open **Settings > Secrets and variables > Actions > Secrets**.
2. Select **New repository secret**.
3. Name it exactly `GENRETV_PAGES_DEPLOY_KEY`.
4. Paste the complete private key, including the `BEGIN OPENSSH PRIVATE KEY` and
   `END OPENSSH PRIVATE KEY` lines, from `tmp/pages-deploy/genretv-pages`.
5. Save the secret.

After both GitHub settings are saved, remove the local key files:

```sh
rm -rf tmp/pages-deploy
```

The deploy key is intentionally scoped only to `genretv/genretv.github.io`. Do not replace it with a
personal access token that can write to other organization repositories.

## 4. Add Public Build Variables

In `genretv/genretv`, open **Settings > Secrets and variables > Actions > Variables** and create these
repository variables:

| Variable                   | Required    | Value                                                              |
| -------------------------- | ----------- | ------------------------------------------------------------------ |
| `GENRETV_SUPABASE_URL`     | Yes         | GenreTV project URL, for example `https://PROJECT_REF.supabase.co` |
| `GENRETV_PUBLISHABLE_KEY`  | Yes         | GenreTV project's `sb_publishable_...` key                         |
| `GENRETV_FUNCTIONS_REGION` | Recommended | GenreTV database region, currently `us-west-1`                     |

These values are public by design and are compiled into browser JavaScript. Add them as **Variables**,
not Secrets. The workflow deliberately fails before building when either required variable is empty.

`GENRETV_SUPABASE_URL` must contain the same project
ref as `GENRETV_SUPABASE_PROJECT_REF` in the ignored `genretv.cloud.env` file.

## 5. Check GitHub Actions Policy

In `genretv/genretv`, open **Settings > Actions > General**.

1. Ensure Actions are enabled.
2. If the organization restricts third-party actions, allow these actions used by `site.yml`:
   - `actions/checkout@v7`
   - `oven-sh/setup-bun@v2`
   - `peaceiris/actions-gh-pages@v4`
3. No write permission is required from `GITHUB_TOKEN`; the job declares `contents: read` and writes to
   the target repository only through `GENRETV_PAGES_DEPLOY_KEY`.

## 6. Configure GitHub Pages

In `genretv/genretv.github.io`, open **Settings > Pages**.

1. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
2. Select branch `main` and folder `/ (root)`.
3. Save.
4. Do not select **GitHub Actions** as the Pages source. The build workflow runs in the source
   repository and pushes an already-built artifact into this repository.
5. Do not configure a custom domain unless GenreTV is intentionally moving away from
   `https://genretv.github.io`.

For a new empty target repository, run the first deployment, return to this page after `main` appears,
and then select `main` and `/ (root)`.

## 7. Verify the Site Build Locally

From the source repository:

To build the exact production artifact with the cloud browser configuration from
`genretv.cloud.env` and serve it locally through Vite preview:

```sh
bun run cloud:preview
```

Open `http://localhost:5660`. The command runs `build:site` before previewing, so it uses the same
hash routing and combined application/documentation output as the GitHub Actions deployment.

The combined artifact is `apps/docs/dist/`:

```text
apps/docs/dist/
├── index.html          # React application
├── assets/             # React, PGlite, worker, and export assets
└── docs/
    └── index.html      # Astro/Starlight documentation
```

`build:site` enables hash routing for the application. Production application routes therefore look
like `https://genretv.github.io/#/login`; documentation routes remain normal paths under `/docs/`.

To refresh the documentation screenshots against the isolated E2E infrastructure, run:

```sh
bun run docs:screenshots
```

This uses only the isolated E2E stack and does not modify the normal local stack.

## 8. Publish the First Site

The workflow triggers only from the source repository's `main` branch. This checkout currently uses
`develop`, so merge `develop` into `main` through the normal review process and push `main` to
`upstream` (`git@github.com:genretv/genretv.git`). A push containing relevant app, docs, package, or
workflow changes triggers `.github/workflows/site.yml` automatically.

Alternatively, after the workflow exists on `main`:

1. Open `genretv/genretv` on GitHub.
2. Open **Actions > Site**.
3. Select **Run workflow**.
4. Choose branch `main`.
5. Select **Run workflow**.

The workflow performs:

1. checkout of `genretv/genretv`;
2. frozen Bun dependency installation;
3. validation of required public build variables;
4. one combined application and documentation build; and
5. an orphan force-push of `apps/docs/dist/` to `genretv/genretv.github.io@main`.

The first successful force-orphan publish replaces the target repository's `main` branch with a new
root commit, so the previous commits are no longer reachable from `main`. It does not remove other
branches or tags, and it is not a guarantee of immediate low-level object erasure from GitHub's
storage. The branch replacement is intentional; the source repository remains the authoritative
history.

## 9. Verify Production

After the `Site` workflow and the target repository's Pages deployment both finish:

1. Confirm the newest commit in `genretv/genretv.github.io` has a message like
   `deploy site from genretv/genretv@SOURCE_SHA`.
2. Open `https://genretv.github.io/` in a private browser window.
3. Confirm the canonical schedule loads without authentication.
4. Open `https://genretv.github.io/docs/` and navigate between several documentation pages.
5. Sign in, sign out, and request a password-recovery email.
6. Confirm the recovery link returns to `https://genretv.github.io/#/reset-password`.
7. In browser developer tools, confirm requests use the GenreTV Supabase project and the
   `genretv-sync` and `genretv-write` functions, not localhost or the pgxsinkit demo.

Useful HTTP checks:

```sh
curl -I https://genretv.github.io/
curl -I https://genretv.github.io/docs/
```

Both should return a successful response after Pages finishes publishing.

## Subsequent Deployments

Relevant pushes to `main` deploy automatically. A maintainer can also dispatch the `Site` workflow
manually. Every deployment replaces the generated target branch atomically.

Never add a second workflow that publishes only the application or only the documentation. Because
the target uses orphan replacement, a partial deployment would delete the other half of the site.

## Troubleshooting

### Workflow says a required variable is missing

Add `GENRETV_SUPABASE_URL` and `GENRETV_PUBLISHABLE_KEY` under the source repository's **Actions
Variables**, not its Secrets or an Actions Environment. Repository variables are read as `vars.NAME`.

### `Permission denied (publickey)` or push access is denied

Check that the target repository has the matching public deploy key, **Allow write access** is enabled,
and the source repository secret contains the complete private key.

### Force-push is rejected

A branch protection rule or organization ruleset is protecting `genretv.github.io@main`. This branch
contains generated output and must permit the deployment key's orphan force-push.

### The workflow succeeds but Pages shows the old site or a 404

In the target repository's **Settings > Pages**, confirm **Deploy from a branch**, `main`, and `/ (root)`.
Then check the target repository's **Actions** tab for GitHub's own Pages publication job.

### The site loads but tries to contact localhost

The public build variables were absent or were added under the wrong GitHub scope. Confirm the values
under `genretv/genretv` repository **Actions Variables**, rerun `Site`, and inspect the preflight step.

### Authentication redirects are rejected

Confirm the GenreTV Supabase project's Site URL and Redirect URLs include the exact
`https://genretv.github.io` production origin. Do not configure these values in the pgxsinkit demo
project.

### Browser requests fail with CORS errors

Add `https://genretv.github.io` to `GENRETV_ALLOWED_ORIGINS` in the ignored cloud env and rerun:

```sh
bun run cloud:secrets
```

The CORS value is an origin only; it must not include `/docs` or any other path.
