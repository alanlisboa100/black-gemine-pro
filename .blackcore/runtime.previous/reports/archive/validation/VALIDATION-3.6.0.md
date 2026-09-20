# BLACKCORE Native 3.6.0 — validação do protocolo de trabalho verificável

Data: 2026-08-13  
Escopo: release 3.6.0, protocolo adaptativo de trabalho, gates de qualidade, instruções de projeto e HUD Termux.

## Veredito

**APROVADO PARA USO LOCAL.** O ciclo novo não força trabalho profundo em perguntas simples, mas impede que alterações `standard` e `deep` sejam concluídas sem evidência registrada. Ele também distingue corretamente “ferramenta executou” de “verificação passou”.

| Gate | Resultado |
| --- | ---: |
| Sintaxe JavaScript | **309/309** arquivos aprovados |
| Suíte Node sequencial | **236/236** testes aprovados |
| Avaliações naturais/contextuais | **254/254** aprovadas |
| `npm run verify` | **aprovado** |
| Dependências obrigatórias do núcleo | **0** |
| Dependência opcional | `playwright-core` para navegador avançado |
| `npm audit --omit=dev` — núcleo | **0** vulnerabilidades |
| `npm audit --omit=dev` — Studio | **0** vulnerabilidades |
| `npm audit --omit=dev` — fixture Expo/React Native | **30** alertas (23 altos, 7 moderados) |
| Regressões do protocolo 3.6 | **4/4** comportamentos principais aprovados |

## Cenários novos cobertos

1. Pergunta somente de leitura fica em `fast`, sem gate artificial.
2. Alteração focada entra em `standard`; resposta prematura recebe um único gate de verificação.
3. Trabalho amplo entra em `deep`; depois de uma verificação aprovada, precisa de revisão de diff/alvos.
4. `{"ok": false}` é falha semântica, mesmo se o processo da ferramenta retornou normalmente.
5. Sem comandos detectáveis, a verificação retorna `unverified`, não um selo verde vazio.
6. `AGENTS.override.md` substitui `AGENTS.md` no mesmo diretório e mantém instruções mais amplas acima dele.
7. O pedido coloquial “dê seu melhor / escolha o melhor” concede autonomia para decidir entre alternativas de arquitetura sem bloquear uma edição segura.
8. HUD a 54 colunas mantém controles compactos e apresenta o comando `/work` sem remover modelo, modo ou saída.
9. No Termux, SGR mouse/touch permanece desligado por padrão para preservar o toque usado pelo Android para focar o compositor; `BLACKCORE_TERMUX_MOUSE=1` continua habilitando os gestos explicitamente.
10. A captura de stdout dos testes de splash/setup roda em processo filho, evitando interferência do protocolo interno do `node:test` em Node.js 22.

## Comando executado

```text
npm run verify
> npm run test:syntax && npm test
syntax OK: 309 JavaScript files
tests 236 · pass 236 · fail 0 · cancelled 0

npm run eval:natural
passed 254 · total 254 · failed 0
```

O aviso do npm sobre a futura remoção de `http-proxy` é informativo do ambiente de teste; não é falha da aplicação nem dependência nova do BLACKCORE.

## Dependências e segurança

O runtime principal não declara dependências de produção obrigatórias; `playwright-core` permanece opcional. A aplicação Studio também retornou zero alertas no escopo de produção. A fixture móvel `examples/creative-lab-mobile`, que é um exemplo Expo/React Native separado do runtime Termux, retornou 30 alertas transitivos no lockfile atual: 23 altos e 7 moderados. Não foi aplicado `npm audit fix` automaticamente porque atualizações de Expo/React Native são mudanças de framework que exigem compatibilidade e teste Android próprios. O alerta está documentado e não foi ocultado como se pertencesse ao núcleo.

## Limitações que continuam

- O teste automatizado do HUD simula Termux/ANSI. A confirmação final de gestos, teclado e tamanho de fonte ainda deve acontecer no aparelho Android real.
- O gate pede evidência ao modelo, mas um modelo pode relatar que uma limitação bloqueou o check; o resultado permanece `unverified`, e o usuário deve decidir se aceita a entrega.
- Não há sandbox de sistema operacional, revisor independente, nuvem gerenciada ou marketplace assinado dentro deste pacote.
- A qualidade de implementação continua dependente do modelo escolhido e do contexto fornecido; o protocolo melhora processo e evidência, não substitui raciocínio do modelo.
