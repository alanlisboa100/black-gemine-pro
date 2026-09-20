# 🖤 Black-Gemine Pro (BLACKCORE Native v3.8.1 + Cérebro 2.0)

> **O Agente de Engenharia de Software Autônomo e Criativo para Termux, Android e Linux.**

O **Black-Gemine Pro** combina o poder de raciocínio multimodal do **Google Gemini** com o harness autônomo **BLACKCORE** e a camada de cognição profunda **Cérebro 2.0 / Astra GPT-6**.

---

## ⚡ Novidades desta Versão

1. **🛡️ Google Supremo Failover Pool (8 Slots Concorrentes):**
   - Suporte expandido de 4 para **8 chaves de API independentes** (`GEMINI_API_KEY` até `GEMINI_API_KEY_8`).
   - Rotação instantânea com zero downtime em caso de rate limit (`429`), erro de quota ou sobrecarga de rede.
   - Streaming resiliente com auto-recuperação (`handoffSafeStreaming`).

2. **🧠 Cérebro 2.0 & Protocolo Zero-Chute:**
   - Inspeção obrigatória do estado do terminal antes de qualquer modificação de código.
   - Decomposição profunda de tarefas complexas em DAGs via `task_graph`.
   - Autocorreção cirúrgica guiada por evidências reais e logs de erro.

3. **📱 Integração de Mídia e Sistema Android / Termux:**
   - Sincronização automática com WhatsApp e tocadores de música via `termux-media-scan`.
   - Gestão oficial de modelos 3D (`.glb`, `.gltf`, `.obj`) em `~/Models3D`.
   - Automação completa de workflows locais com proteção rigorosa de dados sensíveis.

4. **🔒 Blindagem de Privacidade e Segurança:**
   - `.gitignore` impenetrável com bloqueio absoluto de tokens, sessões, caches, históricos e credenciais.
   - Rastreamento limpo e restrito ao código-fonte do agente.

---

## 🚀 Como Iniciar

1. Clone o repositório no seu ambiente Termux:
   ```bash
   git clone https://github.com/alanlisboa100/black-gemine-pro.git
   ```
2. Inicialize o runtime:
   ```bash
   cd black-gemine-pro
   # Configuração e inicialização nativa
   ```
3. Interaja naturalmente no terminal para construir, analisar, automatizar ou criar!

---
*Desenvolvido por Alan Lisboa (`@NFTIX2077`) & Black-Gemine Pro.*
