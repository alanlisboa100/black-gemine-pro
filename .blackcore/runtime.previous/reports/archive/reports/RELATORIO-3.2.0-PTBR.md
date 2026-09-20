# Relatório profissional — BLACKCORE Native 3.2.0

Data da auditoria: 10 de agosto de 2026

## Resultado executivo

O BLACKCORE 3.2.0 está pronto para teste público controlado no Termux e Linux. A base preserva o fluxo de conversa natural, não dispara deploy por causa de um pedido local e não troca o modelo escolhido sem autorização. A rodada adicionou diagnóstico real de permissões, armazenamento e dependências; ampliou a detecção de projetos; e transformou o laboratório visual em uma prova executável de animação, interação e jogo.

**Nota técnica geral: 9,4/10.** A nota não é publicidade: ela considera o que foi executado neste ambiente e desconta o que exige aparelho Android, Chromium instalado ou credenciais externas reais.

## Placar por capacidade

| Área | Nota | Evidência e limite |
| --- | ---: | --- |
| Conversa natural | 9,8 | Corpus coloquial em português 38/38; comandos visíveis continuam mínimos. |
| Modelo fixo e fallback | 9,9 | Seleção fica travada; mudança/fallback exige aprovação e vale somente no turno aprovado. |
| Interface Termux | 9,6 | Composer, confirmações, atividade e status cabem em 54 colunas; ferramenta concluída aparece imediatamente. |
| Arquivos, pastas e Git | 9,7 | Leitura, escrita, patch atômico, busca, arquivo, worktree e proteção contra symlink testados. |
| Criação de sites | 9,6 | Site completo criado, build corrigido, teste aprovado e servidor local validado ponta a ponta. |
| Scan/análise de sites e código | 9,5 | Mapa por etapas, hotspots, arquivo por intervalo, símbolos, referências e índice local testados. |
| Animações e código em movimento | 9,2 | Código real executado em 180 frames simulados (~60 FPS), pausa e redução de movimento; faltou inspeção visual em Chromium real. |
| Jogos web | 9,2 | Loop, teclado, mouse/toque, colisões, vidas, nível, pausa e reset testados. |
| APK/Android | 8,5 | Fonte Expo/EAS, detecção, Gradle, ADB e contrato APK testados; sem aparelho/SDK completo para instalar APK real. |
| Dependências | 9,5 | Perfis core/web/creator/android/full, progresso, doctor, npm/uv/Poetry/Pipenv/Rust/Go/Flutter/PHP. |
| Permissões Termux | 9,3 | Novo diagnóstico de workspace, shared storage, Termux:API e perfil; Android continua sendo a autoridade final. |
| Documentos e OCR | 9,4 | Markdown/HTML/PDF, leitura PDF/Office/texto e Tesseract; PDF real já coberto na suíte. |
| Segurança | 9,7 | 0 vulnerabilidades npm, segredos redigidos, limites de rede, caminhos sensíveis e confirmação destrutiva. |
| Integrações/deploy | 8,9 | 50/50 matriz inclui Vercel, Netlify, Supabase, Resend, Expo/EAS; sem publicar em contas reais nesta rodada. |
| Extensões, sessões e MCP | 9,5 | Ciclo de extensão, confiança, árvore de sessão, checkpoints, undo e MCP stdio aprovados. |

## O que foi melhorado

### Permissões e armazenamento

- `blackcore permissions` mostra ambiente, usuário, workspace, home, pasta BLACKCORE, armazenamento Android e comandos Termux:API.
- `blackcore doctor --full` inclui permissões, grupos de ferramentas, perfil instalado e tamanho ocupado.
- `bash INSTALAR-BLACKCORE.sh --profile full --setup-storage` pode abrir o fluxo oficial de armazenamento, sem esconder a decisão do Android.
- Projetos executáveis e `node_modules` em armazenamento compartilhado geram orientação para trabalhar dentro de `$HOME` e apenas importar/exportar em `~/storage`.
- Root não é necessário nem presumido.

### Código, sites e dependências

- Detecção nova para HTML/CSS/JS sem framework, Flutter e PHP/Composer.
- Python escolhe `uv.lock`, Poetry, Pipenv ou pip em vez de adivinhar um gerenciador.
- Flutter ganhou `pub get`, `analyze`, `test` e `build apk --debug` determinísticos.
- O agente continua detectando Node.js, Android/Gradle, Rust, Go, deploy e CI.
- Instalar dependências continua pedindo confirmação fora do modo irrestrito.

### Laboratório visual

- Cubo Canvas 3D com rotação automática, arrasto, foco por teclado e setas.
- Stream visual de leitura, edição, patch, teste, scan e conclusão, limitado para não inundar a tela.
- Indicador de saúde de frames atualizado sem redesenhar tudo a cada frame.
- Corações com partículas, jogo por teclado/toque, pausa global e suporte a `prefers-reduced-motion`.
- Teste executa o JavaScript verdadeiro com DOM/Canvas/RAF simulado; não é apenas busca de texto no arquivo.

## Dependências por perfil

| Perfil | Conteúdo principal | Observação |
| --- | --- | --- |
| `core` | Node.js, Git, rg, fd, curl/wget, jq, SSH, zip/unzip, gh, SQLite e comandos Termux:API quando disponíveis | Melhor para começar no celular. |
| `web` | Core + Chromium | Habilita browser interativo, screenshot e auditoria renderizada. |
| `creator` | Core + Python/C/C++, FFmpeg, ImageMagick, Poppler e Tesseract | Mídia, OCR, PDF e módulos nativos. |
| `android` | Creator + Java, Gradle, AAPT, assinatura e ADB | APK e dispositivo Android. |
| `full` | Todos + PostgreSQL, Go, Rust, PHP/Composer e CLIs de entrega | Pesado; use quando realmente precisar. |

Pacotes opcionais podem variar por arquitetura e repositório Termux. Uma falha opcional é mostrada por pacote e não derruba o núcleo. O `doctor --full` informa exatamente o que ficou disponível.

## Testes executados

- 283 arquivos JavaScript passaram pela verificação de sintaxe.
- 162/162 testes automatizados passaram em HOME isolada.
- 38/38 frases naturais em português passaram.
- 50/50 cenários de ferramentas passaram.
- Criação natural ponta a ponta: site e cubo 3D aprovados.
- MCP stdio 2026-07-28 aprovado.
- Auditoria npm: 0 vulnerabilidades conhecidas e nenhuma dependência desatualizada reportada.
- Total: 65 ferramentas nativas registradas por schema.

## Limites que ainda existem

1. Permissão Android não pode ser concedida silenciosamente por JavaScript. O usuário precisa aceitar a tela do sistema.
2. Câmera, localização e notificações exigem o app Termux:API compatível e o pacote `termux-api`.
3. O navegador Chromium não estava disponível neste contêiner e o download retornou arquivo incompleto. Portanto, esta rodada não inclui captura visual real; inclui simulação do runtime, HTTP local, estrutura e acessibilidade.
4. APK real depende de SDK/Java/Gradle/assinatura ou EAS e, para teste final, de dispositivo/emulador.
5. Deploy real depende de login, projeto, domínio e confirmação do usuário. Pedido local não autoriza publicação.

## Verificação recomendada no telefone

```bash
blackcore version
blackcore permissions
blackcore doctor --full
```

Se o armazenamento não estiver pronto:

```bash
termux-setup-storage
blackcore permissions
```

Não reconstrua `~/storage` se os links já existem e funcionam. Se o Android acabou de conceder acesso, feche e abra o Termux antes de repetir o diagnóstico.
