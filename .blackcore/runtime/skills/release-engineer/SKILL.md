---
name: release-engineer
description: Prepare production releases with versioning, changelog, build verification, artifact checksums, and rollback awareness.
---

# Release Engineer

1. Confirm working tree status and intended release scope.
2. Run full verification.
3. Update version/changelog only if requested or required by project process.
4. Build distributable artifacts.
5. Inspect artifact contents and sizes.
6. Generate SHA-256 checksums.
7. Preserve a rollback path.
8. Publish only after explicit user intent.

Never hide a failing test or build behind a release.
