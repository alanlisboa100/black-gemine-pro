# 🖤 Black-Gemine Pro (BLACKCORE Native v3.8.1 + Cérebro 2.0)

> **O Agente de Engenharia de Software Autônomo e Criativo para Termux, Android, Linux, Mac e Windows.**

O **Black-Gemine Pro** combina o poder de raciocínio multimodal do **Google Gemini** com o harness autônomo **BLACKCORE** e a camada de cognição profunda **Cérebro 2.0 / Astra GPT-6**.

---

## ⚡ Novidades desta Versão

1. **🛡️ Google Supremo Failover Pool (8 Slots Concorrentes):**
   - Suporte expandido para **8 chaves de API independentes** (`GEMINI_API_KEY` até `GEMINI_API_KEY_8`).
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

## 📱 Guia de Instalação no Telefone (Android / Termux)

### 1. Preparar o Termux
Abra o Termux e instale os pacotes essenciais:
```bash
pkg update -y && pkg install -y git nodejs gh
```

### 2. Conectar sua Conta do GitHub (Repositório Privado)
Como o repositório é **privado**, autentique seu terminal uma única vez:
```bash
gh auth login
```
*(Selecione `GitHub.com` > `HTTPS` > `Login with a web browser`, copie o código exibido e valide no navegador).*

### 3. Clonar e Instalar
```bash
# 1. Clonar o projeto
git clone https://github.com/alanlisboa100/black-gemine-pro.git

# 2. Entrar na pasta do instalador e rodar
cd black-gemine-pro/.blackcore/runtime
bash INSTALAR-BLACKCORE.sh --profile core

# 3. Liberar permissão de armazenamento do Android (opcional/recomendado)
termux-setup-storage
```

### 4. Configurar Chaves do Gemini e Iniciar
```bash
# Adicionar sua chave principal (ou no seu ~/.bashrc)
export GEMINI_API_KEY="SUA_CHAVE_AQUI"

# Para usar o pool de múltiplas chaves (opcional):
# export GEMINI_API_KEY_2="SEGUNDA_CHAVE"
# export GEMINI_API_KEY_3="TERCEIRA_CHAVE"

# Iniciar o Blackcore!
blackcore
```

---

## 💻 Guia de Instalação no Computador (PC / Notebook)

### 🐧 Opção A: Linux ou Windows WSL (Ubuntu / Debian) — Recomendado

1. **Instalar Node.js (v20+), Git e GitHub CLI:**
   ```bash
   sudo apt update && sudo apt install -y git nodejs npm gh
   ```

2. **Autenticar no GitHub e Clonar:**
   ```bash
   gh auth login
   git clone https://github.com/alanlisboa100/black-gemine-pro.git
   ```

3. **Executar o Instalador:**
   ```bash
   cd black-gemine-pro/.blackcore/runtime
   bash INSTALAR-BLACKCORE.sh
   ```

4. **Configurar a Chave e Rodar:**
   ```bash
   export GEMINI_API_KEY="SUA_CHAVE_AQUI"
   blackcore
   ```

---

### 🪟 Opção B: Windows Nativo (PowerShell / Terminal)

1. **Pré-requisitos:**
   - Instale o **Node.js LTS** (>= v20) baixando de [nodejs.org](https://nodejs.org).
   - Instale o **Git for Windows** de [git-scm.com](https://git-scm.com) e o **GitHub CLI** (`winget install GitHub.cli`).

2. **Autenticar e Clonar no PowerShell:**
   ```powershell
   gh auth login
   git clone https://github.com/alanlisboa100/black-gemine-pro.git
   ```

3. **Executar Diretamente via Node:**
   ```powershell
   cd black-gemine-pro\.blackcore\runtime
   $env:GEMINI_API_KEY="SUA_CHAVE_AQUI"
   node bin\blackcore.js
   ```

   *(Dica: Você pode criar um arquivo `blackcore.cmd` no seu `PATH` apontando para `node "%USERPROFILE%\black-gemine-pro\.blackcore\runtime\bin\blackcore.js" %*` para chamar apenas digitando `blackcore`).*

---

### 🍎 Opção C: macOS (Terminal / Homebrew)

1. **Instalar Dependências:**
   ```bash
   brew install node git gh
   ```

2. **Autenticar, Clonar e Instalar:**
   ```bash
   gh auth login
   git clone https://github.com/alanlisboa100/black-gemine-pro.git
   cd black-gemine-pro/.blackcore/runtime
   bash INSTALAR-BLACKCORE.sh
   export GEMINI_API_KEY="SUA_CHAVE_AQUI"
   blackcore
   ```

---

## 🎯 Perfis de Instalação Disponíveis

Você pode escolher o nível de ferramentas passando `--profile` no instalador:

* `--profile core` (Padrão): BLACKCORE nativo, Git e utilitários rápidos.
* `--profile web`: Core + suporte a automação de navegador Chromium.
* `--profile creator`: Core + Python, FFmpeg e ferramentas de manipulação de mídia.
* `--profile full`: Suite completa com tudo instalado.

---
*Desenvolvido por Alan Lisboa (`@NFTIX2077`) & Black-Gemine Pro.*
