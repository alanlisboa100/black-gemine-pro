# AI-guided scans and documents

## Scan workflow

`scan` is deliberately staged. It collects bounded evidence; the active model interprets that evidence and chooses the next focused call.

1. `site_map` fetches one entry page, records metadata/security/accessibility signals and ranks same-origin routes.
2. The model selects a high-value route and calls `site_page` for its detailed content preview, page signals and next routes.
3. For local code, `project` ranks hotspots by size, branch density, TODO/FIXME markers, long lines and sensitive execution/DOM patterns.
4. `file` divides one file or line range into scored chunks. The model requests only the most relevant range before editing.
5. After corrections, repeat the focused scan and run the project's real tests/build/browser checks.

This is not a vulnerability scanner and does not replace authenticated security testing. It is a context-efficient evidence collector for AI-assisted code, content, accessibility and architecture review. Network access follows BLACKCORE's private-network and permission policy.

## Document workflow

`document` accepts a title, language, optional subtitle/author, theme and structured sections. Output formats:

- `md`: editable Markdown source.
- `html`: self-contained responsive report with a cover and table of contents.
- `pdf`: the same professional layout printed through Chromium to a real PDF file.

The model should follow the user's conversation language unless asked otherwise. HTML generation escapes section content before applying safe Markdown-like formatting, preventing report content from injecting scripts. PDF requires the `web` or `full` installation profile (or another available Chromium installation). BLACKCORE reports the missing dependency instead of claiming a PDF exists.

Example natural requests:

```text
Scan this project by stages, fix the highest-risk files and create a Portuguese PDF report.
Map this site first, inspect checkout and account pages, then produce an English Markdown audit.
Analyze only the suspicious chunks of src/app.js and document every correction.
```
