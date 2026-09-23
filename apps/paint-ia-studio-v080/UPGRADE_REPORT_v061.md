# BLACK PAINT STUDIO — Upgrade Report v0.6.1

## Resumo

A base foi reorganizada para transformar os protótipos separados em um sistema visual único e conectado. O foco do upgrade foi arquitetura, integração, memória, segurança, desempenho no celular e melhoria do pipeline procedural.

## 1. Arquitetura de 3 agentes

### DirectorAgent
- interpreta prompt;
- decide personagem/cenário em modo Auto;
- resolve preset;
- normaliza seed, tamanho, nível de detalhe, humor, pose e paleta;
- gera `SceneSpec` estruturado.

### StrokeAgent
- traço Bézier;
- jitter controlado;
- variação de largura;
- quebra de linha;
- repetição de stroke;
- perfis diferentes por material.

Os Builders (`CharacterBuilder` e `EnvironmentBuilder`) fornecem a estrutura geométrica para esse agente trabalhar.

### CriticAgent
- mede luminância;
- contraste;
- simetria;
- densidade de bordas;
- gera alertas técnicos;
- executa um polish conservador.

## 2. Interface conectada ao Python

Antes, o botão de Personagem Pro e o seletor de preset não comandavam o motor Python. Agora:

```text
UI → /api/generate → server.js → engine_cli.py → VisualEngine → imagem → UI
```

Também foi adicionado `/api/analyze` para o Critic Agent analisar o canvas atual.

## 3. Presets A–F agora são reais

Os parâmetros deixaram de ser majoritariamente descritivos. O motor lê valores numéricos reais:

- `line_weight`
- `line_jitter`
- `hair_complexity`
- `shadow_intensity`
- `asymmetry`
- `grain`
- `edge_break`
- `stroke_repeat`

A interface carrega a lista pelo endpoint `/api/presets`, deixando `presets.json` como fonte de verdade.

## 4. CharacterBuilder

Melhorias principais:

- ordem de camadas corrigida;
- cabelo traseiro não atravessa o rosto sem controle;
- cabelo organizado em massa, highlights, locks frontais e bangs;
- olhos construídos por partes;
- micro-assimetria;
- sombras de rosto suaves;
- chifres separados da face;
- roupa/collar em camada própria;
- atmosfera e partículas determinísticas por seed.

## 5. EnvironmentBuilder

Problemas corrigidos da paisagem anterior:

- removida a textura em grade regular;
- substituído ruído baseado em seno/cosseno por Value Noise determinístico;
- montanhas divididas em planos de profundidade;
- árvores deixaram de compartilhar anatomia idêntica;
- floresta usa clusters;
- caminho tem perspectiva e bordas irregulares;
- neblina e luz atmosférica integram os planos;
- grain é orgânico/aleatório.

## 6. Memória

Cada geração grava um registro JSONL com:

- versão do engine;
- prompt;
- seed;
- SceneSpec;
- preset;
- relatório do Critic;
- arquivo final.

Arquivo: `blackcore_visual/memory/generations.jsonl`.

## 7. Segurança e Termux

- bind padrão mudou de `0.0.0.0` para `127.0.0.1`;
- LAN só é liberada explicitamente com `HOST=0.0.0.0`;
- removido shell com string de filename no media-scan;
- limite de payload;
- validação de data URL;
- proteção contra path traversal;
- dependência de Google Fonts removida;
- provider Flux/Pollinations separado do núcleo local.

## 8. Memória do navegador

O histórico antigo guardava `ImageData` bruto do canvas inteiro até 25 vezes. Em telas com DPR alto isso poderia consumir centenas de MB.

Agora:

- DPR é limitado a 2;
- histórico máximo é 10;
- snapshots são comprimidos em WebP/PNG;
- o estado é salvo apenas em pontos relevantes.

## 9. Compatibilidade

Os protótipos antigos foram preservados em `legacy_prototypes/`.

Os nomes conhecidos da raiz continuam disponíveis por wrappers ou CLIs compatíveis, permitindo migrar sem perder o trabalho anterior.

## 10. Providers externos

O gerador que usa Pollinations/Flux foi isolado em `providers/`.

O `blackcore_visual/` não importa esse provider e continua local.

## 11. Testes

Incluídos:

- testes Node da API, presets, UI, segurança e geração;
- testes Python de presets, Director, determinismo por seed e EnvironmentBuilder;
- checagem de sintaxe JS/Python.

Comandos:

```bash
npm run check
npm run test:all
```

## Próximos pontos que ainda podem elevar a qualidade

- Pose/Gesture Planner com esqueleto 2D;
- máscara por região para correções locais;
- sistema de materiais mais profundo;
- StrokeAgent treinável/parametrizado pela Memória 2.0;
- Critic semântico mais avançado;
- cache de cenas e render incremental;
- painel de comparação A/B entre presets;
- exportação de layers para edição posterior.

A base v0.6.1 já foi preparada para receber esses módulos sem precisar reescrever o projeto inteiro.
