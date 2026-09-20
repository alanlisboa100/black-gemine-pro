# BLACKCORE Native 3.7.12 — consultoria e edição de fotos

O editor agora separa a decisão da execução. Quando o pedido for “analisa esta foto”, “o que pode melhorar?” ou “me dá opções”, o BLACKCORE mede a imagem e devolve um diagnóstico sem criar nem alterar arquivo. A edição só começa depois da escolha do usuário.

## O que a análise entrega

- problemas priorizados de exposição, sombras, realces, contraste, cor, ruído e nitidez;
- evidência curta baseada nas medições da imagem;
- sugestão de luz, cor, detalhe, redução de ruído, recorte, texto e marca;
- estilos prontos `natural`, `cinematic` e `blackcore-dark`;
- escolha de foto inteira, pessoa, fundo, detalhe descrito ou máscara manual;
- aviso claro quando uma seleção depende de um componente que não está instalado.

O analisador leve também estima água, céu, grama/vegetação e montanha para recomendar tratamento contextual. Isso é uma estimativa visual local, não uma segmentação semântica de precisão.

## Conversa em duas etapas

```text
Você: Analisa esta foto e me diz o que dá para mudar.

BLACKCORE: mostra os problemas medidos, as opções disponíveis e uma recomendação.

Você: Escolho cinematográfico, somente no fundo, com mais cor e detalhe; sem recorte.

BLACKCORE: executa somente o que foi aprovado e verifica a alteração regional.
```

Um pedido direto como “melhora esta foto no modo alto BLACKCORE” continua editando imediatamente. O modo consultoria é usado quando o usuário pede análise, recomendações ou quer escolher antes.

## Seleção disponível

| Área | Requisito |
|---|---|
| Foto inteira | sempre disponível |
| Máscara manual | sempre disponível |
| Pessoa/fundo | alpha útil, máscara, `rembg` ou backend configurado |
| Detalhe por texto | máscara fornecida ou segmentador semântico configurado |

Instale o recorte automático de pessoa/fundo com `bash scripts/install-photo-ai.sh --mode rembg`. Para detalhes por texto, consulte [Instalação das IAs de foto](docs/PHOTO-AI-INSTALLATION.md).

## Garantias

- análise não muta a foto;
- original nunca é sobrescrito;
- seleção indisponível não é simulada;
- edição regional mede força dentro da máscara e vazamento fora dela;
- o relatório final descreve somente mudanças realmente executadas.
