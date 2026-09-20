# Relatório técnico completo — BLACKCORE Native 3.5.2

## Resumo executivo

A 3.5.2 resolve o defeito visual mostrado no Termux: o cabeçalho e a caixa de mensagem não fazem mais parte do histórico rolável. O terminal foi dividido em três áreas reais. A saída do agente, blocos de código, pesquisas e ferramentas passam apenas pela janela central, enquanto identidade/modelo/status ficam presos no topo e a digitação permanece presa no rodapé.

O Creative Lab também foi ampliado para testar cenas mais exigentes, incluindo uma vila completa com transição de iluminação, elementos simultâneos e redução de movimento. A auditoria nativa foi endurecida para executar gates de forma reproduzível e diferenciar fixtures sintéticas de possíveis credenciais operacionais.

## Interface Termux

### Cabeçalho fixo

O painel superior ocupa quatro linhas e mostra apenas informação útil: BLACKCORE/versão, modelo/provedor, fase animada, modo, estado e tamanho da fila. Caminho absoluto, detalhes de transporte e qualquer conteúdo de chave ficam fora dessa superfície.

### Conversa e código no centro

Uma margem ANSI de scroll limita toda saída às linhas entre cabeçalho e compositor. Respostas longas, código numerado, Markdown, resumo, pesquisa e logs de ferramentas atravessam essa janela sem apagar as superfícies fixas.

### Entrada fixa

O compositor ocupa as três últimas linhas e continua visível durante pensamento, streaming e ferramentas. A mensagem que o usuário está digitando é preservada em resize, suspensão temporária e retorno do trabalho. `Ctrl+L` reconstrói o viewport e `/clear` limpa a conversa sem perder o desenho fixo.

### Compatibilidade

O caminho principal é ativado em TTY com pelo menos 30 colunas e 14 linhas. Terminais menores ou sem recursos mínimos continuam usando o compositor linear legado como fallback seguro.

## Laboratório visual

O site `examples/creative-lab` agora reúne:

1. Vila dia/noite com sete casas iluminadas, terreno, estrada, árvores, nuvens, viajante e 24 vaga-lumes.
2. Cubo 3D controlável por mouse, toque e teclado.
3. Partículas/corações e atividade visual de código.
4. Página responsiva com navegação entre cenas.
5. Jogo interativo e painel de saúde de frames.
6. Suporte a movimento reduzido sem desaparecer com o conteúdo.

Os testes exercitaram o ciclo completo da vila, interações do cubo, partículas, jogo, pausa, reset, FPS simulado e `prefers-reduced-motion`.

## Auditoria de produto

| Produto | Nota | Situação |
|---|---:|---|
| BLACKCORE Core/agente | 9,8/10 | aprovado |
| Viewport fixo Termux | 9,7/10 | aprovado; teste físico recomendado |
| Creative Lab | 9,6/10 | aprovado; GPU real pendente |
| Auditor nativo | 9,7/10 | aprovado |
| BLACKCORE Studio PWA/Supabase | 9,6/10 | aprovado localmente |
| Creative Lab Mobile/Expo | 7,2/10 | fixture controlada |

Nota da árvore inteira: **80/100**. O veredito permanece **piloto controlado** porque a fixture móvel traz 23 alertas altos e 7 moderados em dependências transitivas. Núcleo e Studio retornaram zero vulnerabilidades conhecidas no `npm audit --omit=dev`.

Os 16 padrões com aparência de credencial estão restritos a testes/QA e foram classificados separadamente para revisão manual. O relatório não grava os valores, somente localizações redigidas.

## Evidência consolidada

- 303 arquivos JavaScript com sintaxe válida.
- 208 testes aprovados e zero falhas.
- 254 avaliações de compreensão contextual aprovadas.
- 38 comandos naturais coloquiais aprovados.
- 50 cenários de ferramentas aprovados.
- Agente pai/subagente, undo, nova sessão e MCP stdio aprovados.
- Cancelamento/timeout de árvore de processos preservados da 3.5.1.

## O que ainda não foi comprovado

Não foi possível substituir um teste físico: este ambiente não tinha um Android com Termux conectado nem Chromium/Playwright/GPU disponível. Portanto, rotação, teclado Samsung, fonte real, desempenho gráfico e APK assinado permanecem fora da prova automatizada. Essas limitações estão registradas no relatório, sem promessa artificial de produção.

## Teste rápido no telefone

Depois de instalar, abra o BLACKCORE, digite uma mensagem longa, inicie uma tarefa com ferramentas e abra/feche o teclado. O topo e a entrada devem permanecer visíveis; somente o conteúdo central deve rolar. Para o laboratório:

```bash
cd ~/.blackcore/runtime/examples/creative-lab
python -m http.server 4173
```

Abra `http://127.0.0.1:4173` no navegador do telefone.
