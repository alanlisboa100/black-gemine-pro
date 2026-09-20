# 🖤⚡ BLACKCORE v3.8.0 - Complete Autonomous Runtime & Core Harness

> **Repositório Privado Supremo:** Código-fonte, ferramentas nativas, memórias, sistema de animação TUI, pool de failover do Google (Trio Supremo) e ecossistema multimídia completo.

---

## 🚀 O que este repositório contém

Este repositório é a distribuição completa e autônoma do **BLACKCORE**, incluindo:

1. **🔥 Trio Supremo & Google Elite Pool (`google-free-pool`):**
   - Roteamento e failover automático sem interrupção de sessão: `Gemini 3.8 Flash` → `Gemini 3.7 Flash` → `Gemini 3.6 Flash` → `Gemini 3.5 Flash-Lite`.
   - Resiliente contra erros HTTP 503 (sobrecarga) e 429 (limite de quota).
   - Suporte a pool de até 4 chaves do Google AI Studio (`GEMINI_API_KEY_1` a `_4`).

2. **🕷️ Scraper Distribuído Avançado (`web_scraper`):**
   - Extração paralela em massa de conteúdos de múltiplos sites.
   - Limpeza automática de HTML, extração de títulos, cabeçalhos, metadados e links em Markdown limpo.

3. **📱 Android ADB & APK Manager (`android_device`):**
   - Controle total de dispositivos e emuladores Android direto do Termux.
   - Leitura de logs (`logcat`), envio de cliques (`tap`), gestos (`swipe`), texto e comandos de teclado (`keyevent`).
   - Instalação e teste automatizado de APKs.

4. **✨ Animações TUI & Motion System (`src/tui/motion.js`):**
   - Animações braille ultra-fluídas para execução de ferramentas (`⣾⣽⣻⢿⡿⣟⣯⣷`).
   - Catálogo completo de ícones e glifos por ferramenta (`TOOL_GLYPHS`).

5. **💼 Limites Expandidos de Execução:**
   - Suporte a até **250 turns** e **500 chamadas de ferramentas** em uma única tarefa de engenharia sem cortes.

---

## 🛠️ Como Instalar e Rodar no Termux / Linux

### 1. Clonar o Repositório Privado
```bash
git clone https://<SEU_TOKEN>@github.com/alanlisboa100/blackcore-runtime-complete.git blackcore-runtime
cd blackcore-runtime
```

### 2. Instalar Dependências e Linkar
```bash
npm install
npm link
```

### 3. Iniciar o BLACKCORE
```bash
blackcore
```

---

## 🔒 Segurança e Privacidade
Este repositório foi criado em modo **PRIVADO**. Nenhuma chave de API, credencial ou token pessoal foi armazenado no código-fonte.
