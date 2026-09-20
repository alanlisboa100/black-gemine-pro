# BLACKCORE Native 3.7.20 — Gemini 3.7 Flash + Private Logged-In Browser for Termux

Um agente de programação e criação completo feito para trabalhar direto no Termux e no Linux — conversando do seu jeito, sem transformar cada tarefa numa sequência de comandos difíceis de decorar.

O BLACKCORE é o **Hermes-core** do seu workspace: lê projeto, edita, testa, cria sites, jogos, animações profissionais, faz pesquisa verificada, auditorias completas, analisa perfis públicos, processa mídia e entrega resultados finais verificáveis. A interface foi pensada para celular: cabeçalho e caixa de mensagem fixos; respostas, códigos e ferramentas rolam só no meio.

[Validação completa 3.7.20](VALIDATION-3.7.20.md) · [Navegador privado persistente](docs/VISION_BROWSER.md) · [IA local e memória](docs/LOCAL-AI.md) · [Edição regional 3.7.14](REGIONAL-EDITING-3.7.14.md) · [Consultoria de vídeo 3.7.13](VIDEO-CONSULTATION-3.7.13.md) · [Consultoria de fotos 3.7.12](PHOTO-STUDIO-3.7.12.md) · [Instalação das IAs de foto](docs/PHOTO-AI-INSTALLATION.md) · [Troca de roupa em foto e vídeo 3.7.9](OUTFIT-STUDIO-3.7.9.md) · [Estúdio de vídeo 3.7](VIDEO-STUDIO-3.7.0.md) · [Documentação detalhada em português](README-PTBR.md) · [Mudanças por versão](CHANGELOG.md) · [Segurança](SECURITY.md)

## Edição regional que não vaza

Na 3.7.14, o pedido natural completo chega até o motor de mídia. “Diminuir a luz da janela” é convertido em uma máscara da janela; “brilho só nos olhos” usa duas pequenas seleções. Máscara manual ou semântica, caixas, elipses e polígonos são aceitos em foto. Se nenhuma seleção real existir, a edição para em vez de aplicar um filtro global.

No vídeo, áreas locais usam `regional_edit` com máscara temporal em vídeo ou um endpoint de segmentação/rastreamento configurado. O alvo precisa ser acompanhado quadro a quadro. O áudio, a duração e a velocidade ficam preservados. Uma máscara ausente ou inválida bloqueia o render.

## Editor de fotos profissional por conversa

Na 3.7.12, “analisa esta foto e me mostra o que dá para mudar” abre uma consultoria sem editar o arquivo. O BLACKCORE prioriza problemas medidos, mostra evidências, sugere luz, cor, detalhe, ruído, recorte, texto e marca, oferece estilos e áreas disponíveis, e espera a escolha. Um pedido direto de melhoria continua editando imediatamente. O analisador nunca apresenta pessoa, fundo ou detalhe como disponível quando a máscara necessária não existe.

Anexe ou mencione uma foto e peça naturalmente: “melhora essa foto”, “recupera os detalhes”, “corrige a luz”, “faz um recorte 4:5”, “reduz o ruído”, “coloca meu texto” ou “converte para WebP”. O novo `photo_editor` mede exposição, alcance tonal, dominante de cor, saturação, ruído, nitidez, água/céu, grama/vegetação, morro/montanha e a região de maior interesse visual antes de editar. O resultado é processado localmente com ImageMagick, sem API paga de imagem.

Na 3.7.11, a mesma força pode atuar na foto inteira, somente na pessoa/assunto, somente no fundo, num detalhe descrito ou numa máscara manual. A máscara manual funciona localmente; pessoa/fundo automáticos usam transparência útil, `rembg` opcional ou um segmentador configurado; detalhes por texto exigem segmentação semântica real. O editor mede a mudança dentro da área e o vazamento fora dela, recusando uma seleção falsa. A marca própria de imagem agora diz `AI PHOTO STUDIO`, separada da marca de vídeo.

O visual `blackcore-dark` usa ponto de preto adaptativo, branco protegido, curva sigmoidal, contraste forte, cor cinematográfica e detalhe reforçado. “Dark”, “BLACKCORE”, “forte”, “marcante” e “pretos profundos” escolhem nível alto com esse visual. O enquadramento permanece intacto sem um pedido de recorte.

Na 3.7.9, “troca a roupa nessa foto” usa o próprio `photo_editor` com uma imagem da peça e um backend GPU compatível. O passe generativo trava identidade, pose, proporções, cenário, enquadramento e dimensões; aceita máscara opcional, exporta JPG/PNG/WebP e rejeita uma simples recompressão ou resultado sem mudança visível. É virtual try-on seguro: troca uma peça por outra e não cria nudez.

O recorte nunca acontece escondido: ele só é feito quando o pedido inclui formato ou dimensões, e então acompanha o foco detectado. O original não é sobrescrito. O HUD mostra 14 fases reais, incluindo `EDIT SCOPE` e `MASK EDGE` para identificar a região e conferir a borda, além de `PHOTO IQ`, `FRAME LOCK`, `BLACK LEVEL`, `CINEMA COLOR`, `DETAIL LOCK`, exportação e verificação.

## Estúdio de vídeo profissional por conversa

Na 3.7.13, “analisa este vídeo e me mostra o que pode melhorar” abre uma consultoria sem renderizar. O BLACKCORE apresenta problemas medidos, perfil recomendado, política da música, resolução e mudanças opcionais; também informa se Whisper, estabilização e outros backends estão realmente prontos. A edição só começa depois da escolha. Um pedido direto de edição completa mantém o comportamento imediato.

O BLACKCORE oferece `basic`, `medium` e `high` como três perfis de edição realmente diferentes. Além do corte conjunto de imagem e áudio da 3.7.5, o modo automático agora amostra a imagem e cria um perfil de luz/ambiente para cada cena. Água, céu, grama/vegetação, paisagens de morro/montanha, baixa luz e luz estourada recebem ajustes próprios e suaves de gamma, balanço de cor, contraste, saturação e detalhe. A análise é local, pequena e limitada por duração para continuar estável no telefone. `environmentEnhancement: false` desliga a camada e `environmentStrength` controla a força de 0 a 1. A seleção `audio-or-motion` continua protegendo dança, ação e fala; transições de imagem permanecem pareadas com o áudio e nenhuma velocidade é alterada escondido. O médio usa 720p HD rápido e o teto permanece em 2K.

Durante a edição, o HUD do Termux entra no modo `EDIT`, numera 18 etapas e mostra `SCENE IQ`, `SCENE COLOR`, `RHYTHM MAP`, `MUSIC ID`, `A/V SMART CUT`, `TRANSITION IN/OUT`, `AUDIO CUT/MIX` (ou `AUDIO LOCK` quando pedido), `MOBILE HD`, `EDIT DELTA`, renderização, finalização e verificação. O relógio real do FFmpeg atualiza barra, porcentagem e ETA.

## O que você encontra aqui (playground completo)

- Conversa natural em português ou inglês — peça qualquer coisa do jeito que fala.
- 72 ferramentas nativas com argumentos validados + skills especializadas.
- Cabeçalho e entrada fixos no Termux, inclusive após abrir o teclado ou girar a tela.
- Splash e animações profissionais de nível top: logo progressivo, barra de progresso cyber, pulse de status e spinners com ciclo de cores — otimizados para celular e Termux.
- Atividade de ferramentas curta e legível, sem despejar JSON, HTML ou comandos gigantes no terminal.
- **Criação criativa e interativa**: animações top, partículas, vilas, cubos, mini-jogos, demos generativas — mobile-first, touch + teclado, verificadas localmente com o browser tool.
- Auditorias que viram arquivos reais e podem ser salvas em Downloads.
- Notícias explicadas e verificadas em fontes abertas — os links apoiam a resposta, mas não substituem a notícia.
- Análise de links, alegações e perfis sociais públicos com evidências de identidade, corroboração, risco informacional e padrões comerciais/de engajamento.
- Integrações opcionais com Supabase, Vercel, Netlify, Resend, Expo/EAS e GitHub.
- Sessões, memória do projeto, checkpoints, desfazer, skills, MCP e SDK.
- Trabalho adaptativo: tarefas simples respondem rápido; mudanças exigem evidência; arquitetura/auditoria/release recebem plano, verificação e revisão.
- Modo “brinca / faz algo top / surpreende” tratado como pedido de produto interativo finalizado, não de rascunho.

## Como o BLACKCORE trabalha na 3.6

O padrão é `adaptive`: perguntas e leituras ficam rápidas; mudanças focadas seguem **inspecionar → executar → verificar → reparar se necessário**; pedidos amplos, como “faz tudo”, arquitetura, segurança e release seguem **inspecionar → planejar → executar → verificar → reparar → revisar → aceitar**. Em trabalho profundo, o primeiro write fica bloqueado até existir um plano curto no `todo`. Um teste verde só vale para a revisão atual: qualquer edição posterior invalida aquela evidência e exige nova verificação. Falhas entram em até 3 ciclos de reparo por padrão; sem check disponível ou com bloqueio externo, o resultado fica como **não verificado**, nunca “pronto” por aparência.

Use normalmente em conversa ou, se quiser controlar o rigor:

```text
/work                 mostra o último ciclo e as evidências
/work fast            respostas/leitura rápidas
/work standard        mudança focada com verificação
/work deep            arquitetura, auditoria e revisão final
```

O runtime do agente é próprio. Ele não usa Codex, Pi, Cline, Aider ou OpenCode como motor escondido.

## Instalação no Termux

O caminho mais simples é clonar o projeto:

```bash
pkg update -y
pkg install -y git nodejs-lts
git clone https://github.com/alanlisboa100/BLACKCORE-NATIVE.git
cd BLACKCORE-NATIVE
bash INSTALAR-BLACKCORE.sh --profile core
blackcore
```

Se quiser que o BLACKCORE salve relatórios e projetos na memória compartilhada do Android, execute uma vez:

```bash
termux-setup-storage
```

Também existe um pacote pronto para o Termux. Depois de baixar o ZIP desta versão para `Downloads`:

```bash
pkg install -y unzip
cd ~/storage/downloads
unzip -o BLACKCORE-NATIVE-3.7.18-TERMUX.zip
cd BLACKCORE-NATIVE-3.7.18
bash INSTALAR-BLACKCORE.sh --profile creator --setup-storage
blackcore
```

Para habilitar seleção automática local de pessoa e fundo, ainda no diretório da versão:

```bash
bash scripts/install-photo-ai.sh --mode rembg
```

Detalhes por texto usam um segmentador semântico em computador NVIDIA; veja [a instalação opcional](docs/PHOTO-AI-INSTALLATION.md). Nenhuma dessas instalações altera as chaves existentes do BLACKCORE.

O perfil `core` mantém a instalação leve. Use um perfil maior somente quando precisar:

| Perfil | Indicado para |
|---|---|
| `core` | conversa, código, arquivos, Git e testes comuns |
| `web` | Chromium, sites, responsividade e animações |
| `creator` | mídia, PDF, OCR e processamento de imagens |
| `android` | criação Android, Java, Gradle e ADB |
| `full` | todos os ecossistemas, banco de dados e CLIs de deploy |

Depois da instalação, confira o ambiente com:

```bash
blackcore doctor --full
```

## Não precisa falar como robô

Abra com `blackcore` e escreva normalmente:

```text
Analisa este projeto, corrige o que estiver quebrado e testa tudo.

Cria uma vila animada bonita, responsiva e que funcione por toque.

Faz uma auditoria completa, mostra as limitações e salva o Markdown em Downloads.

Pesquisa as notícias de hoje, confirma em fontes diferentes e me explica o que aconteceu.

Analisa este perfil público do Instagram e separa identidade, alegações, sinais comerciais e o que não deu para confirmar.

Usa o GPT-5.6 Luna no high e melhora esta interface.

Melhora @foto.jpg de forma natural, recupera os detalhes e faz um recorte 4:5 focado no assunto.
```

Os comandos com `/` continuam disponíveis para controles específicos, mas não são o jeito principal de usar o aplicativo.

## Pastas de projetos criadas pela conversa

Quando você abre o BLACKCORE a partir da própria pasta extraída/instalada, da home do Termux ou de `Downloads` e pede um **novo** app, jogo, animação, site ou demo, o BLACKCORE separa o resultado do programa principal. No Termux, ele mantém projetos executáveis em `~/BLACKCORE-Projects/` usando um nome derivado do pedido, por exemplo `animacao-coracao-neon/` ou `finanzen/`. Isso evita limitações do armazenamento compartilhado sobre dependências e executáveis; `Downloads` continua reservado para importar e exportar arquivos.

Só os arquivos do projeto pedido devem entrar nessa pasta. Código-fonte do BLACKCORE, instalador, ZIP de release, caches e metadados internos ficam fora. As próximas mensagens da mesma conversa continuam trabalhando naquela mesma pasta, mesmo quando o pedido seguinte contém palavras como “cria”, “site” ou “aplicativo”. Uma pasta diferente só é iniciada quando você pede explicitamente outro projeto, um projeto separado ou para começar do zero. Se você já abriu o BLACKCORE **dentro de um projeto seu existente**, ele respeita esse projeto e não redireciona nada.

Pedidos de site completo passam por um contrato estrutural: `index.html` sozinho não é aceito como entrega. O resultado precisa ter estilos e comportamento em arquivos ligados, metadados móveis, README e, quando houver framework, comandos de build e teste. A exceção é literal: quando você pedir “só com index”, “somente index”, “arquivo único” ou “single-file”, o BLACKCORE cria e valida um `index.html` autossuficiente, com CSS e JavaScript embutidos quando necessários. Aplicativos comuns nunca podem ser entregues como site/index: precisam concluir uma estrutura instalável de Expo/React Native, Flutter ou Android; PWA só vale quando o pedido disser explicitamente aplicativo web ou PWA. Projetos Supabase precisam incluir migração SQL versionada, RLS por proprietário para SELECT/INSERT/UPDATE/DELETE e nenhum segredo privilegiado no cliente.

O entendimento natural cobre pedidos formais e coloquiais, arquivos de mídia nomeados, restrições, critérios de conclusão e continuações como “continua daí”, “mexe nele” ou “segue de onde parou”. O contexto recente e o projeto ativo resolvem referências curtas sem reiniciar o trabalho. “Quero um site” cria um projeto; “quero analisar/corrigir este site” mantém o projeto atual. A seleção limitada do Google Free Pool prioriza as ferramentas específicas da tarefa — site, Android, SQL/RLS, foto, vídeo, roupa, auditoria, API ou pesquisa — sem ultrapassar 20 ferramentas.

ZIP/TAR não é mais usado como entrega automática. O projeto normal é a pasta criada; compactação só acontece quando você pedir explicitamente algo como “compacta em ZIP”.

## Auditorias que podem ser baixadas

Um pedido de auditoria gera um arquivo Markdown com:

- veredito executivo e escopo analisado;
- impressão digital SHA-256;
- notas por área e por produto;
- dependências, testes e gates executados;
- achados P0, P1, P2 e P3;
- referências de arquivo e linha;
- segurança e possíveis segredos sempre redigidos;
- pontos positivos, limitações e ordem de correção.

No Termux, peça para salvar em Downloads. Se o Android ainda não tiver liberado o armazenamento, o relatório fica na pasta `reports/` do projeto em vez de desaparecer.

## Pesquisa, verificação e HUD

Quando você pede notícias, o BLACKCORE agora abre uma seleção de páginas de veículos diferentes, coleta título, descrição, data e trecho útil, agrupa matérias sobre o mesmo acontecimento e mostra quantas fontes independentes sustentam aquela história. A resposta vem em blocos verticais com:

- o que aconteceu;
- quando aconteceu e quando foi publicado;
- por que isso importa;
- nível de confiança e possíveis divergências;
- fontes de apoio no final.

Ao receber um link público de Instagram, TikTok, X, YouTube, Facebook ou Threads, ele tenta abrir o perfil e pesquisa a presença pública do nome. O relatório separa identidade observável, alegações confirmadas ou não, risco da informação e sinais de conteúdo comercial ou feito para engajamento. Perfil privado, bloqueio de login e falta de selo são tratados como falta de evidência — nunca como prova de fraude.

## A interface fixa

A interface mantém justamente a parte mais delicada no celular:

- topo e compositor vivem fora do histórico da conversa;
- respostas longas e códigos rolam apenas no meio;
- resize limpa a geometria antiga e reconstrói as linhas recentes;
- permissões e o seletor de modelos saem da tela fixa e voltam sem duplicar o cabeçalho;
- cada ferramenta aparece como uma ação numerada e um resultado curto;
- timeout, cancelamento, permissão negada e ferramenta ausente continuam visíveis sem criar um paredão de logs.
- `PgUp/PgDn` sobe e desce uma página; `Ctrl+↑/↓` move uma linha; `Ctrl+Home` vai ao começo retido e `Ctrl+End` volta à resposta ao vivo.
- o cabeçalho mostra a faixa visível e quantas linhas novas chegaram enquanto você lê o histórico.
- parágrafos longos quebram na largura do celular sem perder o final.
- a moldura ciano permanece em volta da conversa, com uma barra vertical proporcional à direita;
- no Termux/Android, o rastreamento SGR de toque/mouse fica desligado por padrão para preservar o toque normal que dá foco ao compositor e abre o teclado virtual.
- `PgUp/PgDn` e `Ctrl+Home/End` permanecem disponíveis sem capturar o toque do Android.
- quem preferir a navegação por gesto pode ativá-la com `BLACKCORE_TERMUX_MOUSE=1 blackcore`; nesse modo, deslizar no painel central e tocar/arrastar a barra direita navegam o histórico e o arraste continua agrupado para não sobrecarregar o telefone.

Exemplo do novo fluxo:

```text
01 $ BASH · iniciar servidor local
01 ✓ concluído · 41ms
02 ◇ BROWSER · testar versão mobile
02 ✓ concluído · 830ms
```

## Validação desta versão

| Verificação | Resultado |
|---|---:|
| Sintaxe JavaScript | 309/309 |
| Testes Node | 236/236 |
| Avaliações contextuais | 254/254 |
| Comandos naturais | 38/38 |
| Matriz de ferramentas | 50/50 |
| HUD, entrada real, toque, barra, história, código e resize | 14/14 |
| Redação de credenciais | aprovado |

Esses números vêm da validação automatizada da versão 3.6.0. O relatório completo está em [VALIDATION-3.6.0.md](VALIDATION-3.6.0.md).

## Limitações, sem maquiagem

- A qualidade da resposta depende do modelo escolhido. O BLACKCORE melhora contexto, ferramentas e continuidade, mas não transforma um modelo fraco num modelo de ponta.
- Ele não traz um modelo de IA embutido. É necessário configurar pelo menos um provedor compatível.
- O teste automatizado da interface reproduz sequências ANSI e dimensões de Termux, mas a checagem final ainda deve ser feita no aparelho real, porque fonte, teclado e versão do Android mudam o comportamento.
- Browser visual completo precisa de Chromium. Sem ele, a análise web usa um modo mais limitado.
- Os perfis `creator`, `android` e `full` ocupam mais espaço e podem demorar bastante para instalar.
- Serviços remotos precisam de conta e credencial próprias. Ações de publicação, envio ou alteração externa continuam pedindo confirmação.
- A interface ajuda a organizar o trabalho, mas não substitui revisão humana antes de publicar algo importante.

## Modelos e credenciais

As chaves ficam em variáveis de ambiente ou no armazenamento privado do BLACKCORE, nunca no repositório. Configure somente o provedor que você pretende usar:

```bash
blackcore login openai
```

Depois escolha o modelo pelo seletor `/models` ou fale naturalmente. A escolha fica fixa; o BLACKCORE não troca de provedor em silêncio. Roteamento e fallback automáticos são opcionais e precisam ser ativados.

## Desenvolvimento

Requer Node.js 20 ou mais recente:

```bash
npm install
npm run verify
npm run eval:natural
```

Antes de enviar uma mudança, leia [CONTRIBUTING.md](CONTRIBUTING.md). Problemas de segurança devem seguir [SECURITY.md](SECURITY.md).

## Licença

Distribuído sob a licença [MIT](LICENSE).
