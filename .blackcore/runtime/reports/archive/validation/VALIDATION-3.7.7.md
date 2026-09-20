# BLACKCORE Native 3.7.7 validation

Data: 22 de agosto de 2026.

## Verificação integral

Comando executado no diretório da release:

```bash
npm run verify
```

Resultado:

- Sintaxe: `syntax OK: 344 JavaScript files`.
- Testes: `320` executados, `320` aprovados, `0` falhas, `0` cancelados, `0` ignorados.
- A suíte completa preservou os testes reais de FFmpeg da versão anterior e adicionou testes reais de ImageMagick.

## Evidência específica do editor de fotos

- Registro e seleção natural do `photo_editor` em pedidos em português.
- Análise determinística de exposição, ambiente, detalhe e região focal.
- Plano automático distinto para baixa luz, vegetação e recuperação de detalhes.
- Render real de melhoria profissional com recorte focal quadrado.
- Reabertura da saída e confirmação de dimensões/pixels alterados.
- Render real da marca BLACKCORE e compressão JPG.
- HUD móvel com deduplicação das 12 etapas profissionais.

## Segurança e telefone

- A ferramenta usa a política de leitura/escrita do workspace, captura checkpoint antes da saída e respeita cancelamento.
- A entrada e a saída não podem ser o mesmo arquivo.
- ImageMagick recebe limites de duas threads, 768 MiB de memória e 2 GiB de mapa por padrão, ajustáveis pelo ambiente.
- O perfil `creator` instala ImageMagick/FFmpeg como dependências opcionais do Termux; não há nova dependência npm obrigatória.
- O instalador troca somente `~/.blackcore/runtime`; `~/.blackcore/config/secrets.json` permanece fora da área substituída.
