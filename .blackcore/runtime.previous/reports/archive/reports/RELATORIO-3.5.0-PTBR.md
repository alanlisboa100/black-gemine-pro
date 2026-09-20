# Relatório técnico — BLACKCORE Native 3.5.0

## O que foi entregue

A auditoria agora faz parte do aplicativo. O usuário pode conversar normalmente — por exemplo, “faça uma auditoria completa deste projeto, rode tudo e deixe o Markdown para baixar” — e o BLACKCORE encerra o fluxo chamando `audit_report`. O resultado é um arquivo `.md` real no projeto ou em Downloads no Termux.

O formato foi ampliado em relação ao relatório de referência: inventário, fingerprint/SHA-256, quatro notas globais, notas de 0 a 10 por produto, gates, múltiplos grafos npm, Git, histórico da sessão, achados P0–P3 com impacto/correção/referências, sinais heurísticos separados de vulnerabilidades, pontos positivos, limites e ordem de correção.

## Notas atuais dos produtos

| Produto/componente | Nota | Evidência | Limitação principal |
| --- | ---: | --- | --- |
| BLACKCORE Core | **9,8/10** | 67 ferramentas, 197/197 testes, 254/254 casos contextuais, npm audit 0 | Resultado final ainda depende do modelo e dos gates disponíveis |
| Auditor nativo `.md` | **9,6/10** | Arquivo real, P0–P3, referências, notas por produto, redação de segredos e Downloads Termux | Não substitui pentest formal nem serviços/dispositivos não executados |
| Interface Termux | **9,5/10** | Composer estreito estável, cabeçalho do modelo persistente e saída linear sem scroll-region | Aparência depende da fonte e do emulador de terminal |
| BLACKCORE Studio | **9,6/10** | PWA offline, pesquisa/resumos/código, RLS Supabase e npm audit 0 | Sincronização remota requer projeto e credenciais do usuário |
| Fixture móvel Expo | **7,2/10** | Fonte Expo 57/React Native 0.86 e contratos estáticos cobertos | 30 alertas transitivos; APK/dispositivo real não validado nesta rodada |

## Segurança reforçada

Os maiores problemas da auditoria anterior foram tratados no runtime, não escondidos no texto do relatório:

1. Configuração de projeto perdeu autoridade para mudar política global, provedores, MCP, hooks, pacotes, deploy e fallback.
2. Servidores MCP precisam de confiança global explícita. Processos stdio não recebem todas as chaves do ambiente; HTTP obedece bloqueio de rede privada e revalidação de redirects; ferramentas com possível escrita externa confirmam a ação.
3. O classificador destrutivo reconhece variações de `rm` que contornavam a regex simples.
4. IPv4 privado encapsulado em IPv6 não atravessa a política de rede.
5. O parser Git desliga e remove ANSI defensivamente.
6. `doctor` sinaliza falha para automação e a ajuda funciona sem criar configuração.

## Como pedir dentro do aplicativo

```text
Faça uma auditoria completa de tudo que você fez nesta sessão, rode os testes e o audit de dependências, dê nota para cada produto e salve o Markdown em Downloads.
```

Para um ZIP, basta informar o arquivo. O fluxo orienta o agente a preservar e hashear o original, extrair uma cópia isolada, mapear hotspots e auditar a cópia.

## Veredito

**Core aprovado para uso local e piloto controlado.** O recurso de auditoria está funcional e coberto por regressão. A ressalva de entrega continua concentrada na fixture móvel e nas integrações remotas que exigem ambiente/conta do usuário.
