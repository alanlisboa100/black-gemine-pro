# Relatório técnico — BLACKCORE Native 3.4.0

Data da validação: 12 de agosto de 2026

## Resultado executivo

A versão 3.4.0 aplica as melhorias de naturalidade pedidas: referências curtas usam o contexto recente, ambiguidades materiais bloqueiam alterações até serem resolvidas, liberdade explícita do usuário vira decisão autônoma, restrições e critérios de pronto ganham estado durável, e falhas de ferramentas provocam replanejamento por evidência. A inicialização também foi reconstruída com estado real do runtime e um primeiro acesso mais claro.

**Nota de naturalidade do harness: 9,1/10**, acima dos 8,2 estimados na 3.3. A nota ainda não significa paridade comprovada com o Codex: não houve avaliação humana cega, tráfego real nem comparação paga entre os mesmos projetos/modelos.

## O que mudou

### Entendimento por turno

Uma análise local, determinística e sem custo adicional extrai objetivo provável, alvos, restrições, critério de pronto, autonomia concedida, risco e ambiguidade. O texto original continua sendo a instrução autoritativa e nunca é traduzido ou substituído por esse mapa.

- “Melhora isso” usa o foco recente quando ele existe.
- Sem antecedente, apenas ferramentas de leitura ficam disponíveis; o executor também bloqueia uma mutação inventada pelo modelo.
- Se a escolha afeta arquitetura, dados, segurança, custo ou produção, o agente inspeciona o contexto ou faz uma única pergunta curta.
- “Você decide” e equivalentes autorizam escolhas técnicas reversíveis sem perguntas cosméticas.

### Continuidade longa

O estado da sessão mantém um ledger redigido com objetivo atual e recente, alvos, restrições, condições de conclusão, pendências e resultado anterior. Ele independe da compactação do histórico, reduzindo a chance de uma conversa longa perder o foco. A instrução explícita mais recente prevalece sobre metas antigas.

### Recuperação e replanejamento

Falhas são classificadas em dependência, permissão, autenticação, rede, validação, verificação ou execução. O próximo ciclo recebe a evidência real e deve alterar ferramenta, argumentos ou abordagem antes de tentar de novo. Chamadas idênticas repetidamente falhas continuam bloqueadas.

### Inicialização

- Núcleo visual animado e seguro em terminal de 54 colunas.
- Provedor, modelo, modo, quantidade de ferramentas e memória exibidos a partir do runtime real.
- Estágios de contexto, intenção/continuidade, ferramentas e segurança.
- Primeiro acesso em painel curto que explica modelo, raciocínio e armazenamento privado da chave.
- Caminho sem animação permanece direto e acessível.

## Evidência

| Gate | Resultado |
| --- | --- |
| Sintaxe JavaScript | 294/294 arquivos |
| Suíte automatizada | 183/183 testes |
| Benchmark contextual/adversarial | 254/254 casos |
| Corpus coloquial de controles | 38/38 frases |
| Total de cenários naturais determinísticos | 292 |
| Matriz nativa de ferramentas | 50/50 |
| Agente/checkpoint/undo/sessão | PASS |
| MCP stdio 2026-07-28 | PASS |
| Audit npm Core | 0 vulnerabilidades conhecidas |
| Audit npm Studio em produção | 0 vulnerabilidades conhecidas |

O benchmark de 254 casos cobre tarefas explícitas, referências contextuais, antecedentes ausentes, autonomia, alternativas arquiteturais, restrições, critérios de conclusão, perguntas, negação de escopo remoto e pedido remoto explícito.

## Limites honestos

1. O reconhecimento local usa sinais linguísticos e contexto recente; compreensão aberta continua dependendo da qualidade do modelo selecionado.
2. O benchmark é determinístico e desenhado para o harness. Ainda faltam avaliação humana cega, casos reais mantidos fora do desenvolvimento e comparação pareada com Codex.
3. O ledger reduz perdas de contexto, mas não garante memória perfeita nem deve substituir a instrução mais recente.
4. O gate de ambiguidade é conservador; frases inéditas podem precisar de novos casos de regressão.
5. Não houve chamada a modelos pagos nesta rodada. Tool use e protocolos foram validados por fixtures.
6. Continuam válidos os limites externos da 3.3: sem Chromium real, stack Supabase/Docker real, conta de deploy, APK instalado ou aparelho físico.
7. O lockfile Expo ainda reporta 18 alertas transitivos, sendo 7 moderados e 11 altos, nenhum crítico. A correção automática disponível rebaixa para Expo 53 e não foi aplicada.

## Método

A melhoria segue a orientação da documentação oficial OpenAI: problemas ambíguos devem coletar contexto e esclarecer decisões materiais; confiabilidade deve combinar testes, revisão e critérios explícitos de pronto. Evals devem refletir tarefas reais, incluir casos típicos, extremos e adversariais e crescer continuamente com feedback. Fontes: <https://learn.chatgpt.com/guides/best-practices> e <https://developers.openai.com/api/docs/guides/evaluation-best-practices>.

## Conclusão

A 3.4.0 aproxima significativamente o comportamento do BLACKCORE de um agente contextual moderno. Ele está pronto para piloto local controlado, mas a afirmação correta continua sendo “harness mais natural e verificável”, não “paridade comprovada com Codex”. O próximo avanço de qualidade deve vir de logs reais anonimizados, avaliação humana e novos casos mantidos fora do conjunto de desenvolvimento.
