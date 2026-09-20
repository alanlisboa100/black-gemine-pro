# BLACKCORE Native 3.0.0 - Relatório técnico completo

## Resumo executivo

O BLACKCORE Native 3.0.0 evolui a base 2.9.2 para um agente de código multimodelo mais profissional, reproduzível e seguro. A interface continua natural-first: a pessoa descreve o trabalho normalmente, enquanto comandos de barra ficam restritos ao controle de modelo, modo e saída. Pedidos locais permanecem locais e não acionam deploys ou serviços externos sem intenção explícita.

O release mantém 13 modelos configurados em quatro provedores remotos, integração local com Ollama e 55 ferramentas nativas. O modelo escolhido pertence ao usuário: seleção manual desliga roteamento e fallback automáticos; qualquer fallback exige confirmação no momento da falha e nunca substitui silenciosamente a escolha salva.

## Scan orientado por IA

A nova ferramenta `scan` trabalha por etapas para evitar desperdício de contexto:

1. `site_map` coleta a página inicial, metadados, headers, sinais de acessibilidade e rotas do mesmo domínio.
2. A IA interpreta o mapa e escolhe páginas prioritárias, como checkout, conta, painel, documentação ou rotas com problemas.
3. `site_page` coleta detalhes apenas da página escolhida e sugere próximos alvos.
4. `project` classifica hotspots locais por tamanho, densidade de ramificações, TODO/FIXME, linhas longas e padrões sensíveis.
5. `file` divide um arquivo ou intervalo em blocos pontuados, permitindo análise focada antes da correção.
6. Depois da mudança, o agente repete o scan focal e executa testes, build e browser quando disponíveis.

O scan respeita os limites de rede, a política contra endereços privados, o workspace e a autorização de leitura. Ele auxilia análise de código, conteúdo, acessibilidade e arquitetura; não se apresenta como substituto de pentest autenticado.

## Documentos e relatórios

A ferramenta `document` cria entregáveis no idioma da conversa:

- Markdown editável, com título, metadados, sumário e seções.
- HTML independente, responsivo e com tema claro ou BLACKCORE.
- PDF real, impresso por Chromium, com capa, sumário, hierarquia visual e paginação.

O conteúdo inserido no HTML é escapado antes da formatação, impedindo injeção de scripts no relatório. Se Chromium não estiver instalado, a ferramenta informa a dependência ausente e oferece MD/HTML sem fingir que criou um PDF.

## Multimodal e navegador

Imagens PNG, JPEG, WebP e GIF podem ser anexadas por `--image`, `-i` ou `@imagem.png`. O histórico persiste somente caminho, MIME e tamanho; o base64 existe apenas em memória durante a requisição. São aplicados limites de quantidade e bytes, além de bloqueio para caminhos fora do workspace.

O browser agora oferece sessões persistentes com `open`, `snapshot`, `click`, `type`, `key`, `console` e `close`, além de auditoria, DOM e screenshot. A combinação permite testar fluxos reais, encontrar erros de console e validar páginas desktop/mobile quando Chromium está disponível.

## Segurança e controle do modelo

- Modelo e provedor permanecem fixos após escolha manual.
- Um modelo sem visão não é trocado automaticamente ao receber imagem.
- Fallback entre modelos/provedores é opt-in e confirmado na falha real.
- Paths são resolvidos fisicamente antes da autorização, bloqueando escape por symlink.
- Segredos são redigidos de saídas e não entram no ZIP.
- Arquivos `.env`, `.blackcore`, dependências e dados locais são excluídos do release.
- PLAN continua somente leitura; ações mutantes dependem de ACT e da política de permissões.
- Deploy, push e e-mail remoto exigem pedido explícito e confirmação conforme o perfil.

## Instalação e dependências

O instalador usa estágio temporário e só ativa o runtime depois das dependências. A versão anterior fica em `~/.blackcore/runtime.previous` para rollback. Perfis disponíveis:

| Perfil | Conteúdo |
| --- | --- |
| `core` | BLACKCORE, Node.js, Git e ferramentas rápidas de busca |
| `web` | Core mais Chromium e browser interativo/PDF |
| `creator` | Core mais Python, C/C++, CMake, FFmpeg e ImageMagick |
| `android` | Creator mais Java, Gradle, AAPT e assinatura de APK |
| `full` | Web, creator, Android e CLIs opcionais de deploy |

O `package-lock.json` fixa o grafo npm. `playwright-core` é uma dependência opcional para interação avançada com Chromium.

## Modelos disponíveis

- DeepSeek: V4 Flash e V4 Pro.
- Cerebras: GPT OSS 120B e GLM 4.7.
- OpenAI direto: GPT-5.6 Sol, Terra e Luna.
- WaveSpeed: GPT-5.6 Luna, GLM 5.2, MiniMax M3, MiniMax M2.7, Qwen3 Coder e Gemini 3.1 Flash Lite.
- Ollama: catálogo local dinâmico configurado pelo usuário.

Cada família expõe somente níveis de raciocínio compatíveis. A interface técnica permanece em inglês; respostas podem seguir automaticamente português, inglês ou a preferência definida, sem traduzir paths, código, identificadores ou entrada do usuário.

## Verificação executada

- 263 arquivos JavaScript aprovados na verificação sintática.
- 144 de 144 testes automatizados aprovados.
- Matriz de 40 operações críticas de ferramentas aprovada, incluindo scan e documento.
- Corpus de 38 intenções naturais aprovado.
- Fixtures de site, cubo 3D, corações, jogo e fonte Expo/APK validadas.
- Instalação `core` validada pelo ZIP extraído.
- `npm pack --dry-run` aprovado.
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas.
- ZIP, TGZ, SBOM CycloneDX e SHA-256 gerados e conferidos.

O ambiente de validação não possuía um Chromium real. As ações interativas e a geração PDF nativa foram testadas com contratos/stubs executáveis; a verificação visual real deve ocorrer em uma instalação `web` ou `full` com Chromium disponível.

## GitHub e entrega

O trabalho está consolidado na branch local `agent/blackcore-native-3.0`, incluindo as melhorias de scan e documento. A publicação em branch continua bloqueada porque a integração selecionada respondeu HTTP 403 ao criar refs. O código e os artefatos permanecem prontos; a publicação deve ser retomada após conceder permissão de escrita em Contents/branches.

## Instalação completa no Termux

```bash
termux-setup-storage
cd ~/storage/downloads
unzip -o BLACKCORE-NATIVE-3.0.0.zip
cd BLACKCORE-NATIVE-3.0.0
bash INSTALAR-BLACKCORE.sh --profile full
blackcore
```

As chaves devem ser configuradas pelo fluxo `blackcore login <provider>` ou por variáveis de ambiente. Tokens não devem ser enviados por conversa, incluídos em ZIP ou salvos no Git.
