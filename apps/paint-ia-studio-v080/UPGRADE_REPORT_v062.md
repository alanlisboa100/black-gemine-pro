# BLACK PAINT STUDIO — Upgrade v0.6.2

## Objetivo

Transformar a base v0.6.1 em um estúdio visual mais completo, adicionando um editor de foto inteligente, adaptativo e integrado à mesma memória usada pelo restante do Black Core.

## Novos agentes

### PhotoAnalyzerAgent
Mede luminância, contraste, faixa tonal, saturação, dominante de cor, clipping, nitidez e ruído em uma prévia limitada para manter custo previsível em CPU.

### PhotoEditorAgent
Converte as métricas em um plano de edição limitado. Em modo automático, testa três intensidades numa prévia e escolhe a melhor antes de aplicar no arquivo original.

### EnhancementAgent
Executa balanço de branco, curva tonal, exposição, contraste, saturação, redução de ruído e nitidez usando Pillow.

### VisualMemory
Memória compartilhada append-only em JSONL. Registra gerações e edições de foto, calcula pequenos vieses baseados em melhorias técnicas anteriores e aceita feedback explícito positivo/negativo.

## Integração Web/API

Foram adicionados:

- upload de PNG/JPEG/WebP;
- análise inteligente de foto;
- Auto Melhorar Inteligente;
- perfis Auto, Natural, Retrato, Arte/Anime e Noturno;
- controle de intensidade;
- feedback 👍/👎;
- painel de status da Visual Memory;
- `/api/photo/analyze`;
- `/api/photo/enhance`;
- `/api/memory/status`;
- `/api/memory/feedback`.

## Segurança e limites

O servidor continua local por padrão (`127.0.0.1`). O editor mantém limite de payload e o Python limita o tamanho da imagem decodificada. O sistema não executa código recebido no prompt e a memória não modifica arquivos de código.

## Natureza do "aprendizado"

Nesta versão, aprender significa **adaptação por memória estruturada**, não treinamento neural. O Black Core registra quais ajustes melhoraram indicadores técnicos e usa esse histórico com limites estreitos. Isso é intencional: deixa o comportamento explicável, reversível e leve para Termux.

## Testes

A base v0.6.2 inclui testes de arquitetura, API, geração determinística, editor de foto e Visual Memory, além de checagem de sintaxe JS/Python.
