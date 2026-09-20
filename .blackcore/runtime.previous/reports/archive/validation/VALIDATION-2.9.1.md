# BLACKCORE Native 2.9.1 — natural flow validation

- A local game-animation request exposes local read/write/browser/verification tools and excludes Vercel, Netlify, Supabase, Resend, Expo/EAS, GitHub remote actions and deployment preflight.
- A request that explicitly asks for Vercel deployment exposes the remote-service tool set.
- A request that says “without Vercel or Netlify” remains local even though it names the services.
- The executor rejects a remote tool call hallucinated during a local request before the tool executes.
- The visible slash palette contains only `/models`, `/plan`, `/act` and `/quit`.
