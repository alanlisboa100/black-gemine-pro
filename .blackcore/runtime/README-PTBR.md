# BLACKCORE Native 3.7.22 — edição regional real de foto e vídeo no Termux

O BLACKCORE continua natural-first: abra com `blackcore` e converse normalmente.

[Edição regional 3.7.14](REGIONAL-EDITING-3.7.14.md) · [Consultoria de vídeo 3.7.13](VIDEO-CONSULTATION-3.7.13.md) · [Acabamento e fundo de fotos 3.7.22](PHOTO-STUDIO-3.7.22.md) · [Consultoria de fotos 3.7.12](PHOTO-STUDIO-3.7.12.md) · [Instalação das IAs de foto](docs/PHOTO-AI-INSTALLATION.md) · [Troca de roupa em foto e vídeo 3.7.9](OUTFIT-STUDIO-3.7.9.md) · [Estúdio de vídeo 3.7](VIDEO-STUDIO-3.7.0.md)

## 3.7.22: acabamentos e fundo de foto

- **7 presets locais:** natural limpo, cinematográfico, BLACKCORE Dark, vintage quente, Social Pop, Mono Noir e Studio neutro.
- **Fundo real:** `remove_background` exporta PNG/WebP transparente; `replace_background` compõe o assunto sobre uma segunda foto.
- **Modelo opcional:** `rembg` usa `u2netp` compacto por padrão e baixa o peso somente no primeiro uso; o modelo pode ser trocado conscientemente.
- **Segurança:** sem rembg instalado, o editor informa a instalação necessária e não finge uma remoção; o original permanece intacto.

## 3.7.21: pacote visual para edição profissional

- **Pacote visual Premium Lite:** inclui 24 sobreposições locais de luz, glow, flare, burst, espiral e gráficos, com licença CC0 na fonte, seleção por preset e duração independente por evento.
- **Zoom de câmera controlado:** `zoomPreset=face-in-out` aproxima e retorna suavemente usando um ponto focal configurável; isso é composição, não reconhecimento facial.

## 3.7.14: pedido local nunca mais vira efeito global

- **Janela:** reduz realces/exposição somente na máscara da janela; pessoa, quarto e sombras ficam fora.
- **Olhos:** duas elipses pequenas e suaves permitem luz e detalhe local sem clarear o rosto inteiro.
- **Outras áreas:** rosto, cabelo, roupa, céu, água, grama, morro, pessoa e fundo seguem o mesmo contrato.
- **Seleção real:** máscara manual/semântica, transparência, `rembg`, caixas, elipses ou polígonos normalizados.
- **Vídeo:** `regional_edit` exige máscara temporal acompanhando o alvo quadro a quadro e preserva áudio, duração e velocidade.
- **Falha segura:** se não houver seleção ou rastreamento, o BLACKCORE para e pede a marcação necessária; não improvisa um filtro na tela inteira.
- **Verificação:** foto mede alteração dentro e vazamento fora; vídeo mede duração e cobertura parcial da máscara temporal.

## 3.7.13: analisa o vídeo e espera sua escolha

- **Sem render escondido:** analisar, diagnosticar ou pedir opções só lê o vídeo.
- **Leitura completa:** duração, cenas, movimento, silêncio, quadros pretos, áudio, picos, BPM, luz e ambiente.
- **Decisão em quatro partes:** perfil, política da música, resolução e mudanças opcionais.
- **Perfis:** básico, médio, alto, música contínua, polimento visual e versão vertical.
- **IAs honestas:** informa modelo de planejamento, inteligência local, Whisper, estabilização, `rembg` foto-only e backends temporais ainda não configurados.
- **Execução aprovada:** só os itens escolhidos entram no render final.

## 3.7.12: analisa, recomenda e espera sua escolha

- **Diagnóstico sem alteração:** pedidos para analisar, diagnosticar ou sugerir melhorias não criam uma foto editada.
- **Problemas medidos:** luz, sombras, realces, contraste, cor, ruído, nitidez, foco e ambiente aparecem em ordem de prioridade, com evidência curta.
- **Menu de decisão:** escolha estilo natural, cinematográfico ou BLACKCORE, força, categorias e área de atuação.
- **Disponibilidade honesta:** foto inteira e máscara manual sempre funcionam; pessoa/fundo precisam de alpha, máscara ou `rembg`; detalhes por texto precisam de máscara ou segmentador real.
- **Continuação natural:** depois da escolha, o BLACKCORE executa só as categorias aprovadas e mantém as demais intactas.
- **Instalador isolado:** `bash scripts/install-photo-ai.sh --mode rembg` habilita pessoa/fundo automáticos no Termux sem tocar nas chaves.

## 3.7.11: escolha exatamente onde editar

- **Foto inteira:** `editScope=full` aplica o tratamento completo aprovado na 3.7.10.
- **Pessoa/assunto:** `editScope=subject` trata só o primeiro plano selecionado.
- **Fundo:** `editScope=background` mantém a pessoa e atua apenas no cenário.
- **Detalhe:** `editScope=detail` usa `regionPrompt` para selecionar algo como olhos, cabelo, roupa, água, céu ou grama quando um segmentador semântico está configurado.
- **Máscara manual:** `editScope=mask` usa uma imagem preto e branco; branco recebe a edição, preto fica preservado.
- **Verificação regional:** a saída só passa se houver mudança visível dentro da área e vazamento mínimo fora dela.
- **Marca correta:** o editor de foto usa `BLACKCORE // AI PHOTO STUDIO`; o editor de vídeo mantém sua própria marca.
- **HUD de 14 etapas:** `EDIT SCOPE` mostra o alvo e `MASK EDGE` mostra origem, cobertura e acabamento da máscara.

## 3.7.10: tratamento dark forte e marcante

- **Pretos e sombras:** ponto de preto adaptativo e curva sigmoidal aprofundam as áreas escuras sem apenas baixar o brilho da imagem inteira.
- **Luzes separadas:** ponto de branco e gamma reagem ao risco de estouro para destacar luzes mantendo textura.
- **Cor cinematográfica:** os estilos `natural`, `cinematic` e `blackcore-dark` agora possuem intensidades reais; o visual BLACKCORE usa cor mais intensa e separação fria controlada.
- **Detalhe protegido:** nitidez e textura de rosto, cabelo e roupa são reforçadas, e o arquivo é rejeitado se a análise detectar perda excessiva de detalhe.
- **Três forças verificadas:** básico, médio e alto usam pontos de preto, curvas, saturação e limites mínimos de diferença crescentes.
- **Enquadramento travado:** melhoria visual não recorta nem muda dimensões; isso só acontece quando solicitado.
- **HUD:** `FRAME LOCK`, `BLACK LEVEL`, `CINEMA COLOR` e `DETAIL LOCK` mostram exatamente onde o editor está trabalhando.

## 3.7.9: figurino profissional também no editor de imagem

O `photo_editor` agora recebe pedidos naturais de troca de roupa. Com a foto da pessoa, a referência da peça e um backend GPU compatível, ele pede máscara exclusiva da roupa, preserva rosto, identidade, pose, corpo, fundo, enquadramento e dimensões, e exporta JPG, PNG ou WebP. A comparação final mede mudança real de pixels e recusa imagem idêntica ou apenas recomprimida. O original continua protegido. O modo é seguro: substitui roupa mantendo a pessoa vestida e recusa nudificação.

## 3.7.8: troca de roupa real em vídeo

O `outfit_editor` recebe o vídeo da pessoa e uma foto da roupa, envia o trabalho para um backend GPU configurado e devolve MP4 H.264/AAC para telefone. Ele pede máscara e rastreamento temporal, preserva identidade, cenário, velocidade, duração e a música original. Se o resultado voltar igual, só com logo ou sem mudança visual comprovável, a saída é rejeitada.

O Termux não baixa pesos pesados escondido. O modelo roda num computador/servidor GPU compatível e o celular continua leve. Envio remoto exige autorização explícita. A função é para substituir roupa e virtual try-on; não remove roupa para revelar nudez.

## 3.7.7: editor de fotos profissional e natural

- **Pedido natural:** “melhora essa foto” usa `auto_edit`; pedidos específicos acionam recorte, redimensionamento, luz, cor, detalhes, redução de ruído, desfoque, texto, marca d’água, conversão ou compressão.
- **PHOTO IQ real:** antes de editar, mede exposição, contraste, alcance tonal, dominante de cor, saturação, ruído, nitidez e foco visual.
- **Ambiente contextual:** água, céu, verde/grama, vegetação, morro/montanha, baixa luz e luz estourada recebem ajustes próprios, suaves e limitados.
- **Recorte sob pedido:** não corta uma foto apenas porque foi pedido “melhore”. Quando o usuário pede 1:1, 4:5, 9:16, 16:9, 4:3 ou dimensões específicas, o quadro acompanha a região visual de maior interesse.
- **Ferramentas completas:** suporta JPG/JPEG, PNG, WebP, AVIF, HEIC/HEIF, TIFF, BMP e primeiro quadro de GIF quando o ImageMagick instalado possui o respectivo codec.
- **Original protegido:** sempre cria outro arquivo e recusa sobrescrever a entrada.
- **Sem edição falsa:** `QUALITY CHECK` compara metadados e pixels; `auto_edit` rejeita um render que não produziu alteração mensurável.
- **HUD de 12 fases:** `SOURCE`, `PHOTO IQ`, `COMPOSITION`, `LIGHT`, `COLOR`, `DENOISE`, `DETAIL`, `SMART CROP`, `TEXT`, `WATERMARK`, `EXPORT` e `QUALITY CHECK`.
- **Processamento local:** a IA com visão entende o pedido; ImageMagick executa a edição no telefone, sem serviço pago de imagem.
- **Relatório final limpo:** mostra somente as alterações executadas e o caminho da foto pronta.

## 3.7.6: luz e cor inteligentes por ambiente

- **Análise por cena:** quadros pequenos são amostrados localmente para medir luz média, sombras, realces estourados, cor predominante, posição do azul/verde e textura.
- **Água e céu:** recebe recuperação/valorização controlada de azul, contraste e saturação, sem tingir toda a imagem de azul.
- **Grama e vegetação:** recebe verde moderado e detalhe suave, preservando tons de pele e evitando o verde artificial.
- **Morro e montanha:** paisagens terrosas ou verdes com textura ganham microcontraste e nitidez limitada.
- **Baixa luz:** gamma e brilho são recuperados suavemente; luz estourada recebe contenção leve.
- **Termux leve:** não foi adicionado framework pesado de visão. A quantidade de amostras é limitada automaticamente pela duração do vídeo e pelo nível básico/médio/alto.
- **Controle:** `environmentEnhancement: false` desliga a camada; `environmentStrength: 0..1` ajusta a força.
- **Relatório fiel:** o final informa quantas cenas de água, céu, grama, vegetação, paisagem, baixa luz ou luz forte realmente receberam tratamento.
- O HUD ganhou a etapa `SCENE COLOR` e passou a 18 fases, mantendo `A/V SMART CUT`, `AUDIO CUT/MIX` e `EDIT DELTA`.

## 3.7.5: edição conjunta de imagem e música

- **Corte coerente por padrão:** imagem e áudio são recortados no mesmo ponto e continuam sincronizados; a reprodução nunca é acelerada escondido.
- **Cenas sempre em ordem:** o editor não puxa mais imagens aleatórias de outro trecho para cobrir a música. Isso elimina a montagem “embolada” da versão anterior.
- **Atividade inteligente:** `audio-or-motion` preserva dança, ação ou fala e só remove um intervalo quando som e imagem estão inativos juntos. Os modos `audio`, `motion`, `audio-and-motion` e `scene` continuam disponíveis para pedidos específicos.
- **Transição completa:** cada `xfade` de imagem recebe `acrossfade` de áudio com a mesma duração. Cortes de cena, batidas, movimento e estilo musical controlam ponto, efeito e intensidade.
- **Música travada só quando pedida:** “não altere a música” ativa `preserveSourceAudio`; nesse caso, a trilha fica contínua e a imagem continua cronológica. O recorte visual experimental virou opção explícita, não padrão.
- **Sem entrega de apenas logo:** `EDIT DELTA` mede os pontos realmente editados e rejeita uma edição conjunta que permaneça visualmente igual.
- **HUD mais claro:** `A/V SMART CUT` mostra o recorte de imagem/som e `AUDIO CUT/MIX` mostra a montagem do áudio; `AUDIO LOCK` aparece somente quando a trava foi pedida.
- A qualidade de imagem aprovada, os níveis básico/médio/alto, o MP4 móvel, 720p padrão, teto de 2K e a marca BLACKCORE foram mantidos.

## 3.7.4: edição visual real com música preservada

- **Recorte visual independente:** a trilha original continua inteira, mas a imagem deixa de repetir a mesma montagem. O BLACKCORE cria uma EDL visual com inserções de melhores momentos e punch-ins sincronizados.
- **Entrada e saída controladas:** cada inserção recebe uma entrada escolhida pelo ritmo/contexto e uma saída natural, usando handles de imagem para não encurtar a música.
- **Sem aceleração escondida:** o recorte não altera a velocidade da trilha nem cria speed ramp automático. Reverso continua opcional e somente visual.
- **Bloqueio contra “só a logo”:** a fase `EDIT DELTA` compara amostras do original e do render sem contar a área da marca. Se o resultado continuar parecido demais, o arquivo é rejeitado em vez de ser apresentado como edição concluída.
- **Três intensidades reais:** básico usa poucos recortes conservadores; médio distribui recortes ao longo das frases; alto aumenta seleção de destaques e efeitos, mantendo limites para celular.
- **Relatório fiel:** ao terminar, ele informa a quantidade real de recortes, inserções, punch-ins e transições aplicadas, além do caminho do MP4.
- O HUD agora mostra 17 fases claras, incluindo `VISUAL RECUT`, `TRANSITION IN/OUT`, `AUDIO LOCK`, `MOBILE HD` e `EDIT DELTA`.

## 3.7.3: transições inteligentes sem quebrar a música

- **Áudio travado por padrão:** se a música já está dentro do vídeo, o BLACKCORE edita somente a imagem. A faixa continua inteira, na velocidade original, sem cortes, crossfades ou remasterização.
- **Transições com contexto:** mudanças de cena, movimento, batidas, picos e BPM escolhem poucos pontos fortes. Cenas movimentadas de dança são preservadas e não recebem zoom artificial.
- **Entrada e saída suaves:** dissolve com easing vira a base natural. Coração, explosiva, zoom e círculo ficam reservados para picos adequados; reverso visual curto é opcional e nunca inverte a música.
- **Ritmo musical:** `funk`, `pagode`, `sertanejo` e `pop` podem ser informados pelo usuário. No modo automático, o resultado é marcado como estimativa e, com baixa confiança, usa ritmo neutro.
- **Celular primeiro:** o padrão é 720p HD, Lanczos, preset rápido e bitrate controlado. O teto é 2K até o usuário pedir outra configuração.
- O HUD passou a mostrar fases claras para inteligência de cena, ritmo, transições, áudio, HD móvel, renderização e verificação.

## 3.7.2: três níveis reais de edição

- **Básico:** limpeza conservadora, cor natural, áudio controlado e assinatura discreta, preservando o conteúdo.
- **Médio:** edição visual balanceada, transições esparsas, tratamento `studio`, música preservada e movimento sutil apenas em cenas calmas.
- **Alto/profissional:** seleção mais profunda de cenas e picos, transições profissionais controladas, movimento cinematográfico protegido, grade reforçado e marca-d’água BLACKCORE.
- Pedidos como “bem editado”, “edição top”, “profissional” ou “capricha” escolhem o nível alto. “Modo médio” e “edição básica” escolhem exatamente o nível pedido.
- O HUD registra cada etapa com barra, porcentagem e ETA, sem despejar os logs do render na conversa.
- O bitrate é limitado a partir da fonte para evitar que o modo médio apenas dobre o tamanho sem ganho perceptível. Renderizações no celular podem durar até quatro horas sem a antiga interrupção de 30 minutos.

## 3.7.1: progresso profissional durante a edição

- O HUD ganha um modo `EDIT` animado e mostra cada etapa real: `LOADING`, `BLACK FRAMES`, `SILENCE`, `SCENES`, `CUTTING`, `RHYTHM`, `MIXING`, `CAPTIONS`, `RENDERING` e `VERIFYING`.
- A etapa de renderização lê o relógio de progresso do FFmpeg e exibe barra, porcentagem e ETA, atualizados no cabeçalho fixo sem despejar logs na conversa.
- O cronômetro não reinicia a cada atualização de porcentagem, o compositor continua aceitando mensagens e `Ctrl+C` mantém o cancelamento do processo inteiro.

## 3.7.0: edição profissional por conversa

Fale como falaria com um editor: “analisa meu vídeo, tira pausas, entende a música, corta nas batidas, coloca transições naturais, melhora cor e áudio e entrega em 9:16”. O BLACKCORE agora mede cenas, silêncios, quadros pretos, loudness, picos, batidas e BPM; monta a timeline; sincroniza a trilha; abaixa a música durante a voz; limpa e masteriza o áudio; reenquadra; estabiliza; colore; gera/queima legendas e valida o arquivo final.

- `auto_edit` faz o passe completo; `analyze` expõe a leitura técnica; `smart_cut` limpa a timeline; `montage` une vários clipes com transições.
- O Google Free Pool/Gemini/Gemma disponível no agente pode tomar as decisões criativas sem mudar para provedor pago. A renderização permanece local com FFmpeg.
- Whisper e whisper.cpp são aceitos como legendadores locais gratuitos quando já instalados; modelos grandes não são baixados silenciosamente pelo BLACKCORE.
- Depois da edição, a resposta mostra somente o que mudou dentro do vídeo e o caminho real do resultado.

## Correção Termux: toque no compositor e teclado Android

- No Termux/Android, o rastreamento SGR de mouse/toque fica **desligado por padrão**. Assim, o BLACKCORE não captura o toque antes de o Termux poder usá-lo para focar a entrada e abrir o teclado virtual.
- `PgUp/PgDn` e `Ctrl+Home/End` continuam disponíveis normalmente.
- Quem preferir os gestos de deslizar/arrastar pode reativá-los explicitamente com `BLACKCORE_TERMUX_MOUSE=1 blackcore`.
- Em Linux/macOS fora do Termux, o comportamento anterior de ponteiro permanece inalterado.

## 3.6.0: trabalha como agente, entrega com evidência

- **Memória automática por projeto:** o BLACKCORE guarda fora do código do usuário um histórico redigido de objetivos, tentativas, bloqueios, arquivos alterados e resultados verificados. Em tarefas futuras ele recupera primeiro o que for mais relevante, sem substituir instruções novas nem evidência atual do repositório.
- **Orçamento compartilhado da tarefa:** coordenador + planner/programmer/tester/reviewer usam o mesmo limite de tokens/custo estimado. O padrão é uma trava de segurança generosa (1,8M tokens cumulativos e ~US$2 em modelos com preço conhecido), com aviso a 80%. Use `/budget` para consultar ou ajustar.
- **Checkpoint de tarefa inteira:** alterações feitas pelos subagentes entram no mesmo checkpoint do pedido principal. `/undo` volta o conjunto completo e `/redo` reaplica a mesma revisão.
- `/memory-history` mostra o histórico automático do projeto; ele fica no estado privado do BLACKCORE e não é despejado na pasta do aplicativo/site/animação criada.
- O padrão `adaptive` escolhe automaticamente trabalho rápido, padrão ou profundo: não desperdiça etapas em uma pergunta simples, mas aumenta o rigor quando há código para mudar.
- Depois de editar, o agente não pode encerrar como se estivesse tudo pronto sem uma evidência de teste, build, lint, typecheck, execução local ou verificação visual adequada.
- Em arquitetura, segurança, auditoria completa, release e pedidos amplos, depois do check vem uma revisão real do diff ou dos arquivos alterados.
- Resultado interno `ok: false` agora aparece como falha, mesmo que a ferramenta tenha terminado sem lançar exceção. Sem comandos de check detectáveis, a entrega é marcada como não verificada.
- `/work` mostra o ciclo atual/anterior. `/work fast|standard|deep` permite escolher o rigor sem precisar aprender outros comandos.
- `AGENTS.override.md` ganha precedência sobre `AGENTS.md` no mesmo diretório; o inicializador de projeto já cria regras curtas para testes e revisão.
- O HUD apresenta `SCAN`, `PLAN`, `BUILD`, `CHECK`, `REVIEW` e `REPORT` em vez de textos técnicos longos, mantendo o cabeçalho e a entrada fixos.

## 3.5.8: barra e gesto funcionando sem misturar textos antigos

- O rastreamento por toque voltou a ser ativado depois do isolamento definitivo do `readline` feito na 3.5.7.
- Deslizar em qualquer lugar do painel central sobe e desce o histórico interno; não é mais necessário acertar exatamente a barra fina.
- Tocar ou arrastar a barra direita salta para a posição proporcional, e o bloco ciano acompanha a janela visível.
- Enquanto o gesto está ativo, o Termux não executa seu scrollback externo, evitando mostrar linhas antigas abaixo do compositor.
- Movimento contínuo é agrupado a cada 24 ms para evitar dezenas de redesenhos concorrentes e travamento no telefone.
- Eventos fora da área central — inclusive coordenadas associadas ao teclado Android — são descartados; caracteres normais continuam chegando uma única vez.
- Se um aparelho específico não tratar bem gestos, `BLACKCORE_TERMUX_MOUSE=0 blackcore` mantém somente `PgUp/PgDn` e `Ctrl+Home/End`.

## 3.5.7: isolamento definitivo do teclado

- A interface `readline` antiga é desconectada do `keypress` enquanto o HUD controla o `stdin`; ela não pode mais imprimir coordenadas, prompts `>` ou uma segunda cópia da digitação no painel central.
- O listener original é restaurado somente quando o HUD fecha ou suspende para uma confirmação/menu.
- O Termux recebe uma sequência explícita de `mouse off` antes do HUD iniciar, limpando inclusive rastreamento deixado por uma execução anterior.
- Mouse SGR fica desligado por padrão no Android. A barra continua indicando posição e o histórico navega por `PgUp/PgDn` e `Ctrl+Home/End`.
- Para um mouse físico, o modo continua opcional com `BLACKCORE_TERMUX_MOUSE=1 blackcore`.
- O novo teste de integração usa o `InputController` e o `readline` reais e confirma que nenhuma coordenada chega à tela ou à fila.

## 3.5.6: correção da entrada no Termux

- O teclado e o mouse agora passam por fluxos separados. Sequências SGR fragmentadas como `65;52;25M` nunca mais entram na mensagem como números.
- O filtro guarda prefixos incompletos até o restante do gesto chegar, aceita vários eventos no mesmo pacote e entrega somente teclas reais ao compositor.
- Texto normal é processado exatamente uma vez, eliminando repetição durante a digitação.
- Ao enviar, a caixa é limpa antes de a cópia única da mensagem ser desenhada no histórico, removendo a duplicação visual transitória.
- Regressões novas reproduzem os pacotes quebrados observados na captura do aparelho.

## 3.5.5: interface da referência e auditoria de capacidade

- O topo agora imita a organização da referência enviada: marca BLACKCORE espaçada, `// NATIVE`, modelo/provedor/raciocínio, separador técnico e estado vivo em uma moldura ciano.
- Toda resposta, código e ferramenta permanece dentro de um painel central com bordas laterais fixas.
- A coluna direita mostra setas, trilho e um marcador proporcional que acompanha a posição real do histórico.
- Além de `PgUp/PgDn` e atalhos com setas, a área aceita roda, clique/toque no trilho e arraste quando o Termux fornece eventos SGR de mouse.
- Em altura reduzida pelo teclado Android, a interface troca automaticamente para o HUD compacto para não esmagar a conversa.
- O compositor ganhou quatro linhas no modo normal, entrada escura, estado LIVE e ajuda de navegação sem esconder a mensagem digitada.
- Uma auditoria comparativa com a documentação oficial do Codex separa paridade local, recursos próprios e lacunas de plataforma sem prometer equivalência falsa.

## 3.5.4: notícias de verdade, links investigados e rolagem

- Pedidos de notícias usam um fluxo próprio: duas buscas focadas, abertura limitada de veículos diferentes, extração de data/resumo/texto e agrupamento de matérias sobre o mesmo acontecimento.
- A resposta não é mais uma tabela de URLs. Cada notícia explica o que aconteceu, quando, por que importa, o nível de confiança e quais fontes independentes sustentam o resumo.
- Links públicos de Instagram, TikTok, X, YouTube, Facebook e Threads podem ser investigados. O BLACKCORE tenta abrir o perfil e pesquisa identidade pública, corroboração das alegações, menções em verificadores e sinais comerciais ou de busca por engajamento.
- A análise mede a evidência e o risco da informação, não o caráter da pessoa. Perfil privado, bloqueio de login, poucos seguidores ou falta de selo nunca viram prova automática de fraude.
- Páginas grandes deixam de falhar com `response too large`: o início útil é coletado até um limite seguro e o relatório informa que houve corte.
- O histórico central agora sobe e desce sem mover o topo ou a entrada: `PgUp/PgDn` por página, `Ctrl+↑/↓` por linha, `Ctrl+Home` para o começo e `Ctrl+End` para voltar ao conteúdo ao vivo.
- Enquanto você lê acima, o cabeçalho mostra a faixa atual e quantas linhas novas chegaram. Textos longos quebram na largura da tela sem perder a conclusão.

## 3.5.3: cabeçalho bonito e ferramentas organizadas

- A interface fixa agora usa uma tela isolada. Abrir o teclado, girar o aparelho, responder permissões ou entrar no seletor de modelos não deixa cópias antigas do cabeçalho misturadas à conversa.
- No resize, o BLACKCORE limpa a geometria antiga e reconstrói as linhas recentes no centro; topo e entrada continuam em seus lugares.
- A marca superior virou `◆ B L A C K C O R E // NATIVE`. Abaixo dela ficam apenas modelo/provedor/raciocínio, atividade atual e READY/modo/ferramentas/fila.
- O gráfico rosa foi removido e a animação do estado ficou discreta, reduzindo repaint e poluição visual.
- Ferramentas agora aparecem em pares numerados e legíveis: `01 BASH · start local server` e `01 ✓ complete · 41ms`. JSON de argumentos, comandos duplicados, HTML bruto e respostas enormes não são mais despejados na tela normal.
- Timeout, permissão negada, ferramenta ausente e código de saída diferente de zero continuam visíveis em uma frase curta. O resultado completo continua disponível internamente para o agente raciocinar e produzir o resumo final.

## 3.5.2: cabeçalho e entrada realmente fixos

- O terminal agora tem três regiões: cabeçalho fixo nas quatro primeiras linhas, respostas/códigos/ferramentas rolando somente no centro e caixa de mensagem fixa nas três últimas linhas.
- A estrutura funciona no Termux a partir de 30 colunas e 14 linhas. Ao abrir o teclado, girar o telefone ou redimensionar a janela, todos os limites são recalculados sem apagar o modelo selecionado nem a mensagem digitada.
- O cabeçalho ficou mais limpo e bonito: versão, modelo, provedor, fase animada, modo, prontidão e fila ficam visíveis; chaves, caminhos absolutos e detalhes de transporte continuam ocultos.
- Confirmações, seletor de modelo, editor externo e `/clear` suspendem/restauram o viewport corretamente.
- O laboratório visual ganhou uma vila animada com ciclo dia/noite, sete casas, nuvens em paralaxe, árvores, viajante e vaga-lumes, além dos testes já existentes de cubo 3D, partículas, código, jogo, FPS e movimento reduzido.

## 3.5.1: ferramentas destravadas no Termux

- Timeout e cancelamento agora encerram a árvore inteira do comando (`bash`, Chromium e demais processos filhos), com escalonamento seguro para `SIGKILL` quando necessário.
- Ao cancelar, o painel de ferramentas para imediatamente, chamadas ainda não iniciadas são puladas e o agente não entra em `replanning` depois do cancelamento.
- Enquanto o BLACKCORE trabalha, digitar `/cancel`, `cancelar`, `cancela`, `pare`, `parar` ou `stop` cancela na hora em vez de colocar a frase na fila. `Ctrl+C` continua funcionando.
- O Chromium ganhou execução limitada a 45 segundos e não repete qualquer falha de forma genérica. Sem Playwright, abrir, capturar snapshot e testar larguras usa um modo estático automático, sem o ciclo de erro mostrado no Termux.

## 3.5: auditoria completa que vira arquivo

- Peça naturalmente “faça uma auditoria completa deste projeto e deixe para baixar”. O novo `audit_report` cria um Markdown real, não apenas uma resposta no terminal.
- O relatório reúne resumo executivo, escopo e hash, notas de segurança/qualidade/manutenção/prontidão, gates, dependências, estado Git, achados P0–P3, referências por arquivo/linha, pontos positivos, histórico da sessão, limitações e ordem de correção.
- No Termux, pedidos para baixar usam `~/storage/downloads` quando o armazenamento compartilhado está disponível; caso contrário, o arquivo fica em `reports/` no projeto.
- Valores de possíveis segredos são redigidos. O relatório guarda somente tipo, arquivo e linha para revisão.
- Configurações do projeto não podem mais rebaixar permissões globais, injetar provedores/MCP/hooks ou habilitar ações remotas.
- MCP agora exige confiança global explícita, limita o ambiente herdado por processos stdio, aplica a política de rede/redirects ao HTTP e confirma ferramentas com possível escrita externa.
- Foram endurecidos comandos destrutivos `rm`, IPv4 mapeado em IPv6, saída Git com cor forçada, `blackcore --help` e o código de saída do `doctor`.

## 3.4: compreensão contextual e recuperação

- Cada turno recebe um mapa local de objetivo provável, alvos, restrições, critério de pronto, autonomia e ambiguidades sem alterar o texto original do usuário.
- Frases como “melhora isso”, “faz o mesmo” e “continua” usam o foco recente. Se não houver antecedente e a escolha for material, o agente inspeciona em modo somente leitura ou faz uma única pergunta curta antes de alterar.
- Quando você diz “você decide”, “fica a seu critério” ou equivalente, o BLACKCORE escolhe uma alternativa reversível em vez de perguntar detalhes cosméticos.
- Um ledger de continuidade mantém objetivo, alvos, restrições, critérios de conclusão, pendências e último resultado mesmo após compactação do chat.
- Falhas de ferramenta geram estado explícito de recuperação: causa classificada, hipótese nova, mudança de abordagem e bloqueio de tentativas idênticas.
- Inicialização refeita com núcleo animado, provedor/modelo/modo/ferramentas reais e painel de primeiro acesso mais claro e privado.
- Novo benchmark local: 254 casos contextuais/adversariais, além do corpus coloquial existente de 38 controles.

## 3.3: Studio, Supabase completo e respostas legíveis

- Novo `examples/blackcore-studio`: PWA offline-first para código, resumos, pesquisa, notas por produto e sincronização Supabase opcional.
- O terminal agora preserva respostas Markdown multilinha e renderiza blocos de código numerados, tabelas, tarefas, fontes e seções de resumo/pesquisa em 54 colunas.
- Nova `web_research`: executa consultas focadas, deduplica URLs e mostra domínio, tipo de fonte, snippet e cobertura sem fingir que resultado de busca já é conclusão.
- Supabase passa de 5 para 19 ações: stack local, link, migrations, reset/push, lint/testes, geração de tipos, Edge Functions e secrets por arquivo.
- Operações remotas e destrutivas continuam confirmadas; valores de secrets nunca entram como argumentos visíveis ao modelo.
- Fixture Android atualizada para Expo SDK 57, React 19.2 e React Native 0.86, com lockfile e Expo Doctor 20/20.
- Preços diretos de Terra e Luna atualizados conforme o catálogo oficial OpenAI de agosto de 2026.

## 3.2: permissões verificáveis e criação multiplataforma

- Novo `blackcore permissions`: mostra leitura/escrita do projeto, armazenamento compartilhado, pastas Android, Termux:API, perfil de segurança e ações necessárias.
- `blackcore doctor --full` agora inclui permissões, grupos de dependências, perfil instalado e tamanho real do runtime.
- O instalador aceita `--setup-storage`, mas nunca finge conceder uma permissão que depende da tela de autorização do Android.
- Detecção e verificação nativas para site HTML sem framework, Flutter e PHP/Composer, além de Node.js, Python, Rust, Go e Android.
- Fluxos Python respeitam `uv`, Poetry e Pipenv; Flutter inclui análise, testes e APK de debug.
- O laboratório visual ganhou cubo 3D arrastável, teclado/toque, stream de atividade, medição de frames, redução de movimento, corações e jogo.

## 3.1: ferramentas profissionais completas

- 72 ferramentas nativas validadas por schema na versão atual, mantendo conversa natural e o modelo escolhido travado.
- Inteligência de código, OCR/leitura de documentos, mídia, segurança, API lab, ADB, PostgreSQL, containers e índice local privado.
- Medição real de frames de animação e auditoria responsiva em várias larguras no Chromium.
- Perfis Termux expandidos sem transformar dependências pesadas em requisito do modo básico.

## 3.0: visão, browser interativo e instalação profissional

- Imagens reais por `--image`, `-i` ou menção `@imagem.png`, sem salvar base64 no histórico.
- O modelo escolhido continua travado. Se ele não tiver visão, o BLACKCORE avisa em vez de trocar sozinho.
- Browser com sessão, clique, digitação, teclas, snapshot e coleta do console.
- Scan em etapas para site, projeto e trechos de arquivo: a IA escolhe os hotspots e pede somente a próxima coleta necessária.
- Criação nativa de relatório em Markdown, HTML profissional ou PDF, seguindo o idioma da conversa.
- Proteção contra atalhos simbólicos que tentem escapar da pasta do projeto.
- Perfis `core`, `web`, `creator`, `android` e `full`, instalação em estágio e cópia de rollback.
- Lockfile, CI ampliado, ZIP/TGZ, checksums e SBOM de release.

## 2.9.2: laboratório prático para testar criação

- Novo `examples/creative-lab`: site sem dependência com cubo 3D em Canvas, animação interativa de corações e jogo que responde a teclado, mouse e toque.
- Novo `examples/creative-lab-mobile`: projeto fonte Expo/EAS para APK Android, com cubo nativo, corações e jogo de toque. Não contém chave; a geração do APK exige um ambiente Android/Expo disponível.
- Testes de regressão validam estrutura, acessibilidade, entradas, sintaxe, perfil APK e ausência de segredos nos exemplos.

## 2.9.1: a tarefa flui sem inventar deploy

- Pedido normal é local por padrão. “Testa a animação desse jogo” libera arquivos, build, testes, servidor local e browser audit; não libera Vercel, Netlify, Supabase, Resend, Expo/EAS ou GitHub remoto.
- Deploy só entra quando você pedir claramente para publicar, dar push, fazer deploy ou usar aquele serviço. Ter arquivo de configuração no projeto não é autorização.
- Mesmo se a IA inventar uma chamada remota, o executor bloqueia enquanto a tarefa for local.
- A barra `/` agora mostra apenas `/models`, `/plan`, `/act` e `/quit`. O resto é conversa normal, igual agente de código moderno.

## 2.9.0: sua escolha de modelo não pula

- Escolher modelo por conversa, `/models`, `--provider/--model`, SDK ou JSON-RPC agora trava o par provedor/modelo, desliga auto-route e desliga fallback para os próximos turnos.
- Mesmo com `/autofallback on`, o BLACKCORE não troca em silêncio: em uma falha real ele mostra a causa e pede aprovação. Se você aceitar, o fallback vale só naquele turno; o modelo escolhido continua sendo o padrão depois.
- Configurações antigas migram uma vez para a política segura. Chave inválida, limite, quota ou indisponibilidade aparecem como erro; não passam a cobrar outro provedor sem você autorizar.
- Novo `/review`: painel Git com arquivos alterados, linhas, não rastreados e `git diff --check`. Use `/review full` para uma prévia colorida e limitada do patch.
- Novo `/worktree`: lista, cria e remove áreas Git isoladas. Criar/remover pede confirmação fora de `yolo` e segue o limite da pasta de trabalho.

## 2.8.1: painel e animação fluida

- Painel de controle seguro: provedor, transporte, modelo, nível de raciocínio, modo, projeto e quantidade de ferramentas, sem mostrar chave ou prefixo de chave.
- Novo `/status` para consultar sessão e estado da credencial: `KEY SET` significa chave configurada; não finge que uma chamada remota já foi validada.
- Rodapé do composer agora prioriza estado, modelo, modo e nome do projeto em vez de cortar um caminho absoluto gigante.
- Durante uma tarefa, a animação atualiza só a linha de status a 8 FPS. A caixa de mensagem inteira só redesenha ao digitar ou redimensionar, reduzindo flicker no Termux.

## 2.8.0: interface e modelos diretos

- A interface técnica agora usa inglês por padrão. A conversa continua aceitando português normalmente.
- A entrada do usuário não é traduzida automaticamente: caminhos, nomes de arquivo, código, IDs e textos entre aspas ficam intactos.
- A resposta pode ficar em `auto`, `en` ou `pt-BR` com `/language`.
- OpenAI direto via `OPENAI_API_KEY`: GPT-5.6 Sol, Terra e Luna pela Responses API.
- Cada modelo direto tem os níveis `none`, `low`, `medium`, `high`, `xhigh` e `max`.
- `browser audit` verifica título, `lang`, viewport, marcos semânticos, `h1`, `alt` e evidência de rótulos em controles renderizados.
- O prompt `/prompt web-game-qa` cobre site, app interativo e jogo web com build, testes, servidor local, auditoria desktop/mobile e cuidado com teclado/mouse/toque.

## Interface do terminal

A entrada foi refeita. O prompt seco `you ›` não é mais o compositor principal. Agora existe uma caixa de mensagem própria com:

- cursor dentro da caixa;
- histórico com ↑/↓;
- sugestões ao digitar `/`;
- rodapé compacto com modelo, esforço, modo e pasta;
- truncamento seguro em Termux estreito;
- visual inspirado em coding agents modernos sem copiar o Pi/Codex.

## `/models`

O seletor agora é hierárquico:

1. **Provedor** — OpenAI, DeepSeek ou Google AI Studio.
2. **Modelo** — só aparecem os modelos daquele provedor.
3. **Raciocínio** — só aparecem os níveis que realmente fazem sentido para o modelo escolhido.

Exemplos:

- DeepSeek → V4 Flash / V4 Pro → Off / High / Max
- OpenAI → GPT-5.6 Sol / Terra / Luna → None / Low / Medium / High / XHigh / Max
- Google AI Studio → catálogo gratuito curado + Google Free Pool → até quatro slots `GEMINI_API_KEY` ... `GEMINI_API_KEY_4`, com failover Google→Google e cooldown por chave/modelo

O menu abre numa tela temporária do terminal e volta para a conversa quando você confirma ou aperta Esc.

## Animações

A entrada ganhou uma progressão curta de CORE/MESH/TOOLS/MEM/GUARD. Thinking e Tools usam animações distintas. A correção de confirmação de ferramentas continua incluída: se o BLACKCORE precisar perguntar permissão, o spinner para e a pergunta fica visível.

## Instalação

```bash
unzip -o BLACKCORE-NATIVE-3.7.14-TERMUX-PHOTO-VIDEO-OUTFIT-EDITOR.zip
cd BLACKCORE-NATIVE-3.7.14
bash INSTALAR-BLACKCORE.sh --profile creator --setup-storage
blackcore permissions
blackcore
```

Depois, um pedido suficiente é:

```text
Faça uma auditoria completa deste projeto, rode todos os gates possíveis e salve o Markdown em Downloads.
```

As configurações, chaves e sessões continuam em `~/.blackcore` e são preservadas durante atualização normal.

Use `--profile web`, `creator`, `android` ou `full` somente quando precisar dessas dependências pesadas. O perfil `full` inclui também as CLIs de deploy; o perfil padrão `core` mantém o Termux leve. Adicione `--setup-storage` para solicitar o acesso ao armazenamento compartilhado durante a instalação.

Instalações demoradas agora mostram pacote, contador, saída real e tempo decorrido. Rode `blackcore doctor --full` para conferir grupos de dependências, perfil instalado e tamanho ocupado pelo runtime.

## Integrações de produção

- **Vercel:** projeto, build local, preview e produção.
- **Netlify:** status, dry-run de build, build, preview e produção.
- **Supabase:** stack local, projetos, link, migrations, lint/testes, tipos, push/reset, Edge Functions e secrets por arquivo.
- **Resend:** diagnóstico, domínios, e-mails enviados e e-mail transacional.

Deploy remoto, publicação de Edge Function e envio de e-mail exigem confirmação, exceto no perfil `yolo`. Chaves continuam fora do projeto, em variáveis de ambiente ou no armazenamento de credenciais da CLI.
