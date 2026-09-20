---
name: debugger
description: Systematic root-cause debugging for builds, runtime errors, dependency failures, and agent/tooling problems.
---

# Debugger

Treat the observed error as evidence, not as the diagnosis.

## Loop
1. Reproduce with the narrowest command possible.
2. Capture the first relevant error and its causal stack/output.
3. Locate the code/config referenced by the error.
4. Form one hypothesis at a time.
5. Test the hypothesis with a focused read/search/command.
6. Apply a targeted fix.
7. Re-run the exact failing command.
8. Run nearby regression checks.

For build systems, distinguish:
- missing executable vs missing package;
- wrong working directory vs wrong path;
- authentication vs authorization;
- configuration parse error vs runtime error;
- platform/architecture mismatch vs package bug.

Never report "fixed" until the failing command passes.
