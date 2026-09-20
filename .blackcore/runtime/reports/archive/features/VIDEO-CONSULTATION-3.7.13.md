# BLACKCORE Native 3.7.13 — consultoria inteligente de vídeo

O editor agora separa análise, decisão e renderização. Quando o pedido for “analisa este vídeo”, “o que pode melhorar?” ou “me mostra as opções”, o BLACKCORE não cria um arquivo editado. Ele mede o vídeo, explica as oportunidades e espera o usuário escolher.

## Diagnóstico

- duração e risco de renderização no telefone;
- pausas, silêncio e quadros pretos;
- quantidade e densidade de mudanças de cena;
- movimento forte e trechos de baixa atividade;
- loudness, true peak e variação dinâmica;
- picos, batidas, BPM e estimativa de ritmo musical;
- amostras de baixa/luz forte, água, céu, grama, vegetação e montanha;
- resolução, áudio incorporado e duração estimada após cortes conservadores.

Cada achado informa prioridade, evidência medida e uma mudança possível. Nenhum achado altera o arquivo.

## Escolha antes de renderizar

O menu oferece:

1. perfil `basic`, `medium`, `high`, música travada, polimento visual ou versão vertical;
2. áudio cortado junto com a imagem, música original contínua ou nova música;
3. 720p, 1080p ou 2K máximo;
4. cortes, transições, ritmo, cor contextual, masterização, redução de ruído, estabilização, legendas, música, reenquadramento, texto e marca.

O BLACKCORE espera a resposta e combina somente o que foi aprovado. Um pedido direto como “faz uma edição profissional completa” continua usando `auto_edit` imediatamente.

## IAs e componentes disponíveis

| Componente | Função real |
|---|---|
| Modelo ativo / Google Free Pool quando selecionado | interpreta o pedido e escolhe o plano aprovado |
| Inteligência local de cena e música | mede cenas, movimento, silêncio, picos, batidas, BPM e ambientes |
| FFmpeg | executa cortes, transições, cor, áudio e exportação |
| Whisper ou whisper.cpp local | cria legendas quando comando e modelo local estão prontos |
| FFmpeg vidstab | estabiliza quando os filtros existem na compilação |
| Outfit AI | troca roupa com referência e backend temporal GPU configurado |

`rembg` permanece no editor de foto. Aplicá-lo separadamente em cada quadro pode causar cintilação. Grounded SAM 2 só conta como rastreamento de vídeo quando conectado por um backend temporal compatível; o endpoint de máscara de foto não é chamado de rastreamento.

## Garantias

- análise não renderiza nem altera o vídeo;
- música não é acelerada escondido;
- cortes mantêm imagem e som sincronizados, salvo quando a política de música contínua é escolhida;
- cenas fortes de dança e ação são protegidas;
- transições são esparsas e contextuais;
- 720p é recomendado para telefone e 2K é o teto;
- o relatório final descreve somente mudanças verificadas e o caminho real.
