# Sessions and Branching

BLACKCORE session files are JSONL and are stored per working directory below `~/.blackcore/sessions/`.

## Tree model

Each entry has an `id` and `parentId`. The active entry is a pointer into this tree. A prompt appended after `/jump` becomes a new child branch rather than deleting the previous future.

This supports:
- `/tree`
- `/jump ENTRY_ID`
- `/fork ENTRY_ID`
- `/clone`
- `/label ENTRY_ID TEXT`

## Resume

`blackcore -c` resumes the latest session. `/resume` accepts a list number, partial session ID, filename fragment, or session name.

## Compaction

Long active branches can approach a model context limit. BLACKCORE estimates context pressure and asks the current model to create an operational summary of older messages. The summary is appended as a compaction entry and recent messages are retained after it.

The original entries remain in the JSONL file. Compaction changes the active continuation context; it is not a destructive deletion of history.

## Session state

Session-adjacent state stores active skills, tool enable/disable choices and todos. API keys are never stored in session files.
