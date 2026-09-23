# BLACK PAINT STUDIO — Upgrade v0.7.0 Checkpoint Core

## Objetivo

Corrigir a diferença entre “documentação absorvida” e “comportamento realmente executado”. Na v0.6.2 o pacote Misuki V2 estava presente no ZIP, mas o motor de geração não o importava. A v0.7.0 conecta a especificação ao runtime e adiciona execução por checkpoints.

## Mudanças principais

- `MisukiRuntimeSpec`: carrega o JSON de especificação no runtime.
- `MISUKI_RUNTIME_MEMORY_V3.json`: memória compacta correta para execução.
- `MisukiCheckpointBuilder`: construção P01-P14.
- `StageCritic`: valida estrutura antes de avançar/exportar.
- `paint_program.py`: programa de desenho para Paint-like executor com coordenadas normalizadas, ferramentas, espessuras e condições de validação.
- `paint_plan.json`: salvo junto de cada geração Misuki.
- Checkpoint PNGs: salvos por etapa quando `save_stages=true`.
- Score técnico e score estrutural separados.
- Score estrutural é marcado explicitamente como proxy geométrico e limitado a 90 até existir um modelo visual de referência real.
- API e UI expõem checkpoints, falhas e score estrutural.
- Testes de regressão bloqueiam os defeitos observados no protótipo antigo.

## Defeitos antigos bloqueados

- cabelo com topo em telhado/polígono;
- dezenas de linhas paralelas tipo pente;
- torso como retângulo preto;
- roupa como barras horizontais;
- chifres visualmente desconectados;
- olhos fora da faixa de proporção;
- aprovação falsa de identidade baseada só em contraste/simetria.

## Limitação honesta

O núcleo continua procedural/Pillow. Ele ficou mais controlável, verificável e fiel à especificação, mas não se torna um modelo neural de geração de imagem. Para equivalência visual de alto nível com a referência canônica, ainda seria necessário integrar um modelo visual local ou um sistema de visão/geração mais forte.
