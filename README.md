# 🖤 Black-Gemine Pro (BLACKCORE Native v3.8.1 + Cérebro 2.0)

> **O Ecossistema Autônomo de Engenharia de Software, Criação Visual e Inteligência Artificial para Termux (Android), Linux, Mac e Windows.**

O **Black-Gemine Pro** combina o poder de raciocínio multimodal dos novos modelos de ponta com o harness autônomo **BLACKCORE**, as IAs nativas exclusivas (**Misuki Visual Engine** e **Black Numbers AI**) e a camada de cognição profunda **Cérebro 2.0 / Astra GPT-6**.

---

## 🤖 1. Nossas IAs Nativas Integradas

O projeto traz embarcadas engines de IA proprietárias desenvolvidas para execução local e criativa:

### 🎨 Misuki Visual Engine (Paint IA Studio v0.8.0)
* **Localização:** `apps/paint-ia-studio-v080/`
* **O que é:** Motor neural de pintura artística e desenho generativo vetorial/raster guiado por traços.
* **Recursos Principais:**
  * **Pipeline de 14 Checkpoints (P00 ➔ P14):** Construção progressiva da arte (silhueta, eixos cranianos, massa de cabelo, traços faciais, vestimenta gótica, iluminação tonal e finalização de textura).
  * **DNA Canônico de Personagem:** Preservação estrita de traços da *Misuki* (chifres negros curvados, longos cabelos escuros com reflexos frios, olhos vermelhos expressivos e elegância gótica).
  * **Mecanismo de Crítica e Reparação:** Subagentes internos (`director`, `critic`, `stroke`, `enhancement`) avaliam a fidelidade visual e corrigem discrepâncias antes da renderização final.

### ⚡ Black Numbers AI (v1.0.0)
* **Localização:** `apps/black-numbers-v100/`
* **O que é:** IA autônoma compacta capaz de sintetizar sua própria versão de código e gramática relacional através da linguagem `.bn`.
* **Recursos Principais:**
  * **Linguagem Própria (`.bn`):** Sintaxe minimalista para compor animações matemáticas, campos de força e partículas neurais.
  * **Aprendizado Dinâmico & Injeção de Conhecimento:** Módulo de ingestão de algoritmos (criptografia, grafos, busca binária, matrizes, processamento de imagem) e evolução de estratégias lógicas.
  * **Daemon Reativo (`bn_daemon.py`):** Monitoramento contínuo em background para auto-otimização e resposta em tempo real.

---

## ⚡ 2. Catálogo dos Novos Modelos e Pools de IA

O Black-Gemine Pro conta com um sistema de roteamento inteligente de modelos e rotação automática de chaves com tolerância zero a interrupções:

### 🥇 Google Supremo Pool (100% Gratuito · 8 Slots de Chaves)
Roda os modelos mais avançados da Google com rodízio inteligente (*sequential-sticky*) entre até 8 chaves de API independentes (`GEMINI_API_KEY` até `GEMINI_API_KEY_8`):

| Modelo | Destaque | Janela de Contexto | Raciocínio Agêntico |
| :--- | :--- | :--- | :--- |
| **`gemini-3.8-flash`** | Principal: Codificação ultra-rápida, visão e raciocínio avançado | 1.000.000 tokens | Máximo |
| **`gemini-3.7-flash`** | Segunda linha: Extrema estabilidade para workflows profundos | 1.000.000 tokens | Alto |
| **`gemini-3.6-flash`** | Terceira linha: Latência ultra-baixa para respostas em tempo real | 1.000.000 tokens | Médio |
| **`gemini-3.5-flash-lite`** | Reserva imediata e economia máxima de processamento | 1.000.000 tokens | Rápido |
| **`gemma-4-31b-it`** | Modelo aberto de 31B de parâmetros de alta densidade | 128.000 tokens | Alto |
| **`gemma-4-26b-a4b-it`** | Arquitetura aberta veloz para tarefas locais e remotas | 128.000 tokens | Médio |

### 🚀 WaveSpeed Eco Pool (Resgate Híbrido & 220+ Modelos)
Rede de segurança ativada automaticamente caso ocorra esgotamento temporário das cotas gratuitas do Google:

* **`qwen/qwen3.7-flash`:** O campeão do custo-benefício global (**$0.03 por 1M de tokens de entrada** / **$0.13 de saída**). Com apenas US$ 4,00 você tem saldo para mais de 80 milhões de tokens de conversação!
* **`mistralai/mistral-nemo`:** Modelo balanceado para formatação estrita de dados e geração de JSON.
* **`deepseek/deepseek-v3` & `deepseek-r1`:** Raciocínio matemático rigoroso e resolução lógica de alta complexidade.
* **Catálogo WaveSpeed Completo:** Mais de **220 modelos** indexados e prontos para chamada no registry do sistema.

---

## 🛠️ 3. Ferramentas Forenses & Módulos Utilitários

* **🛰️ BLACKCORE X-Inspector (`tools/x-inspector/`):**
  * HUD forense e inteligência OSINT para análise de perfis do X (Twitter).
  * Decodificação do **Twitter Snowflake ID** (cálculo em nanossegundos da data de criação da conta e datacenter de origem).
  * Cálculo heurístico de probabilidade de bots (*Bot Score*).
* **📱 Android / Termux Native Bridge:**
  * Integração com WhatsApp e players de música via `termux-media-scan`.
  * Gestão de diretórios de mídia (`/Music`, `BLACKMusic_Video/musicas`, `~/Models3D`).
  * Automação de browser headless com isolamento de perfis persistentes.

---

## 🧠 4. Protocolo Cérebro 2.0 (Zero-Chute)

1. **Inspeção Antes de Mutação:** O agente nunca altera arquivos no escuro; o estado do terminal e arquivos são sempre inspecionados primeiro.
2. **Decomposição em Grafo (Task DAG):** Divisão automática de tarefas complexas em etapas interdependentes (`task_graph`).
3. **Autocorreção Cirúrgica:** Diagnóstico a partir de logs reais de erro e reaplicação de patches pontuais com ciclo de verificação contínua.
4. **Blindagem de Segredos:** Nenhuma chave de API, arquivo de credenciais (`secrets.json`, `.env`, `x_credentials.json`), sessão de conversa ou histórico é compartilhado ou exposto.

---

## 📱 5. Guia de Instalação e Execução

### No Celular (Android / Termux):

1. **Instalar Dependências Básicas:**
   ```bash
   pkg update -y && pkg install -y git nodejs python gh
   ```

2. **Autenticar no GitHub (Repositório Privado):**
   ```bash
   gh auth login
   ```
   *(Selecione `GitHub.com` ➔ `HTTPS` ➔ `Login with a web browser`, copie o código e autorize no Chrome).*

3. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/alanlisboa100/black-gemine-pro.git
   cd black-gemine-pro
   ```

4. **Instalar o Runtime do BLACKCORE:**
   ```bash
   bash INSTALAR-BLACKCORE.sh --profile core
   ```

5. **Configurar suas Chaves de API e Iniciar:**
   ```bash
   export GEMINI_API_KEY=[REDACTED]
   # Chaves adicionais para o Pool (opcional):
   # export GEMINI_API_KEY_2="SUA_CHAVE_2"
   # export GEMINI_API_KEY_3="SUA_CHAVE_3"

   blackcore
   ```

---

## 💻 6. Instalação no Computador (Linux / WSL / Mac)

```bash
# 1. Clonar
git clone https://github.com/alanlisboa100/black-gemine-pro.git
cd black-gemine-pro

# 2. Instalar dependências e CLI global
npm install
bash INSTALAR-BLACKCORE.sh

# 3. Executar
export GEMINI_API_KEY=[REDACTED]
blackcore
```

---

## 🔒 7. Segurança & Privacidade

Este repositório possui uma regra estrita de segurança:
* O arquivo `.gitignore` bloqueia qualquer tentativa de commit de diretórios de configuração privada (`.blackcore/config/`, `secrets.json`, `.env`, logs de sessões e cookies de navegador).
* O repositório é configurado como **Privado (Private)** para manter a sua arquitetura e desenvolvimento sob controle total.

---
🖤 **Desenvolvido com excelência por Alan Lisboa (Misuki Core) no ecossistema BLACKCORE.**
