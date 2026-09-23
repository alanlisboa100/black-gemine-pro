---
name: security-review
description: Review application code and configuration for practical security problems without exposing secrets.
---

# Security Review

Focus on concrete exploit paths:
- auth/authz gaps;
- unsafe command construction;
- injection (SQL, shell, template, path);
- arbitrary file access/path traversal;
- SSRF and unsafe redirects;
- secret leakage/logging;
- insecure token storage;
- missing input validation;
- dangerous CORS;
- dependency/install-script risk;
- upload validation;
- privilege boundary mistakes.

Never print credentials. Use filenames and redacted shapes instead of secret values.
Prioritize by exploitability and impact. Provide a fix plus a regression test when possible.
