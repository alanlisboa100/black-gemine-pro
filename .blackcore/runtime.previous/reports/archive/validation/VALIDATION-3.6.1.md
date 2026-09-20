# BLACKCORE Native 3.6.1 — language lock, Google 400, four-key flow

## Fixes

- Reply language follows the latest user message (`auto`): English in, English out.
- Google object schemas always have `properties`.
- Gemma/native parallel tool results share one user turn.
- Portuguese tool routing for site/animações/pesquisa/auditoria/jogo.
- Four Google keys: sticky last-success slot, sequential failover, same request context.
- Compaction will not start a kept window on an orphan tool result.

## Gates

```bash
npm run test:syntax
npm test
npm run eval:natural
npm run plugin:test
```
