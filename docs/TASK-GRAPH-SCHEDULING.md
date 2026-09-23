# BLACKCORE Task-Graph Scheduling

Phase 5 adds a dependency-aware DAG to deep team engineering. The graph is planning metadata stored by BLACKCORE, not a file written into the user's project.

## Flow

1. The coordinator asks the `planner` specialist to inspect the workspace.
2. The coordinator records work units with `task_graph`.
3. Each node has a stable `id`, a focused description, a specialist `role`, zero or more `dependsOn` IDs, and expected `targets` when known.
4. Only dependency-ready nodes may start.
5. Ready programmer nodes with concrete, disjoint target paths may be delegated in the same model turn. BLACKCORE can execute those specialists concurrently up to `maxParallelAgents`.
6. Overlapping, dependent, wildcard, unknown-target, shell/package/Git/deploy work remains sequential.
7. Once implementation nodes finish, the normal independent tester, repair, reviewer, and acceptance gates still apply to the resulting workspace revision.

## Example DAG

```json
{
  "goal": "add account settings",
  "nodes": [
    {
      "id": "api",
      "text": "add settings API",
      "role": "programmer",
      "dependsOn": [],
      "targets": ["src/api/settings.js"]
    },
    {
      "id": "ui",
      "text": "build settings UI",
      "role": "programmer",
      "dependsOn": [],
      "targets": ["src/ui/settings"]
    },
    {
      "id": "wire",
      "text": "connect UI to API",
      "role": "programmer",
      "dependsOn": ["api", "ui"],
      "targets": ["src/app.js"]
    }
  ]
}
```

`api` and `ui` are ready together and their targets do not overlap, so they are eligible for safe parallel delegation. `wire` waits for both.

## Safety rules

Parallel programmer nodes are target-isolated. While a node is eligible for concurrent execution, mutation tools must stay inside its declared target scope. Broad shell, package-management, Git, and deployment tools are disabled for that parallel specialist. If BLACKCORE cannot prove two writes are independent, it serializes them.

The coordinator still owns final verification and acceptance. Parallel execution never converts unverified work into a successful result.

## Recovery

The graph lives in the work snapshot and recovery journal. If Termux or Android stops the process, completed nodes stay completed, pending dependencies stay pending, and uncertain in-flight tool work is inspected before retrying.

Use `/graph` to inspect the current graph. The feature defaults to `agentTaskGraphMode: "adaptive"` for deep team work, with `maxParallelAgents: 3`.
