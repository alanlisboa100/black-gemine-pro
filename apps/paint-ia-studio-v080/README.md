# 🖤 BLACK PAINT STUDIO // v0.8.0 SCENE-AWARE EXECUTION CORE

Estúdio visual local para Termux/Web com geração procedural própria, editor inteligente de foto e memória visual compartilhada. O núcleo de personagem/cenário continua CPU-friendly e não depende de GPU nem de API externa para funcionar.

## v0.8.0 — Scene-Aware Execution Core

A especificação da Misuki está ligada ao runtime real, com telemetry baseada na geometria executada/pixels em vez de constantes otimistas. O pipeline P01-P14 usa hard checkpoints, pode bloquear avanço/exportação e emite um plano v4 com operações pequenas, ferramentas, coordenadas, espessuras, dependências, validação e retry.

A v0.8 também adiciona um Scene Engine S01-S08 com 10 cenários cinematográficos e proteção do rosto/chifres. Veja `AUDIT_GROK_WORKSPACE_V080.md` e `UPGRADE_REPORT_v080.md`.

Para usar o núcleo canônico, inclua `Misuki` no prompt ou envie `character_profile: "misuki"`.


## Arquitetura visual integrada

```text
Prompt
  ↓
DirectorAgent                 → personagem + cenário + câmera + luz
  ↓
ScenarioBuilder S01-S08       → profundidade, composição, props, atmosfera
  ↓
MisukiBuilder P01-P14         → construção por checkpoints e hard gates
  ↓
StageCritic + CriticAgent     → estrutura separada de qualidade técnica
  ↓
Approved Export / rejected/ + VisualMemory
```

## Cenários cinematográficos v0.8

Perfis: `minimal_studio`, `gothic_bedroom`, `moonlit_cathedral`, `cyber_rain_city`, `occult_library`, `dark_rose_garden`, `throne_chamber`, `neon_lab`, `moon_balcony`, `forest_shrine`.

Cada perfil possui composição, câmera, iluminação, paleta, planos de profundidade, props, foreground, atmosfera, regras de exclusão e zona segura da personagem. A interface permite escolher cenário e força.

Regras detalhadas de máquina:

- `runtime/misuki_core/SCENARIO_RECIPES_V2.json`
- `runtime/misuki_core/SCENARIO_EXECUTION_PROTOCOL_V2.md`

## Smart Photo Editor v0.6.2

```text
Foto / Canvas
   ↓
PhotoAnalyzerAgent            → luz, contraste, faixa tonal, cor, ruído, nitidez
   ↓
PhotoEditorAgent              → decide quais correções realmente são necessárias
   ↓
EnhancementAgent              → balanço de branco, tom, exposição, contraste, cor,
                                redução de ruído e nitidez
   ↓
CriticAgent                   → valida o resultado com outra leitura técnica
   ↓
VisualMemory                  → guarda decisão + antes/depois + resultado
```

O modo **Auto Adaptativo** não aplica um filtro fixo. Ele mede a imagem primeiro, cria um plano limitado, testa três intensidades numa prévia e aplica no arquivo original a alternativa tecnicamente mais segura. Se as alternativas piorarem os indicadores, ele reduz a intensidade em vez de forçar a edição.

### Perfis do editor

- **Auto Adaptativo** — decide tudo automaticamente.
- **Natural** — correção geral conservadora.
- **Retrato** — luz um pouco mais aberta, saturação/nitidez mais suaves.
- **Arte / Anime** — preserva paletas estilizadas e permite detalhe mais firme.
- **Noturno** — evita clarear a cena até parecer dia.

### Visual Memory

A memória é compartilhada entre os agentes e fica em `blackcore_visual/memory/`.

Ela **não modifica o próprio código e não treina um modelo neural escondido**. O aprendizado atual é adaptativo e auditável: o sistema registra decisões, parâmetros e resultados positivos e usa apenas pequenos vieses limitados em futuras edições. O usuário também pode marcar uma edição com 👍 ou 👎; feedback negativo impede aquela decisão de ser favorecida pela política adaptativa.

## O que está conectado

- Interface Web ↔ servidor Node ↔ engine Python.
- Geração com `Director → Builder/Stroke → Critic`.
- Editor de foto com `Analyzer → Editor → Enhancement → Critic → Memory`.
- Upload local de PNG/JPEG/WebP pelo navegador.
- Presets A–F controlam parâmetros reais do motor.
- Critic Agent analisa o canvas.
- Seed salva/exibida para repetir gerações.
- Visual Memory possui API própria de status/feedback.
- Histórico do navegador usa snapshots comprimidos e DPR limitado a 2 para reduzir memória no celular.
- Servidor usa `127.0.0.1` por padrão e limita payloads.
- Google Fonts removido: a interface funciona offline.

## Motores locais

### CharacterBuilder

- rosto em camadas;
- olhos, pálpebras, sobrancelhas e boca separados;
- cabelo em hierarquia (massa → mechas → fios);
- chifres com estrutura + rim line;
- micro-assimetria controlada;
- fundo/halo/partículas;
- `StrokeAgent` para reduzir rigidez geométrica.

### EnvironmentBuilder

- value noise determinístico no lugar de seno/cosseno periódico;
- montanhas por planos de profundidade;
- floresta em clusters, com árvores de anatomia variável;
- caminho em perspectiva com bordas irregulares;
- neblina/atmosfera e luz quente;
- grain aleatório, sem grade regular de canvas.

### Smart Photo Engine

- análise de exposição/luminância;
- detecção de clipping em pretos e altas luzes;
- contraste e faixa dinâmica;
- saturação e dominante de cor;
- estimativa conservadora de ruído;
- estimativa de nitidez por alta frequência;
- balanço de branco limitado;
- recuperação suave de sombras/altas luzes;
- exposição/contraste/saturação adaptativos;
- median denoise apenas quando necessário;
- unsharp mask condicionado a ruído/nitidez;
- seleção automática entre múltiplas intensidades antes do render final.

## Instalação no Termux

```bash
unzip black-paint-studio.zip
cd black-paint-studio
chmod +x setup_termux.sh
./setup_termux.sh
node server.js
```

Abra:

```text
http://127.0.0.1:3333
```

Para liberar na rede local deliberadamente:

```bash
HOST=0.0.0.0 node server.js
```

## CLI

Gerar personagem:

```bash
python3 paint_studio_pro.py \
  --preset D \
  --prompt "garota gótica anime com cabelo longo e chifres" \
  --seed 123
```

Gerar cenário:

```bash
python3 paint_studio_v06_pro.py \
  --prompt "montanhas, floresta, caminho e cabana ao pôr do sol" \
  --seed 321
```

CLI unificada:

```bash
python3 paint_cli.py --generate --mode auto --preset F --prompt "..."
```

Editor de foto direto no Termux:

```bash
python3 photo_cli.py foto.jpg --profile auto --strength 1.0
```

Somente analisar:

```bash
python3 photo_cli.py foto.jpg --analyze-only
```

## API local

- `GET /api/status`
- `GET /api/presets`
- `POST /api/generate`
- `POST /api/analyze`
- `POST /api/photo/analyze`
- `POST /api/photo/enhance`
- `GET /api/memory/status`
- `POST /api/memory/feedback`
- `POST /api/save`

Exemplo de geração:

```json
{
  "prompt": "garota gótica anime, cabelo longo, iluminação vermelha",
  "preset": "D",
  "mode": "character",
  "seed": 123,
  "width": 768,
  "height": 768,
  "detail_level": 0.8,
  "scenario": "gothic_bedroom",
  "scene_strength": 0.65,
  "scene_enabled": true,
  "save_stages": true
}
```

Exemplo de edição automática:

```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "profile": "auto",
  "strength": 1.0
}
```

## Organização

```text
blackcore_visual/
  agents/
    director.py
    stroke.py
    critic.py
    photo_analyzer.py
    photo_editor.py
    enhancement.py
  builders/
    character.py
    environment.py
    misuki.py
    scenario.py
  memory/
    visual_memory.py
    visual_events.jsonl   # criado em runtime
    generations.jsonl     # criado em runtime
  specs/
    misuki_spec.py
  paint_program.py
  scenarios.py
  presets.py
  renderer.py
  scene_spec.py

engine_cli.py
photo_cli.py
server.js
app.js
presets.json
providers/
legacy_prototypes/
```

## Providers externos

O provider antigo que chama Pollinations/Flux permanece separado em `providers/`. Ele **não participa do núcleo local**.

## Testes

```bash
npm run check
npm run test:all
```

Os protótipos anteriores continuam preservados em `legacy_prototypes/` para consulta.
