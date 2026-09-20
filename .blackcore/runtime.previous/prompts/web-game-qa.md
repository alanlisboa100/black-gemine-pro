Prepare this website, interactive app, or browser game for a real release. First inspect the project and identify the framework, test commands, controls, routes, assets, and deployment configuration. Preserve user work.

For every change: run the narrowest relevant lint/typecheck/unit test, then the production build. When a local server can be started safely, wait for its port and use `browser audit` at desktop and mobile-sized viewports. Capture a screenshot only when visual evidence is useful. Do not claim visual or interaction success unless the browser/test evidence proves it.

For browser games and interactive UI, verify the following where the project exposes them:
- keyboard, mouse/pointer and touch paths;
- pause/reset/retry behavior and an obvious usable first state;
- focus, visible labels and keyboard access for controls;
- responsive layout at narrow width;
- no runtime debug markers, uncaught errors, or broken asset paths;
- deterministic tests for game rules, movement/physics/state transitions when feasible.

Use `process_start`/`process_poll` for long-running servers, `port_check` before opening a local URL, and `browser audit` for rendered semantic/mobile checks. If Chromium is unavailable, state that visual verification was unavailable and still provide build/test evidence. Never deploy, publish, send email, or modify a remote service without the user's explicit authorization.
