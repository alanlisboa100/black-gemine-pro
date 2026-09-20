# Relatório técnico — BLACKCORE Native 3.4.1

Data da validação: 12 de agosto de 2026

## Resultado executivo

A 3.4.1 corrige a interface mostrada nas capturas do Termux. O problema não estava no texto do modelo: o compositor ao vivo criava uma região ANSI fixa na parte inferior, e o Termux podia reapresentar linhas antigas do buffer — inclusive a mensagem de boas-vindas e o painel inicial — dentro da resposta transmitida. A versão nova evita essa técnica no Termux e em terminais estreitos.

A abertura agora é um único bloco visual curto. A entrada passou de quatro/cinco linhas com fundo pesado para um quadro de três linhas: o modelo e o raciocínio permanecem na borda superior, o pedido fica no centro e apenas prontidão, provedor, modo e atalho de comandos permanecem na borda inferior.

## O que saiu da tela normal

- catálogo inteiro de provedores;
- estágios internos de contexto, intenção, ferramentas e segurança;
- segundo painel “BLACKCORE CONTROL”;
- linha “Ready” duplicada;
- caminho do workspace;
- nome do transporte e origem da chave;
- contagem de tokens ao fim de toda resposta.

Nada foi removido do diagnóstico. `/status`, `/usage` e `blackcore doctor --full` continuam oferecendo os detalhes quando forem úteis.

## Correção de estabilidade

Em desktops com pelo menos 72 colunas, o compositor fixo continua disponível. Em Termux e telas menores, a saída fica linear: nenhuma região de rolagem é criada, o texto anterior não é reciclado e a caixa de mensagem reaparece limpa depois da resposta. Há teste permanente que exige zero sequência de scroll-region nesse perfil.

## Naturalidade adicional

A checagem E2E encontrou um falso positivo: “mover com dedo ou mouse” era interpretado como uma escolha entre duas arquiteturas. O analisador agora reconhece modalidades de entrada combinadas, mantém escolhas reais como “React ou Vue” sob esclarecimento e conclui o cubo interativo sem pergunta desnecessária.

## Notas atuais

| Produto/capacidade | Nota | Estado |
| --- | ---: | --- |
| Agente principal | 9,7/10 | Pronto para piloto local controlado |
| Naturalidade do harness | 9,2/10 | Forte; sem paridade humana comprovada com Codex |
| Continuidade de sessão | 9,2/10 | Ledger persistente e testado |
| Segurança de ambiguidade | 9,6/10 | Conservadora, com menos falso positivo de interação |
| Terminal, código e respostas | 9,8/10 | Corrigido para Termux estreito |
| Inicialização e entrada | 9,8/10 | Compactas, estáveis e sem repetição |
| Pesquisas e fontes | 9,2/10 | Estruturadas; qualidade final depende das fontes |
| Supabase | 9,1/10 | 19 ações; stack/conta real não executadas nesta rodada |
| BLACKCORE Studio PWA | 9,4/10 | Audit de produção com 0 vulnerabilidades conhecidas |
| App Expo/Android | 8,4/10 | Contrato válido; 30 alertas transitivos e sem APK físico |
| Entrega e deploy | 8,9/10 | Preflight e CLIs testados por stubs; produção não acionada |

## Evidência

| Verificação | Resultado |
| --- | --- |
| Sintaxe | 294/294 arquivos |
| Suíte automatizada | 186/186 testes |
| Benchmark contextual/adversarial | 254/254 casos |
| Site e cubo E2E | PASS |
| Matriz nativa | 50/50 ferramentas |
| Core npm audit | 0 |
| Studio npm audit produção | 0 |
| Mobile npm audit | 7 moderadas, 23 altas, 0 críticas |

## Limites honestos

1. A compreensão aberta continua dependendo do modelo escolhido; o harness organiza contexto, ferramentas e segurança, mas não transforma modelos diferentes no mesmo modelo.
2. Não existe evidência suficiente para afirmar equivalência ao Codex: faltam avaliação humana cega e execução pareada nos mesmos projetos.
3. O compositor fixo durante a geração foi deliberadamente desativado no Termux. Estabilidade e integridade da resposta têm prioridade; a entrada normal retorna ao final.
4. Os alertas do app Expo são transitivos no grafo atual. Uma atualização só será segura quando Expo/React Native disponibilizarem uma combinação compatível validável, sem downgrade destrutivo.
5. Não foram executados modelo pago, navegador Chromium real, Docker/Supabase real, APK/EAS, aparelho Android, banco remoto ou deploy de produção.

## Conclusão

O BLACKCORE 3.4.1 está mais limpo e confiável no cenário que motivou a correção. A resposta não deve mais misturar texto antigo do terminal, o modelo selecionado permanece visível enquanto o usuário digita e os detalhes técnicos só aparecem quando solicitados.
