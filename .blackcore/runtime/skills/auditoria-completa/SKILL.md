# Auditoria completa

Use esta habilidade quando o usuário pedir auditoria, revisão de entrega, avaliação de prontidão, scorecard ou relatório do que foi construído.

## Entrega obrigatória

- Produza um arquivo Markdown real com `audit_report`; não entregue apenas uma resposta no chat.
- Escreva no idioma do usuário.
- Se o usuário disser “baixar”, “telefone”, “Downloads” ou equivalente, use `destination: "downloads"`. Caso contrário, salve em `reports/` no workspace.
- Informe o caminho retornado pela ferramenta, o veredito e a nota geral.

## Método

1. Preserve o alvo. Se for um arquivo compactado, calcule o hash do original e extraia uma cópia em pasta isolada.
2. Mapeie o escopo com `scan` em modo de mapa/repositório e detecte o ecossistema.
3. Leia os hotspots e as fronteiras de confiança: configuração, rede, autenticação, execução de processos, arquivos, banco, deploy e plugins.
4. Execute `security_scan` para segredos e dependências. Nunca copie valores de segredos para o contexto ou relatório.
5. Execute testes, lint, typecheck e build declarados. Em auditoria completa, use `verification: "full"`; em auditoria rápida, use `verification: "safe"` ou `"none"` e declare o que não foi executado.
6. Registre achados P0–P3 apenas quando houver evidência. Inclua impacto, recomendação e referências de arquivo/linha. Sinais heurísticos não são vulnerabilidades confirmadas.
7. Chame `audit_report` por último, passando os achados confirmados, limitações e o destino solicitado.
8. Se houver mais de um app, produto ou componente, passe uma nota de 0 a 10 para cada item em `products`, sempre com evidência e limitação principal.

## Critério de honestidade

- “Completa” descreve o método executado, não certeza absoluta.
- Não marque deploy, dispositivo, serviço remoto, cobrança, produção ou pentest como comprovado sem execução explícita e evidência.
- Falha ou ausência de um gate deve aparecer em limitações ou achados; nunca seja escondida para melhorar a nota.
- Diferencie claramente fato confirmado, conclusão provável e revisão manual.
