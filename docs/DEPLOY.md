# Vercel, Expo, EAS and Android

BLACKCORE treats deploy as a verification workflow, not one magic command.

## Vercel

Before a production deploy:
1. `project_detect`
2. inspect package scripts/config/env variable names;
3. dependency install if needed;
4. lint/typecheck/tests;
5. production build;
6. `vercel` preview if useful;
7. explicit production deploy.

The `vercel` structured tool uses the installed Vercel CLI so authentication remains in the CLI's normal credential store rather than the LLM prompt.

## Expo

For Expo:
1. inspect `package.json`, app config and `eas.json`;
2. run Expo Doctor;
3. resolve SDK/dependency mismatches;
4. run local export/prebuild only when appropriate;
5. use EAS for remote build/update/submit.

## Android Gradle

When a Gradle wrapper exists, `gradle` runs the project wrapper. Typical verification starts with debug builds or tests. Release signing is intentionally not automated from secret values inside prompts.

## Supabase

BLACKCORE recognizes a global CLI or `node_modules/.bin/supabase`. The project-local installation is preferred because it pins one version for the team.

Recommended local workflow:

1. initialize or inspect `supabase/config.toml`;
2. start the container stack;
3. apply migrations with a local reset;
4. run database lint and pgTAP;
5. generate client types;
6. serve/test Functions through a managed background process when needed.

Before a remote change, link the exact project, run linked lint, review `db push --dry-run`, then request confirmation for the real push. Function deployment, secret changes and database resets are also confirmed. Secret values are never accepted as structured tool arguments; `secrets_set` receives only a workspace-authorized env-file path.

`examples/blackcore-studio` is the end-to-end fixture: offline PWA, email/password Auth, `workspace_items`, forced RLS per `auth.uid()`, migration, trigger, indexes and an authenticated Edge Function. The browser client uses only the publishable/anon key and keeps its access token in session storage.

## Credentials

Vercel/Expo/EAS credentials are not bundled in BLACKCORE. Use the official CLI authentication and local environment/credential stores.
