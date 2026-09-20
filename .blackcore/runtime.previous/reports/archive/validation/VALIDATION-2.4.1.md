# BLACKCORE Native 2.4.1 — Tools responsiveness validation

## Issue reproduced

A validation command containing `rm -f /tmp/cubo-check.mjs` was classified as destructive. During the approval wait, the active tools spinner kept repainting the terminal line, visually hiding the approval prompt. The agent therefore appeared frozen while it was actually waiting for user input.

## Fixes

- Active model/tool animation is suspended before an interactive confirmation and resumed afterwards.
- Safe single-file `rm -f` cleanup under `/tmp` (including the Termux tmp path) no longer triggers the destructive-action gate.
- Recursive deletion, glob deletion, variable paths and deletion outside the temporary directory remain protected.

## Validation

- Automated suite: **76/76 passed**.
- JavaScript syntax scan: **223 files passed**.
- Tool matrix: **passed**.
- Regression test confirms the tool spinner is inactive while confirmation awaits input, then resumes after approval.
- Regression test confirms `node --check /tmp/file && rm -f /tmp/file` is normal, while `rm -rf /tmp/dir` and `rm -f ./important.txt` remain dangerous.

## Result

The specific apparent tools freeze shown on Termux is fixed in 2.4.1.
