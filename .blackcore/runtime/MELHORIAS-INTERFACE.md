> Registro da revisão anterior. Consulte AUDITORIA-3.8.1.md para a validação e as limitações atuais.

# BLACKCORE 3.8.0 — atualização da interface para Termux

Esta revisão parte do arquivo BLACKCORE-v3.8.0-TERMUX-FIXED.zip enviado pelo usuário.

## O que mudou

- Abertura com três quadros curtos (aproximadamente 195 ms de espera programada), sem porcentagens decorativas de carregamento.
- Indicador de atividade com intervalo mínimo de 80 ms, transição de cor menos frequente, tempo em segundos inteiros e saída limitada à largura do terminal.
- Correção das cores ANSI: ciano, verde, cinza e demais cores da paleta passam a usar sequências válidas. Estilos como negrito e itálico continuam disponíveis.
- Histórico fixo atualiza somente linhas que mudaram; cada atualização é enviada em um único bloco. Respostas em sequência são agrupadas em janelas de 33 ms.
- Painel fixo deixa de manter o temporizador de animação quando está ocioso.
- A configuração `animation: false` também vale para os painéis fixo e ao vivo. O estado de atividade continua visível, com símbolo estático.
- Estado inicial de trabalho mostra WORK em vez de READY; edição de foto e roupa recebe o mesmo indicador de processamento da edição de vídeo.
- Menus com rolagem, seleção sempre visível, atualização das linhas alteradas e ajuste ao redimensionar a janela. Home/End e Page Up/Page Down também funcionam.
- Entrada numérica aguarda a resposta antes de restaurar o painel; menus restauram o modo de teclado e removem seus eventos ao fechar.
- O spinner remove seu temporizador e restaura o cursor ao terminar; registra também restauração no encerramento normal do processo.
- Metadados de versão do package-lock corrigidos para 3.8.0. A versão principal foi mantida para identificar esta entrega como uma revisão de interface da mesma base.

## Instalação

Extraia este ZIP em uma pasta nova. Dentro da pasta `BLACKCORE-v3.8.0-COMPLETE`, execute o instalador já existente:

```bash
bash INSTALAR-BLACKCORE.sh
```

O instalador mantém seu fluxo original de atualização e configuração. Ele não foi executado neste ambiente de validação.

Para iniciar com menos movimento, sem editar sua configuração:

```bash
BLACKCORE_REDUCED_MOTION=1 blackcore
```

Para voltar ao comportamento padrão, execute `blackcore` normalmente. Se você já desativou `animation` na configuração, ela continua desativada.

## Validação

- 13 testes de regressão da interface passaram: cores, configuração de movimento, saída em arquivos/pipes, limite de largura, seleção de menu em cinco tamanhos de terminal, redimensionamento, limpeza de eventos, restauração do teclado, atualização parcial do histórico e suspensão/retomada do painel.
- Sintaxe de 239 arquivos JavaScript validada.
- `node bin/blackcore.js --version` executado com sucesso.
- Os testes usam terminais simulados; a fluidez visual e o teclado Android ainda precisam de uma execução no seu aparelho. Não houve chamada a modelos pagos nem teste de serviços externos.
- A suíte de avaliação de linguagem natural não pôde executar: o ZIP de origem não inclui `evals/natural-understanding-cases.js`. O `npm test` original também referencia `test/setup.js`, ausente na origem. Esses testes anteriores não foram recriados nem declarados aprovados.

Para repetir os testes desta revisão na pasta extraída:

```bash
npm run test:tui
npm run test:syntax
```
