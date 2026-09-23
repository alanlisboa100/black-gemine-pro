# UPGRADE REPORT — BLACK PAINT STUDIO v0.8.0

## Codename

**SCENE-AWARE EXECUTION CORE**

## Mudanças principais

### Misuki runtime

- telemetry fixa removida;
- métricas agora vêm de geometria executada e checagens de pixels;
- StageCritic reordenado por momento real de construção;
- hard stop em falha estrutural;
- exportação reprovada vai para `rejected/`;
- P14 só é aprovado após fidelity gate;
- runtime memory V4 carregada pelo core.

### Paint Execution Program v4

- 51 operações pequenas para a personagem;
- 12–14 operações de cenário adicionais, dependendo do perfil;
- 63–65 operações totais por plano completo;
- P01–P14 e S01–S08 completos;
- ferramentas, coordenadas normalizadas e espessuras;
- depends_on, retry e validation por operação;
- regras negativas explícitas;
- cenário incluído no plano.

### Scene Engine

Novo pipeline S01–S08:

`composition -> value masses -> structure -> lighting -> props -> atmosphere -> foreground -> scene gate`

10 perfis de cenário incluídos.

### Memória de cenário

Novos arquivos:

- `runtime/misuki_core/SCENARIO_RECIPES_V2.json`
- `runtime/misuki_core/SCENARIO_EXECUTION_PROTOCOL_V2.md`
- `runtime/misuki_core/SCENARIO_BEAUTY_MEMORY_V1.json`

### Interface

- seletor de cenário;
- controle de força do cenário;
- resposta mostra cenário selecionado;
- resposta informa se exportação foi bloqueada e em qual gate.

### API

`POST /api/generate` agora transmite e devolve:

- `scenario`;
- `scene_strength`;
- `scene_enabled`;
- `save_stages`;
- `character_profile`;
- `scenario_plan`;
- `scenario_telemetry`;
- `export_blocked`;
- `blocked_at`.

## Testes da v0.8

Executados localmente:

- `npm run check`;
- 9 testes Node;
- 14 testes Python.

Todos devem permanecer verdes antes da distribuição do ZIP.

## Limitações conhecidas

- Pillow/Canvas procedural não substitui um modelo neural de imagem;
- fidelity estrutural ainda não é similaridade semântica de referência;
- algumas métricas, como separação horn/hair, ainda são inferidas do procedimento de render, não de visão aprendida;
- cenários são composição procedural, não geração fotográfica/anime de alta complexidade.
