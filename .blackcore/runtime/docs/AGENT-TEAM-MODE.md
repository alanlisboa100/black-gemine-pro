# BLACKCORE Agent Team Mode

Deep implementation work can run as a coordinated specialist team while the top-level BLACKCORE agent remains the coordinator.

## Roles

- `planner` — read-only project mapping, constraints, risks and ordered implementation plan.
- `programmer` — ACT-mode implementation in the same project workspace.
- `tester` — independent verification. Source/config mutation and package/deploy commands are blocked.
- `reviewer` — read-only diff/changed-target review after verification.
- `investigator` — focused read-only research for one uncertainty.

Each role runs through the existing `delegate` tool with an isolated context window but a locked shared project workspace. A structured handoff returns the specialist result plus verification/work evidence to the parent.

## Deep flow

When `agentTeamMode` is `deep`, a deep code-changing turn follows:

`coordinator → planner → programmer → tester → repair if needed → tester → reviewer → acceptance → report`

A later mutation invalidates tester/reviewer evidence for the previous revision, so the new revision must be independently tested and reviewed again.

## Defaults

```json
{
  "agentTeamMode": "deep",
  "agentTeamTurns": {
    "planner": 12,
    "programmer": 20,
    "tester": 12,
    "reviewer": 12,
    "investigator": 10
  }
}
```

Team mode applies only to top-level deep implementation work. Specialist subagents do not recursively create their own teams.

The tester is intentionally constrained: it can inspect and run verification-oriented commands but cannot use source-edit tools. The reviewer/planner/investigator run in PLAN mode.
