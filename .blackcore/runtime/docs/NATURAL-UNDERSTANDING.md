# Natural understanding, continuity and recovery

BLACKCORE 3.4 keeps the user's original message unchanged and gives the selected model an additional advisory map for the current turn. The map is generated locally without another model call.

## Turn understanding

The local pass identifies:

- likely goal and named file/product targets;
- explicit constraints and observable completion signals;
- recent context that resolves references such as “isso”, “o mesmo” and “como antes”;
- explicit permission for the agent to choose a reversible implementation detail;
- ambiguity that would materially affect architecture, data, security, cost or deployment.

For a safe reversible detail, BLACKCORE states a conservative assumption and continues. For a consequential unresolved choice, only read-only tools remain exposed and the executor also blocks a hallucinated mutating call. The model may inspect context first; if the target remains unknown, it asks one concise question.

## Continuity ledger

Each session state keeps a small redacted ledger containing the current and recent goals, targets, durable constraints, known done conditions, unresolved choices and previous outcome. This state is independent of message compaction, so a long chat does not depend on one summary alone. The newest explicit instruction always wins when goals conflict.

## Evidence-driven recovery

Failed tool results are classified as dependency, permission, authentication, network, validation, verification or execution failures. The next model round receives the bounded redacted evidence plus a recovery contract:

1. do not repeat an unchanged failing call;
2. form a concrete hypothesis from the actual output;
3. change the tool, arguments or approach;
4. run the narrowest check that can disprove the hypothesis;
5. stop retrying when a real external dependency, permission, credential or platform blocker is proven.

## Evaluation

Run:

```bash
npm run eval:natural
```

The deterministic suite contains 254 contextual and adversarial cases in ten categories: explicit tasks, context references, missing antecedents, granted discretion, architecture alternatives, constraints, done conditions, questions, negated remote scope and explicit remote scope. `qa-natural-corpus.mjs` separately covers 38 colloquial local controls.

These tests validate the harness behavior; they do not claim parity with a proprietary agent or benchmark the quality of a paid model. Production mistakes should be converted into new held-out cases instead of relying on an informal “seems natural” judgment. This follows the evaluation-driven approach in the official OpenAI documentation: <https://developers.openai.com/api/docs/guides/evaluation-best-practices>.
