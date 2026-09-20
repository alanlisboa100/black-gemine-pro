# BLACKCORE Native 3.7.6 — Adaptive Scene-Color A/V Video Studio

## Cor adaptativa por ambiente 3.7.6

Antes do render, o `auto_edit` amostra quadros RGB pequenos em intervalos limitados pela duração. A leitura mede luminância, sombras, realces, saturação, predominância/posição de azul e verde, tons terrosos e densidade de bordas. A combinação separa sinais de água, céu, grama, vegetação, paisagem de morro/montanha, baixa luz e luz forte sem instalar OpenCV, PyTorch ou outro runtime pesado no Termux.

Cada segmento da timeline recebe o perfil das amostras que pertencem ao seu intervalo. Os filtros são leves e limitados: água/céu valorizam o azul, grama/vegetação o verde, paisagem ganha microcontraste/nitidez, baixa luz recupera gamma e luz estourada é contida. Depois disso entra o grade natural/studio/cinematic já existente. A resposta final conta somente as cenas realmente tratadas.

`environmentEnhancement` vem ativado no `auto_edit`. `environmentStrength` aceita `0..1`; básico, médio e alto usam respectivamente força e amostragem conservadora, equilibrada e profunda. O HUD apresenta `SCENE COLOR` como a sexta das 18 etapas.

## Linha do tempo conjunta 3.7.5

O `auto_edit` voltou a tratar imagem e som como uma única montagem: os trechos ficam em ordem cronológica, um corte visual recorta o mesmo intervalo da faixa e uma transição de imagem recebe um crossfade de áudio igual. Isso elimina os destaques puxados de tempos diferentes que podiam deixar a história confusa. Não existe mudança automática de velocidade.

O método padrão `audio-or-motion` mantém o trecho se houver música, fala ou movimento; só marca como inativo o intervalo simultaneamente silencioso e parado. `audio`, `motion`, `audio-and-motion` e `scene` permitem controle explícito. A margem dos cortes conserva o ataque das palavras e batidas. `preserveSourceAudio: true` fica reservado para um pedido como “não altere a música”; `creativeRecut: true` também é opt-in.

O HUD mostra `A/V SMART CUT`, `TRANSITION IN/OUT` e `AUDIO CUT/MIX`. O render continua local, MP4 por padrão, 720p móvel, limitado a 2K, e preserva o tratamento de imagem aprovado na versão anterior.

## Recorte visual verificado 3.7.4

O áudio travado deixou de significar “manter a mesma montagem”. O `auto_edit` agora constrói uma EDL só para a imagem: preserva a duração e a ordem geral da história, mas insere destaques próximos, punch-ins e entradas/saídas de transição em pontos de ritmo. Nenhuma dessas escolhas acelera a música.

Depois do render, `EDIT DELTA` compara amostras dos pontos editados com os mesmos tempos do original, cortando fora a região inferior da marca. Um resultado semelhante demais é recusado. O retorno inclui as contagens reais e o valor da verificação em vez de prometer uma edição que não apareceu no arquivo.

## Música preservada e transições 3.7.3

`auto_edit` mantém a trilha que já está no vídeo contínua por padrão. A imagem pode trocar de cena, receber transições, cor, escala e marca BLACKCORE, mas o áudio original não é recortado, sobreposto, acelerado nem masterizado. Para pedir tratamento de áudio de propósito, use `preserveSourceAudio: false` junto das opções de masterização/denoise.

As transições são escolhidas em poucos limites de cena ranqueados por movimento e proximidade das batidas. O dissolve com easing é o padrão natural; `heart`, `burst`, `zoomin` e `circleopen` entram somente em picos adequados ou quando solicitados. `reverseMoments` permite um reverso visual curto sem inverter a música. `musicGenre` aceita `auto`, `funk`, `pagode`, `sertanejo`, `pop` ou `other`; `auto` é sempre uma estimativa baseada no ritmo e pode retornar `unknown`.

O render automático usa 720p HD por padrão, pode ser ajustado para 1080p ou 2K e nunca ultrapassa 2K nesta versão. O HUD exibe 17 fases sem logs brutos, incluindo inteligência de cena, mapa rítmico, identidade musical, recorte visual, entrada/saída de transição, trava de áudio, HD móvel e diferença verificada.

## Perfis automáticos 3.7.2

`auto_edit` aceita `editLevel: basic|medium|high`. A escolha controla orçamento e espaçamento de transições, movimento protegido, color grade, CRF/preset, limite de bitrate e opacidade da assinatura. A marca BLACKCORE vem ativada nos três perfis e pode ser substituída por `overlay` ou desativada com `brandWatermark: false`.

## Progresso visual no Termux

Enquanto uma edição roda, o cabeçalho fixo muda para `EDIT` e acompanha a fase atual. As análises mostram o estágio sem inventar porcentagens internas; durante a codificação, a barra, a porcentagem e o ETA vêm do canal de progresso do FFmpeg. As atualizações substituem a mesma linha do HUD, preservando o histórico e a caixa de mensagem.

O BLACKCORE agora funciona como um estúdio de edição por linguagem natural no Termux/Android e no Linux. A IA escolhida no agente decide o tratamento criativo; analisadores locais medem o material; o FFmpeg renderiza e o ffprobe confirma o arquivo entregue.

## O que ele entende

- resolução, orientação, FPS, codecs, duração, capítulos e faixas;
- mudanças de cena, pausas, silêncios e trechos pretos;
- loudness integrado, true peak, faixa dinâmica e ruído constante;
- picos de energia, batidas e BPM aproximado de uma música;
- intervalos úteis da timeline e duração estimada depois da limpeza.

## O que ele edita

- corte simples, corte por intervalos, remoção inteligente de pausas e montagem de vários clipes;
- transições fade, dissolve, wipe, slide, smooth, circle e zoom com crossfade de áudio;
- sincronização rítmica com música e início alinhado à primeira batida detectada;
- ducking automático: a trilha abaixa durante a fala e volta de forma suave;
- redução de ruído, filtro de rumble, compressor, normalização LUFS e limitador de pico;
- reenquadramento original, vertical 9:16, quadrado 1:1, horizontal 16:9 ou tamanho personalizado;
- enquadramento por crop, fit com barras ou fundo desfocado;
- cor natural, cinematográfica, vibrante, quente, fria ou monocromática;
- estabilização em duas passagens quando o FFmpeg do aparelho inclui `vidstab`;
- legendas fornecidas ou transcritas localmente, texto, marca-d'água, fades, velocidade, rotação, volume, compressão, áudio extraído e thumbnail.

## IAs gratuitas

O `google-free-pool` já presente no BLACKCORE pode usar somente os modelos gratuitos configurados do Google AI Studio para raciocinar sobre o pedido e comandar a edição. Cotas do Google continuam sujeitas à conta/projeto do usuário e podem mudar.

Para transcrição sem serviço pago, o estúdio procura, nesta ordem:

1. `whisper-cli` do whisper.cpp com um modelo local indicado por `whisperModel` ou `BLACKCORE_WHISPER_MODEL`;
2. o CLI open-source `whisper`, com o nome do modelo indicado em `whisperModel`.

O editor não chama um serviço de transcrição pago e não diz que gerou legendas se nenhum backend local concluiu a tarefa. FFmpeg/ffprobe continuam incluídos nos perfis `creator`, `android` e `full` do instalador.

## Pedidos naturais

- “Analisa esse vídeo e me diz onde estão as pausas, cenas e picos da música.”
- “Faz uma edição completa em 9:16, limpa as pausas, usa cor natural e deixa a voz forte.”
- “Monta estes quatro clipes com transições cinematográficas de meio segundo.”
- “Coloca esta música, corta no ritmo e abaixa a trilha quando eu falar.”
- “Gera legenda em português com Whisper e deixa no estilo social.”
- “Estabiliza, reduz ruído, corrige cor e comprime sem matar a qualidade.”

Depois de uma renderização bem-sucedida, o BLACKCORE responde somente com as mudanças que ficaram visíveis ou audíveis no vídeo e o caminho do arquivo final. Detalhes internos só aparecem quando forem pedidos.

## Limites honestos

O reenquadramento integrado é geométrico e central; ele não afirma rastreamento de rosto/objeto sem um backend de visão dedicado. A detecção de BPM é uma estimativa baseada em energia de baixa frequência. Transcrição e estabilização dependem dos executáveis/filtros instalados no aparelho. Todo arquivo em armazenamento compartilhado continua protegido pelas permissões normais do BLACKCORE.
