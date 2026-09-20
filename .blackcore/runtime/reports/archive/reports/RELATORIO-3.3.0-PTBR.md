# Relatório técnico — BLACKCORE Native 3.3.0

Data da auditoria: 12 de agosto de 2026

## Resultado executivo

O BLACKCORE 3.3.0 está pronto para uso local controlado em Termux/Linux e agora inclui um aplicativo web instalável completo, o **BLACKCORE Studio**, para organizar código, resumos, pesquisas e avaliações. A sincronização Supabase é opcional, autenticada e protegida por RLS por usuário. O agente ganhou respostas Markdown multilinha mais legíveis, pesquisa multi-consulta com mapa de fontes e uma integração Supabase ampliada de 5 para 19 ações.

**Nota técnica geral: 9,3/10.** A pontuação é ponderada por evidência. Ela desconta o que não foi possível provar neste ambiente: renderização visual em Chromium real, stack Supabase/Docker real, operação em conta de produção, build/instalação de APK e teste em aparelho.

## Nota de cada produto

| Produto/capacidade | Nota | Estado comprovado | Limite principal |
| --- | ---: | --- | --- |
| BLACKCORE Core/agent | 9,7 | 168/168 testes, 38/38 frases naturais, checkpoints/undo/subagente e MCP aprovados | Modelos externos não foram chamados com chaves reais |
| TUI e exibição de código | 9,7 | Markdown multilinha, código numerado, realce leve, tabelas, tarefas, fontes e largura de 54 colunas | Não houve inspeção humana em todos os emuladores Termux |
| BLACKCORE Studio PWA | 9,4 | CRUD local, filtros, fixação, pesquisa, resumo, notas, offline/PWA, acessibilidade estrutural e testes de modelo | Auditoria do DOM foi estática; Chromium real não estava instalado |
| Pesquisa e fontes | 9,2 | `web_research` executa 2–4 consultas, ranqueia, deduplica e mostra domínio, tipo, snippet e cobertura | Snippets ajudam a descobrir fontes; não substituem leitura e validação do conteúdo |
| Supabase | 9,1 | 19 ações, migração SQL, RLS forçada por usuário, Auth/PostgREST, Edge Function e proteção de secrets | Stack local e projeto remoto não foram executados por falta de Docker/credenciais |
| Aplicativo Android/Expo | 8,8 | Expo SDK 57, React 19.2, React Native 0.86.2, lockfile e Expo Doctor 20/20 | Sem build/instalação em aparelho; 18 alertas npm transitivos permanecem |
| Entrega e deploy | 8,9 | Adaptadores e confirmações para Vercel, Netlify, EAS, Supabase e Resend; preflight local aprovado | Nenhum deploy/login/domínio/serviço de produção foi usado |

Média ponderada e arredondada: **9,3/10**.

## O que foi realizado

### Aplicativo completo

`examples/blackcore-studio` contém:

- PWA responsiva e instalável, com navegação por Workspace, Resumos, Pesquisas, Produtos e Supabase;
- armazenamento local offline-first, busca, filtros, fixação, edição, exclusão e cópia de código;
- visualização de código com numeração de linhas e realce seguro sem injetar HTML do usuário;
- animações de ambiente, transições, indicadores e opção de reduzir movimento;
- Auth Supabase por email/senha, sincronização e exclusão de itens pela API REST;
- migração SQL com tabela, índices, trigger de `updated_at`, RLS forçada e policies de SELECT/INSERT/UPDATE/DELETE vinculadas a `auth.uid()`;
- Edge Function autenticada para gerar um digest estruturado de pesquisas;
- manifest, service worker, ícones, testes e documentação de configuração.

O app nunca inclui `service_role`. Usa somente a chave pública/anon no cliente; senha não é persistida e o token de sessão fica em `sessionStorage`.

### Código, resumos e pesquisas na tela

- Corrigido o truncamento de respostas assistentes não transmitidas que continham várias linhas.
- Blocos de código exibem linguagem e números de linha, com realce de tokens sem parser pesado.
- Headings de resumo, pesquisa, resultados e limitações têm hierarquia visual própria.
- Listas, checklists, tabelas, citações e links de fonte agora são preservados no terminal estreito.
- O prompt de compactação conserva objetivo, restrições, decisões, arquivos/comandos, evidências e pendências, distinguindo trabalho concluído de trabalho apenas planejado.
- `web_search` passou a retornar metadados úteis; `web_research` cria um mapa multi-consulta, deduplicado e rastreável.

### Supabase completo e seguro

As 19 ações disponíveis são: `status`, `projects`, `init`, `start`, `stop`, `link`, `db_lint`, `db_reset`, `db_push`, `migration_new`, `migration_list`, `test_db`, `gen_types`, `functions_new`, `functions_list`, `functions_deploy`, `secrets_list`, `secrets_set` e `secrets_unset`.

- CLI global ou local do projeto é detectada.
- `db_reset` pede confirmação destrutiva.
- Escritas remotas, deploy de Function e alterações de secrets pedem confirmação fora de `yolo`.
- Secret values não passam como argumentos do modelo; `secrets_set` lê um arquivo autorizado no workspace.
- Geração de tipos pode gravar atomicamente no arquivo solicitado.

O fluxo local oficial da Supabase CLI usa contêineres Docker e recomenda pelo menos 7 GB de RAM para iniciar a stack completa. Fonte: <https://supabase.com/docs/guides/local-development/cli/getting-started>.

## Dependências e prontidão

| Componente | Versão/engine | Situação |
| --- | --- | --- |
| BLACKCORE Core | Node.js >=20 | Pronto; zero dependências npm obrigatórias |
| Browser opcional | `playwright-core` 1.62.1, Node >=20 | Biblioteca pronta; exige navegador Chromium do sistema ou instalado separadamente |
| Studio | navegador moderno; Supabase CLI 2.113.0 apenas para desenvolvimento | App funciona localmente sem Supabase; audit npm de produção: 0 |
| Supabase local | CLI 2.113.0, Docker compatível | Configuração pronta; stack não iniciada neste ambiente |
| Mobile | Node >=20.19.4, Expo ~57.0.12, React 19.2.3, RN 0.86.2 | Expo Doctor 20/20; build final ainda exige EAS ou toolchain Android |
| Vercel | CLI 58.9.4, Node >=18 | Adaptador pronto; autenticação externa necessária |
| Netlify | CLI 27.1.1, Node >=22.13 | Instalador pula com aviso em Node antigo |
| EAS | CLI 21.8.0, Node >=20 | Adaptador pronto; conta Expo necessária |
| Resend | CLI 2.12.0, Node >=22 | Instalador pula com aviso em Node antigo |

A Supabase documenta `supabase init` e `supabase start` para o fluxo local; a atualização do Expo recomenda `npx expo install --fix` e `npx expo-doctor`. Fontes: <https://supabase.com/docs/guides/local-development/cli-workflows> e <https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/>.

## Modelos OpenAI diretos

| Modelo | Contexto | Saída máxima | Preço padrão por 1M tokens (entrada/saída) | Indicação |
| --- | ---: | ---: | ---: | --- |
| GPT-5.6 Sol | 1,05M | 128K | US$ 5 / US$ 30 | Arquitetura e tarefas críticas |
| GPT-5.6 Terra | 1,05M | 128K | US$ 2 / US$ 12 | Uso profissional equilibrado |
| GPT-5.6 Luna | 1,05M | 128K | US$ 0,20 / US$ 1,20 | Alto volume e baixa latência/custo |

Os preços e limites foram atualizados a partir do catálogo oficial. Acima de 272K tokens de entrada, a tabela oficial aplica a faixa de contexto longo. Fontes: <https://developers.openai.com/api/docs/models> e <https://developers.openai.com/api/docs/pricing>. Não foi atribuída uma nota de qualidade aos modelos porque esta rodada não executou um benchmark pago e controlado entre provedores.

## Evidência de validação

- 286 arquivos JavaScript passaram na verificação de sintaxe.
- 168/168 testes automatizados passaram.
- 38/38 frases naturais em português passaram.
- 50/50 cenários da matriz de ferramentas passaram.
- Comportamento de agente, checkpoint, undo e nova sessão passou.
- MCP stdio, protocolo 2026-07-28, passou.
- 66 ferramentas nativas registradas por schema.
- Audit npm do Core: 0 vulnerabilidades conhecidas.
- Audit npm de produção do Studio: 0 vulnerabilidades conhecidas.
- Expo Doctor do app mobile: 20/20 verificações aprovadas.

## Limitações honestas

1. O Studio passou em testes de contrato, lógica, segurança e auditoria estática do DOM, mas não houve captura/renderização em Chromium real neste contêiner.
2. A configuração Supabase, migração, RLS e chamadas foram validadas por código/testes; uma stack Docker e um projeto remoto autenticado não foram usados.
3. Não houve operação em contas de produção, envio de email, publicação, domínio ou alteração de banco remoto.
4. O aplicativo Expo não foi compilado nem instalado em Android real nesta rodada.
5. O audit do lockfile mobile ainda reporta 18 vulnerabilidades transitivas: 7 moderadas e 11 altas, concentradas em `image-size`/Metro e `uuid`/Xcode. A correção automática completa oferecida pelo npm exige `--force` e rebaixa para Expo 53, uma mudança incompatível; por isso ela não foi aplicada. Não há alerta crítico.
6. A qualidade e disponibilidade dos modelos externos dependem do provedor, da chave, da quota e da rede. Os testes de protocolo usam fixtures e não consomem créditos reais.

## Conclusão

A versão está tecnicamente pronta para uso local e teste público controlado. Antes de chamar a solução de produção integral, faltam quatro gates externos: renderização visual real, teste Supabase local/remoto, build/instalação Android e deploy autenticado. Esses pontos são de ambiente/operação, não lacunas escondidas na implementação entregue.
