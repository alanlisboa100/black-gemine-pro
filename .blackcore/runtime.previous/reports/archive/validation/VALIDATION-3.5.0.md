# BLACKCORE Native 3.5.0 — validação

Data: 2026-08-12

## Resultado executivo

**APROVADA para uso local e piloto controlado.** A 3.5.0 acrescenta uma auditoria nativa que gera um Markdown real e fecha as fronteiras de segurança P0/P1 identificadas na revisão da 3.4. O núcleo e o Studio não têm vulnerabilidades npm conhecidas no grafo de produção. A fixture móvel Expo continua limitada por alertas transitivos do ecossistema e não deve ser tratada como APK de produção auditado.

## Gates executados

| Gate | Resultado |
| --- | --- |
| Sintaxe JavaScript | PASS — 299 arquivos |
| Suíte automatizada | PASS — 197/197 |
| Benchmark contextual/adversarial | PASS — 254/254 |
| Corpus natural coloquial | PASS — 38/38 |
| Matriz nativa de ferramentas | PASS — 50/50 |
| Agente, subagente, checkpoint e undo | PASS |
| MCP stdio 2026 | PASS |
| npm audit — núcleo | PASS — 0 vulnerabilidades |
| npm audit — BLACKCORE Studio | PASS — 0 vulnerabilidades |
| npm audit — fixture móvel Expo | RESSALVA — 30: 23 altas, 7 moderadas, 0 críticas |

## Regressões específicas da 3.5

- `audit_report` cria `.md`, inclui seções estruturadas, nota por produto, P0–P3, referências, limitações e um caminho de arquivo real.
- O destino Termux resolve para `~/storage/downloads` quando o armazenamento está configurado.
- Valores de segredos não aparecem no relatório; apenas tipo, arquivo e linha são registrados.
- Auditoria completa executa o comando de verificação declarado e reconhece lockfile.
- Manifestos npm aninhados entram no audit de dependências, não apenas o `package.json` da raiz.
- `.blackcore/settings.json` do projeto não pode rebaixar permissões nem injetar provedores, MCP, hooks, pacotes, deploy ou fallback.
- MCP exige confiança global exata; stdio herda ambiente mínimo; HTTP passa por política de rede, redirect e limite de resposta; ação não read-only pede confirmação.
- Variantes `rm -fr /`, flags separadas e `--no-preserve-root` são críticas.
- IPv4 privado mapeado em IPv6 continua privado.
- Git review remove ANSI mesmo com cor forçada.
- `blackcore --help` não inicializa o home e `doctor` falho retorna código 1.

## Limites comprovados

- Os padrões de segredo presentes nos testes são fixtures deliberadamente falsas e continuam aparecendo como “revisão manual”; o auditor não os silencia automaticamente.
- Os 30 alertas da fixture Expo estão no grafo Expo/React Native/Metro. O reparo automático sugerido troca versões diretas por linhas major incompatíveis com a fixture, então não foi aplicado silenciosamente.
- Não houve chamada com chaves reais, deploy, cobrança, envio de e-mail, produção, pentest externo, APK assinado nem dispositivo Android físico nesta rodada.
- A nota de uma auditoria depende dos gates efetivamente executados e da capacidade do modelo escolhido de interpretar os hotspots; o relatório declara essas limitações.
