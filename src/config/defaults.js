export const VERSION="3.8.1";

export const DEFAULT_CONFIG={
  version:2,
  provider:"openai",
  model:"gpt-5.6-luna",
  thinking:true,
  reasoningEffort:"medium",
  modelReasoning:{
    "openai/gpt-5.6-sol":"high",
    "openai/gpt-5.6-terra":"high",
    "openai/gpt-5.6-luna":"medium",
    "deepseek/deepseek-v4-flash":"high",
    "deepseek/deepseek-v4-pro":"high",
    "google/gemini-3.8-flash":"high",
    "google/gemini-3.7-flash":"high",
    "google/gemini-3.6-flash":"medium",
    "google/gemini-3.5-flash-lite":"minimal",
    "google/gemini-3.1-flash-lite":"minimal",
    "google/gemini-3.6-flash":"medium",
    "google/gemma-4-31b-it":"minimal",
    "google/gemma-4-26b-a4b-it":"minimal"
    ,"local/blackcore-local":"medium"
  },
  mode:"ACT",
  permissionProfile:"balanced",
  workStyle:"adaptive",
  uiLanguage:"en",
  responseLanguage:"auto",
  translateUserInput:false,
  imageInput:{maxFiles:5,maxFileBytes:20971520,maxTotalBytes:52428800},
  animation:true,
  stream:true,
  showTokenUsage:false,
  modelLock:true,
  modelSelectionPolicyVersion:2,
  videoStudioPolicyVersion:6,
  photoStudioPolicyVersion:4,
  semanticRouting:{
    enabled:true,
    minScore:0.64,
    embedding:{enabled:false,baseUrl:"http://127.0.0.1:8081/v1",model:"Qwen3-Embedding-0.6B",apiKeyEnv:"BLACKCORE_EMBEDDING_API_KEY",allowRemote:false,timeoutMs:12000}
  },
  browser:{
    persistentProfiles:true,
    defaultProfile:"main",
    allowHeadedLogin:true,
    requireAuthenticatedActionConfirmation:true
  },
  autoRoute:false,
  autoFallback:false,
  crossProviderFallback:false,
  fallbackModels:["openai/gpt-5.6-luna","deepseek/deepseek-v4-flash","deepseek/deepseek-v4-pro"],
  maxAgentTurns:250,
  maxAgentToolCalls:500,
  maxAgentWallMs:14400000,
  agentRepairCycles:3,
  agentTeamMode:"deep",
  agentTaskGraphMode:"adaptive",
  maxParallelAgents:4,
  agentTeamTurns:{planner:12,programmer:20,tester:12,reviewer:12,investigator:10},
  agentTaskBudget:{enabled:true,maxInputTokens:6000000,maxOutputTokens:400000,maxTotalTokens:8000000,maxCostUSD:10,warnRatio:0.85},
  subagentMaxTurns:20,
  maxParallelReadTools:4,
  maxToolOutputChars:120000,
  maxReadChars:160000,
  contextReserveTokens:32000,
  autoCompactRatio:0.78,
  compactionKeepMessages:10,
  requestTimeoutMs:180000,
  retry:{maxAttempts:4,baseDelayMs:800,maxDelayMs:10000},
  confirmDangerous:true,
  confirmExternalReads:true,
  confirmExternalWrites:true,
  trustedProjects:[],
  trustedGlobalExtensions:[],
  trustedPackages:[],
  trustedMcpServers:[],
  activeTools:null,
  scopedModels:[],
  editor:process.env.EDITOR||process.env.VISUAL||"nano",
  theme:"blackcore",
  providers:{
    openai:{
      type:"openai-responses",
      baseUrl:"https://api.openai.com/v1",
      apiKeyEnv:"OPENAI_API_KEY",
      models:[
        {id:"gpt-5.6-sol",label:"GPT-5.6 Sol (OpenAI)",context:1050000,maxOutput:128000,vision:true,tools:true,responses:true,pricing:{input:5.00,cacheRead:0.50,output:30.00,currency:"USD",tierNote:">272K input: 2x input · 1.5x output"}},
        {id:"gpt-5.6-terra",label:"GPT-5.6 Terra (OpenAI)",context:1050000,maxOutput:128000,vision:true,tools:true,responses:true,pricing:{input:2.00,cacheRead:0.20,output:12.00,currency:"USD",tierNote:">272K input: 2x input · 1.5x output"}},
        {id:"gpt-5.6-luna",label:"GPT-5.6 Luna (OpenAI)",context:1050000,maxOutput:128000,vision:true,tools:true,responses:true,pricing:{input:0.20,cacheRead:0.02,output:1.20,currency:"USD",tierNote:">272K input: 2x input · 1.5x output"}}
      ]
    },
    tokenharbor:{
      type:"tokenharbor",
      baseUrl:"https://tokenharbor.ai/v1",
      apiKeyEnv:"TOKENHARBOR_API_KEY",
      apiKeyEnvs:["TOKENHARBOR_API_KEY","TOKENHARBOR_API_KEY_2","TOKENHARBOR_API_KEY_3","TOKENHARBOR_API_KEY_4","TOKENHARBOR_API_KEY_5","TOKENHARBOR_API_KEY_6","TOKENHARBOR_API_KEY_7","TOKENHARBOR_API_KEY_8"],
      keyPool:{enabled:true,maxKeys:8,strategy:"sequential-sticky",handoffSafeStreaming:true},
      freeTier:true,
      fastPoolModels:["deepseek-v4.1-flash:free","deepseek-v4-flash:free","mimo-v2.6-flash:free","mimo-v2.5:free"],
      models:[
        {id:"tokenharbor-fast-pool",serverModel:"deepseek-v4.1-flash:free",label:"★ Token Harbor Fast Pool (DeepSeek V4.1 · DeepSeek V4 · MiMo 2.6)",context:262144,maxOutput:65536,thinking:true,tools:true,freeTier:true,pool:true,description:"Multi-Fast Pool (8 Chaves). Rotação ultra-rápida entre DeepSeek V4.1, DeepSeek V4 e MiMo 2.6 Flash."},
        {id:"deepseek-v4.1-flash:free",serverModel:"deepseek-v4.1-flash:free",label:"DeepSeek V4.1 Flash Free (Token Harbor)",context:262144,maxOutput:65536,thinking:true,tools:true,freeTier:true,description:"Nova versão ultra-rápida DeepSeek V4.1 Flash gratuito via Token Harbor."},
        {id:"deepseek-v4-flash:free",serverModel:"deepseek-v4-flash:free",label:"DeepSeek V4 Flash Free (Token Harbor)",context:262144,maxOutput:65536,thinking:true,tools:true,freeTier:true,description:"Modelo DeepSeek V4 Flash gratuito via Token Harbor."},
        {id:"mimo-v2.6-flash:free",serverModel:"mimo-v2.6-flash:free",label:"MiMo 2.6 Flash Free (Token Harbor)",context:262144,maxOutput:65536,thinking:true,tools:true,freeTier:true,description:"Modelo ultra-rápido da Xiaomi via Token Harbor (1.73s TTFT)."},
        {id:"mimo-v2.5:free",serverModel:"mimo-v2.5:free",label:"MiMo 2.5 Free (Token Harbor)",context:262144,maxOutput:65536,thinking:true,tools:true,freeTier:true,description:"Modelo gratuito MiMo 2.5 via Token Harbor."},
        {id:"qwen3.8-flash:free",serverModel:"qwen3.8-flash:free",label:"Qwen 3.8 Flash Free (Token Harbor)",context:262144,maxOutput:65536,thinking:true,tools:true,freeTier:true,description:"Modelo ultra-rápido da Alibaba via Token Harbor."},
        {id:"deepseek-v4-pro",serverModel:"deepseek-v4-pro",label:"DeepSeek V4 Pro (Token Harbor)",context:262144,maxOutput:65536,thinking:true,tools:true,pricing:{input:1.32,cacheRead:0.003625,output:3.96,currency:"USD"}}
      ]
    },
    deepseek:{
      type:"deepseek",
      baseUrl:"https://tokenharbor.ai/v1",
      apiKeyEnv:"DEEPSEEK_API_KEY",
      models:[
        {id:"deepseek-v4-flash",serverModel:"deepseek-v4-flash:free",label:"DeepSeek V4 Flash (Free)",context:262144,maxOutput:65536,thinking:true,tools:true,pricing:{input:0,cacheRead:0,output:0,currency:"USD"}},
        {id:"deepseek-v4-flash:free",serverModel:"deepseek-v4-flash:free",label:"DeepSeek V4 Flash (Free)",context:262144,maxOutput:65536,thinking:true,tools:true,pricing:{input:0,cacheRead:0,output:0,currency:"USD"}},
        {id:"deepseek-v4-pro",label:"DeepSeek V4 Pro",context:262144,maxOutput:65536,thinking:true,tools:true,pricing:{input:1.32,cacheRead:0.003625,output:3.96,currency:"USD"}}
      ]
    },
    google:{
      type:"google",
      baseUrl:"https://generativelanguage.googleapis.com/v1beta/openai",
      nativeBaseUrl:"https://generativelanguage.googleapis.com/v1beta",
      apiKeyEnv:"GEMINI_API_KEY",
      apiKeyEnvs:["GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7","GEMINI_API_KEY_8"],
      googleKeyPool:{enabled:true,maxKeys:8,strategy:"sequential-sticky",handoffSafeStreaming:true,lastSuccessSlot:1,cooldownMs:{quota:60000,auth:600000,server:15000}},
      maxActiveTools:20,
      freeTier:true,
      freePoolModels:["gemini-3.8-flash","gemini-3.7-flash","gemini-3.6-flash","gemini-3.5-flash-lite","gemini-3.1-flash-lite","gemma-4-31b-it","gemma-4-26b-a4b-it","gemini-3.6-flash"],
      models:[
        {id:"google-free-pool",label:"★ Google Supremo Pool (Gemini 3.8 · 3.7 · 3.6 · Flash-Lite)",context:1048576,maxOutput:65536,vision:true,tools:true,freeTier:true,pool:true,description:"Pool 100% Puro Google AI Studio (8 Chaves). Modelos Flash-Lite para conversa normal e Gemini 3.8/3.7 para tarefas pesadas de engenharia."},
        {id:"gemini-3.8-flash",label:"Gemini 3.8 Flash (Google AI Studio)",context:1048576,maxOutput:65536,vision:true,tools:true,computerUse:true,freeTier:true,description:"Latest generation Gemini 3.8 Flash for advanced reasoning, agentic coding, ultra-fast performance and Elite Pool priority."},
        {id:"gemini-3.7-flash",label:"Gemini 3.7 Flash (Google AI Studio)",context:1048576,maxOutput:65536,vision:true,tools:true,computerUse:true,freeTier:true,description:"Latest stable Gemini Flash for complex coding, agentic workflows and reliable multi-step execution."},
        {id:"gemini-3.5-flash-lite",label:"Gemini 3.5 Flash-Lite (Google AI Studio)",context:1048576,maxOutput:65536,vision:true,tools:true,freeTier:true},
        {id:"gemini-3.1-flash-lite",label:"Gemini 3.1 Flash-Lite (Google AI Studio)",context:1048576,maxOutput:65536,vision:true,tools:true,freeTier:true},
        {id:"gemma-4-31b-it",label:"Gemma 4 31B IT (Google AI Studio)",context:262144,maxOutput:32768,vision:true,tools:true,freeTier:true,nativeGoogle:true},
        {id:"gemma-4-26b-a4b-it",label:"Gemma 4 26B A4B IT (Google AI Studio)",context:262144,maxOutput:32768,vision:true,tools:true,freeTier:true,nativeGoogle:true},
        {id:"gemini-3.6-flash",label:"Gemini 3.6 Flash (Google AI Studio)",context:1048576,maxOutput:65536,vision:true,tools:true,freeTier:true},
        {id:"gemini-3.6-flash",label:"Gemini 2.5 Flash (Google AI Studio)",context:1048576,maxOutput:65536,vision:true,tools:true,freeTier:true}
      ]
    },
    local:{
      type:"llama-cpp",
      baseUrl:"http://127.0.0.1:8080/v1",
      apiKeyOptional:true,
      local:true,
      serverModel:"blackcore-local",
      models:[
        {id:"blackcore-local",label:"Local GGUF · llama.cpp",context:8192,maxOutput:4096,vision:false,tools:true,freeTier:true,local:true,description:"Runs the GGUF model loaded by llama-server on this device; no cloud API key is required."}
      ]
    },
    wavespeed:{
    "type": "wavespeed",
    "ecoPoolModels": [
        "qwen/qwen3.7-flash",
        "mistralai/mistral-nemo",
        "deepseek/deepseek-v4-flash-0731"
    ],
    "baseUrl": "https://llm.wavespeed.ai/v1",
    "apiKeyEnv": "WAVESPEED_API_KEY",
    "models": [
        {
            "id": "wavespeed-eco-pool",
            "serverModel": "qwen/qwen3.7-flash",
            "label": "★ WaveSpeed Eco Pool (Qwen 3.7 · Mistral · DeepSeek)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pool": true,
            "description": "Trio Mais Barato da WaveSpeed: Qwen 3.7 Flash ($0.03) → Mistral NeMo ($0.019) → DeepSeek V4 Flash ($0.06). Failover automático resiliente sem travar a sessão.",
            "pricing": {
                "input": 0.03,
                "output": 0.13,
                "currency": "USD"
            }
        },
        {
            "id": "aion-labs/aion-2.0",
            "serverModel": "aion-labs/aion-2.0",
            "label": "Aion-labs: aion-2.0 (WaveSpeed)",
            "context": 131072,
            "maxOutput": 32768,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.8,
                "output": 1.6,
                "currency": "USD"
            }
        },
        {
            "id": "aion-2.0",
            "serverModel": "aion-labs/aion-2.0",
            "label": "Aion-labs: aion-2.0 (WaveSpeed)",
            "context": 131072,
            "maxOutput": 32768,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.8,
                "output": 1.6,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen-plus",
            "serverModel": "qwen/qwen-plus",
            "label": "Qwen: qwen-plus (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 32768,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.26,
                "output": 0.78,
                "currency": "USD"
            }
        },
        {
            "id": "qwen-plus",
            "serverModel": "qwen/qwen-plus",
            "label": "Qwen: qwen-plus (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 32768,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.26,
                "output": 0.78,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen2.5-vl-72b-instruct",
            "serverModel": "qwen/qwen2.5-vl-72b-instruct",
            "label": "Qwen: qwen2.5-vl-72b-instruct (WaveSpeed)",
            "context": 32000,
            "maxOutput": 16384,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.8,
                "output": 1.0,
                "currency": "USD"
            }
        },
        {
            "id": "qwen2.5-vl-72b-instruct",
            "serverModel": "qwen/qwen2.5-vl-72b-instruct",
            "label": "Qwen: qwen2.5-vl-72b-instruct (WaveSpeed)",
            "context": 32000,
            "maxOutput": 16384,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.8,
                "output": 1.0,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3-235b-a22b",
            "serverModel": "qwen/qwen3-235b-a22b",
            "label": "Qwen: qwen3-235b-a22b (WaveSpeed)",
            "context": 131072,
            "maxOutput": 8192,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.455,
                "output": 1.82,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3-235b-a22b",
            "serverModel": "qwen/qwen3-235b-a22b",
            "label": "Qwen: qwen3-235b-a22b (WaveSpeed)",
            "context": 131072,
            "maxOutput": 8192,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.455,
                "output": 1.82,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3-coder",
            "serverModel": "qwen/qwen3-coder",
            "label": "Qwen: qwen3-coder (WaveSpeed)",
            "context": 262144,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.38,
                "output": 1.55,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3-coder",
            "serverModel": "qwen/qwen3-coder",
            "label": "Qwen: qwen3-coder (WaveSpeed)",
            "context": 262144,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.38,
                "output": 1.55,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3-coder-next",
            "serverModel": "qwen/qwen3-coder-next",
            "label": "Qwen: qwen3-coder-next (WaveSpeed)",
            "context": 262144,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.12,
                "output": 0.8,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3-coder-next",
            "serverModel": "qwen/qwen3-coder-next",
            "label": "Qwen: qwen3-coder-next (WaveSpeed)",
            "context": 262144,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.12,
                "output": 0.8,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3-vl-235b-a22b-instruct",
            "serverModel": "qwen/qwen3-vl-235b-a22b-instruct",
            "label": "Qwen: qwen3-vl-235b-a22b-instruct (WaveSpeed)",
            "context": 262144,
            "maxOutput": 16384,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.21,
                "output": 1.9,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3-vl-235b-a22b-instruct",
            "serverModel": "qwen/qwen3-vl-235b-a22b-instruct",
            "label": "Qwen: qwen3-vl-235b-a22b-instruct (WaveSpeed)",
            "context": 262144,
            "maxOutput": 16384,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.21,
                "output": 1.9,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3-vl-30b-a3b-instruct",
            "serverModel": "qwen/qwen3-vl-30b-a3b-instruct",
            "label": "Qwen: qwen3-vl-30b-a3b-instruct (WaveSpeed)",
            "context": 131072,
            "maxOutput": 32768,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.15,
                "output": 0.6,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3-vl-30b-a3b-instruct",
            "serverModel": "qwen/qwen3-vl-30b-a3b-instruct",
            "label": "Qwen: qwen3-vl-30b-a3b-instruct (WaveSpeed)",
            "context": 131072,
            "maxOutput": 32768,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.15,
                "output": 0.6,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3-vl-32b-instruct",
            "serverModel": "qwen/qwen3-vl-32b-instruct",
            "label": "Qwen: qwen3-vl-32b-instruct (WaveSpeed)",
            "context": 131072,
            "maxOutput": 32768,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.104,
                "output": 0.416,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3-vl-32b-instruct",
            "serverModel": "qwen/qwen3-vl-32b-instruct",
            "label": "Qwen: qwen3-vl-32b-instruct (WaveSpeed)",
            "context": 131072,
            "maxOutput": 32768,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.104,
                "output": 0.416,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3-vl-8b-instruct",
            "serverModel": "qwen/qwen3-vl-8b-instruct",
            "label": "Qwen: qwen3-vl-8b-instruct (WaveSpeed)",
            "context": 131072,
            "maxOutput": 32768,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.117,
                "output": 0.455,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3-vl-8b-instruct",
            "serverModel": "qwen/qwen3-vl-8b-instruct",
            "label": "Qwen: qwen3-vl-8b-instruct (WaveSpeed)",
            "context": 131072,
            "maxOutput": 32768,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.117,
                "output": 0.455,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.6-27b",
            "serverModel": "qwen/qwen3.6-27b",
            "label": "Qwen: qwen3.6-27b (WaveSpeed)",
            "context": 262144,
            "maxOutput": 81920,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 2.0,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.6-27b",
            "serverModel": "qwen/qwen3.6-27b",
            "label": "Qwen: qwen3.6-27b (WaveSpeed)",
            "context": 262144,
            "maxOutput": 81920,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 2.0,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.6-35b-a3b",
            "serverModel": "qwen/qwen3.6-35b-a3b",
            "label": "Qwen: qwen3.6-35b-a3b (WaveSpeed)",
            "context": 262144,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1,
                "output": 0.9,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.6-35b-a3b",
            "serverModel": "qwen/qwen3.6-35b-a3b",
            "label": "Qwen: qwen3.6-35b-a3b (WaveSpeed)",
            "context": 262144,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1,
                "output": 0.9,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.6-flash",
            "serverModel": "qwen/qwen3.6-flash",
            "label": "Qwen: qwen3.6-flash (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1875,
                "output": 1.125,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.6-flash",
            "serverModel": "qwen/qwen3.6-flash",
            "label": "Qwen: qwen3.6-flash (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1875,
                "output": 1.125,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.6-plus",
            "serverModel": "qwen/qwen3.6-plus",
            "label": "Qwen: qwen3.6-plus (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.325,
                "output": 1.95,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.6-plus",
            "serverModel": "qwen/qwen3.6-plus",
            "label": "Qwen: qwen3.6-plus (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.325,
                "output": 1.95,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.7-flash",
            "serverModel": "qwen/qwen3.7-flash",
            "label": "Qwen: qwen3.7-flash (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.03,
                "output": 0.13,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.7-flash",
            "serverModel": "qwen/qwen3.7-flash",
            "label": "Qwen: qwen3.7-flash (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.03,
                "output": 0.13,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.7-max",
            "serverModel": "qwen/qwen3.7-max",
            "label": "Qwen: qwen3.7-max (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.475,
                "output": 4.425,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.7-max",
            "serverModel": "qwen/qwen3.7-max",
            "label": "Qwen: qwen3.7-max (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.475,
                "output": 4.425,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.7-plus",
            "serverModel": "qwen/qwen3.7-plus",
            "label": "Qwen: qwen3.7-plus (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.32,
                "output": 1.28,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.7-plus",
            "serverModel": "qwen/qwen3.7-plus",
            "label": "Qwen: qwen3.7-plus (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.32,
                "output": 1.28,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.8-flash",
            "serverModel": "qwen/qwen3.8-flash",
            "label": "Qwen: qwen3.8-flash (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.15,
                "output": 0.47,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.8-flash",
            "serverModel": "qwen/qwen3.8-flash",
            "label": "Qwen: qwen3.8-flash (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.15,
                "output": 0.47,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.8-max-0902",
            "serverModel": "qwen/qwen3.8-max-0902",
            "label": "Qwen: qwen3.8-max-0902 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 6.0,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.8-max-0902",
            "serverModel": "qwen/qwen3.8-max-0902",
            "label": "Qwen: qwen3.8-max-0902 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 6.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-3-haiku",
            "serverModel": "anthropic/claude-3-haiku",
            "label": "Anthropic: claude-3-haiku (WaveSpeed)",
            "context": 200000,
            "maxOutput": 4096,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.25,
                "output": 1.25,
                "currency": "USD"
            }
        },
        {
            "id": "claude-3-haiku",
            "serverModel": "anthropic/claude-3-haiku",
            "label": "Anthropic: claude-3-haiku (WaveSpeed)",
            "context": 200000,
            "maxOutput": 4096,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.25,
                "output": 1.25,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-fable-5",
            "serverModel": "anthropic/claude-fable-5",
            "label": "Anthropic: claude-fable-5 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 10.0,
                "output": 50.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-fable-5",
            "serverModel": "anthropic/claude-fable-5",
            "label": "Anthropic: claude-fable-5 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 10.0,
                "output": 50.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-fable-5.1",
            "serverModel": "anthropic/claude-fable-5.1",
            "label": "Anthropic: claude-fable-5.1 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 10.0,
                "output": 50.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-fable-5.1",
            "serverModel": "anthropic/claude-fable-5.1",
            "label": "Anthropic: claude-fable-5.1 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 10.0,
                "output": 50.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-haiku-4.5",
            "serverModel": "anthropic/claude-haiku-4.5",
            "label": "Anthropic: claude-haiku-4.5 (WaveSpeed)",
            "context": 200000,
            "maxOutput": 64000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.0,
                "output": 5.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-haiku-4.5",
            "serverModel": "anthropic/claude-haiku-4.5",
            "label": "Anthropic: claude-haiku-4.5 (WaveSpeed)",
            "context": 200000,
            "maxOutput": 64000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.0,
                "output": 5.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-opus-4.5",
            "serverModel": "anthropic/claude-opus-4.5",
            "label": "Anthropic: claude-opus-4.5 (WaveSpeed)",
            "context": 200000,
            "maxOutput": 64000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 25.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-opus-4.5",
            "serverModel": "anthropic/claude-opus-4.5",
            "label": "Anthropic: claude-opus-4.5 (WaveSpeed)",
            "context": 200000,
            "maxOutput": 64000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 25.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-opus-4.6",
            "serverModel": "anthropic/claude-opus-4.6",
            "label": "Anthropic: claude-opus-4.6 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 25.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-opus-4.6",
            "serverModel": "anthropic/claude-opus-4.6",
            "label": "Anthropic: claude-opus-4.6 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 25.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-opus-4.7",
            "serverModel": "anthropic/claude-opus-4.7",
            "label": "Anthropic: claude-opus-4.7 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 25.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-opus-4.7",
            "serverModel": "anthropic/claude-opus-4.7",
            "label": "Anthropic: claude-opus-4.7 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 25.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-opus-4.8",
            "serverModel": "anthropic/claude-opus-4.8",
            "label": "Anthropic: claude-opus-4.8 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 25.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-opus-4.8",
            "serverModel": "anthropic/claude-opus-4.8",
            "label": "Anthropic: claude-opus-4.8 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 25.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-opus-5",
            "serverModel": "anthropic/claude-opus-5",
            "label": "Anthropic: claude-opus-5 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 25.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-opus-5",
            "serverModel": "anthropic/claude-opus-5",
            "label": "Anthropic: claude-opus-5 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 25.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-sonnet-4",
            "serverModel": "anthropic/claude-sonnet-4",
            "label": "Anthropic: claude-sonnet-4 (WaveSpeed)",
            "context": 200000,
            "maxOutput": 64000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 3.0,
                "output": 15.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-sonnet-4",
            "serverModel": "anthropic/claude-sonnet-4",
            "label": "Anthropic: claude-sonnet-4 (WaveSpeed)",
            "context": 200000,
            "maxOutput": 64000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 3.0,
                "output": 15.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-sonnet-4.5",
            "serverModel": "anthropic/claude-sonnet-4.5",
            "label": "Anthropic: claude-sonnet-4.5 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 64000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 3.0,
                "output": 15.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-sonnet-4.5",
            "serverModel": "anthropic/claude-sonnet-4.5",
            "label": "Anthropic: claude-sonnet-4.5 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 64000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 3.0,
                "output": 15.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-sonnet-4.6",
            "serverModel": "anthropic/claude-sonnet-4.6",
            "label": "Anthropic: claude-sonnet-4.6 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 3.0,
                "output": 15.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-sonnet-4.6",
            "serverModel": "anthropic/claude-sonnet-4.6",
            "label": "Anthropic: claude-sonnet-4.6 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 3.0,
                "output": 15.0,
                "currency": "USD"
            }
        },
        {
            "id": "anthropic/claude-sonnet-5",
            "serverModel": "anthropic/claude-sonnet-5",
            "label": "Anthropic: claude-sonnet-5 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 10.0,
                "currency": "USD"
            }
        },
        {
            "id": "claude-sonnet-5",
            "serverModel": "anthropic/claude-sonnet-5",
            "label": "Anthropic: claude-sonnet-5 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 10.0,
                "currency": "USD"
            }
        },
        {
            "id": "z-ai/glm-5.1",
            "serverModel": "z-ai/glm-5.1",
            "label": "Z-ai: glm-5.1 (WaveSpeed)",
            "context": 202752,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.4,
                "output": 4.4,
                "currency": "USD"
            }
        },
        {
            "id": "glm-5.1",
            "serverModel": "z-ai/glm-5.1",
            "label": "Z-ai: glm-5.1 (WaveSpeed)",
            "context": 202752,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.4,
                "output": 4.4,
                "currency": "USD"
            }
        },
        {
            "id": "z-ai/glm-5.2",
            "serverModel": "z-ai/glm-5.2",
            "label": "Z-ai: glm-5.2 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 262144,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.4,
                "output": 4.4,
                "currency": "USD"
            }
        },
        {
            "id": "glm-5.2",
            "serverModel": "z-ai/glm-5.2",
            "label": "Z-ai: glm-5.2 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 262144,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.4,
                "output": 4.4,
                "currency": "USD"
            }
        },
        {
            "id": "z-ai/glm-5.3",
            "serverModel": "z-ai/glm-5.3",
            "label": "Z-ai: glm-5.3 (WaveSpeed)",
            "context": 1310720,
            "maxOutput": 943717,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.4,
                "output": 4.4,
                "currency": "USD"
            }
        },
        {
            "id": "glm-5.3",
            "serverModel": "z-ai/glm-5.3",
            "label": "Z-ai: glm-5.3 (WaveSpeed)",
            "context": 1310720,
            "maxOutput": 943717,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.4,
                "output": 4.4,
                "currency": "USD"
            }
        },
        {
            "id": "z-ai/glm-5.3-flash",
            "serverModel": "z-ai/glm-5.3-flash",
            "label": "Z-ai: glm-5.3-flash (WaveSpeed)",
            "context": 1310720,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.15,
                "output": 0.5,
                "currency": "USD"
            }
        },
        {
            "id": "glm-5.3-flash",
            "serverModel": "z-ai/glm-5.3-flash",
            "label": "Z-ai: glm-5.3-flash (WaveSpeed)",
            "context": 1310720,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.15,
                "output": 0.5,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek/deepseek-chat",
            "serverModel": "deepseek/deepseek-chat",
            "label": "Deepseek: deepseek-chat (WaveSpeed)",
            "context": 163840,
            "maxOutput": 163840,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.286,
                "output": 1.143,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek-chat",
            "serverModel": "deepseek/deepseek-chat",
            "label": "Deepseek: deepseek-chat (WaveSpeed)",
            "context": 163840,
            "maxOutput": 163840,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.286,
                "output": 1.143,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek/deepseek-r1",
            "serverModel": "deepseek/deepseek-r1",
            "label": "Deepseek: deepseek-r1 (WaveSpeed)",
            "context": 64000,
            "maxOutput": 16000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.7,
                "output": 2.5,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek-r1",
            "serverModel": "deepseek/deepseek-r1",
            "label": "Deepseek: deepseek-r1 (WaveSpeed)",
            "context": 64000,
            "maxOutput": 16000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.7,
                "output": 2.5,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek/deepseek-v3.2",
            "serverModel": "deepseek/deepseek-v3.2",
            "label": "Deepseek: deepseek-v3.2 (WaveSpeed)",
            "context": 163840,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.269,
                "output": 0.4,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek-v3.2",
            "serverModel": "deepseek/deepseek-v3.2",
            "label": "Deepseek: deepseek-v3.2 (WaveSpeed)",
            "context": 163840,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.269,
                "output": 0.4,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek/deepseek-v4-flash",
            "serverModel": "deepseek/deepseek-v4-flash",
            "label": "Deepseek: deepseek-v4-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 384000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.14,
                "output": 0.28,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek-v4-flash",
            "serverModel": "deepseek/deepseek-v4-flash",
            "label": "Deepseek: deepseek-v4-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 384000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.14,
                "output": 0.28,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek/deepseek-v4-flash-0731",
            "serverModel": "deepseek/deepseek-v4-flash-0731",
            "label": "Deepseek: deepseek-v4-flash-0731 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 393216,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.06,
                "output": 0.12,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek-v4-flash-0731",
            "serverModel": "deepseek/deepseek-v4-flash-0731",
            "label": "Deepseek: deepseek-v4-flash-0731 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 393216,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.06,
                "output": 0.12,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek/deepseek-v4-flash-vision-exp",
            "serverModel": "deepseek/deepseek-v4-flash-vision-exp",
            "label": "Deepseek: deepseek-v4-flash-vision-exp (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 943718,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.44,
                "output": 1.32,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek-v4-flash-vision-exp",
            "serverModel": "deepseek/deepseek-v4-flash-vision-exp",
            "label": "Deepseek: deepseek-v4-flash-vision-exp (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 943718,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.44,
                "output": 1.32,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek/deepseek-v4-pro",
            "serverModel": "deepseek/deepseek-v4-pro",
            "label": "Deepseek: deepseek-v4-pro (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 384000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.65,
                "output": 3.301,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek-v4-pro",
            "serverModel": "deepseek/deepseek-v4-pro",
            "label": "Deepseek: deepseek-v4-pro (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 384000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.65,
                "output": 3.301,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek/deepseek-v4-pro-0813",
            "serverModel": "deepseek/deepseek-v4-pro-0813",
            "label": "Deepseek: deepseek-v4-pro-0813 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 384000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.32,
                "output": 3.96,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek-v4-pro-0813",
            "serverModel": "deepseek/deepseek-v4-pro-0813",
            "label": "Deepseek: deepseek-v4-pro-0813 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 384000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.32,
                "output": 3.96,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek/deepseek-v4.1-flash",
            "serverModel": "deepseek/deepseek-v4.1-flash",
            "label": "Deepseek: deepseek-v4.1-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 384000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.15,
                "output": 0.6,
                "currency": "USD"
            }
        },
        {
            "id": "deepseek-v4.1-flash",
            "serverModel": "deepseek/deepseek-v4.1-flash",
            "label": "Deepseek: deepseek-v4.1-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 384000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.15,
                "output": 0.6,
                "currency": "USD"
            }
        },
        {
            "id": "bytedance/ui-tars-1.5-7b",
            "serverModel": "bytedance/ui-tars-1.5-7b",
            "label": "Bytedance: ui-tars-1.5-7b (WaveSpeed)",
            "context": 128000,
            "maxOutput": 2048,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1,
                "output": 0.2,
                "currency": "USD"
            }
        },
        {
            "id": "ui-tars-1.5-7b",
            "serverModel": "bytedance/ui-tars-1.5-7b",
            "label": "Bytedance: ui-tars-1.5-7b (WaveSpeed)",
            "context": 128000,
            "maxOutput": 2048,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1,
                "output": 0.2,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-2.5-flash",
            "serverModel": "google/gemini-2.5-flash",
            "label": "Google: gemini-2.5-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65535,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 2.5,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-2.5-flash",
            "serverModel": "google/gemini-2.5-flash",
            "label": "Google: gemini-2.5-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65535,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 2.5,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-2.5-flash-lite",
            "serverModel": "google/gemini-2.5-flash-lite",
            "label": "Google: gemini-2.5-flash-lite (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65535,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1,
                "output": 0.4,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-2.5-flash-lite",
            "serverModel": "google/gemini-2.5-flash-lite",
            "label": "Google: gemini-2.5-flash-lite (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65535,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1,
                "output": 0.4,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-2.5-pro",
            "serverModel": "google/gemini-2.5-pro",
            "label": "Google: gemini-2.5-pro (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.25,
                "output": 10.0,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-2.5-pro",
            "serverModel": "google/gemini-2.5-pro",
            "label": "Google: gemini-2.5-pro (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.25,
                "output": 10.0,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-3-flash-preview",
            "serverModel": "google/gemini-3-flash-preview",
            "label": "Google: gemini-3-flash-preview (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.5,
                "output": 3.0,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-3-flash-preview",
            "serverModel": "google/gemini-3-flash-preview",
            "label": "Google: gemini-3-flash-preview (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.5,
                "output": 3.0,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-3.1-flash-lite",
            "serverModel": "google/gemini-3.1-flash-lite",
            "label": "Google: gemini-3.1-flash-lite (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.25,
                "output": 1.5,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-3.1-flash-lite",
            "serverModel": "google/gemini-3.1-flash-lite",
            "label": "Google: gemini-3.1-flash-lite (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.25,
                "output": 1.5,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-3.1-pro-preview",
            "serverModel": "google/gemini-3.1-pro-preview",
            "label": "Google: gemini-3.1-pro-preview (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 12.0,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-3.1-pro-preview",
            "serverModel": "google/gemini-3.1-pro-preview",
            "label": "Google: gemini-3.1-pro-preview (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 12.0,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-3.1-pro-preview-customtools",
            "serverModel": "google/gemini-3.1-pro-preview-customtools",
            "label": "Google: gemini-3.1-pro-preview-customtools (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 12.0,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-3.1-pro-preview-customtools",
            "serverModel": "google/gemini-3.1-pro-preview-customtools",
            "label": "Google: gemini-3.1-pro-preview-customtools (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 12.0,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-3.5-flash",
            "serverModel": "google/gemini-3.5-flash",
            "label": "Google: gemini-3.5-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.5,
                "output": 9.0,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-3.5-flash",
            "serverModel": "google/gemini-3.5-flash",
            "label": "Google: gemini-3.5-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.5,
                "output": 9.0,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-3.5-flash-lite",
            "serverModel": "google/gemini-3.5-flash-lite",
            "label": "Google: gemini-3.5-flash-lite (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 2.5,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-3.5-flash-lite",
            "serverModel": "google/gemini-3.5-flash-lite",
            "label": "Google: gemini-3.5-flash-lite (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 2.5,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-3.6-flash",
            "serverModel": "google/gemini-3.6-flash",
            "label": "Google: gemini-3.6-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.75,
                "output": 3.75,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-3.6-flash",
            "serverModel": "google/gemini-3.6-flash",
            "label": "Google: gemini-3.6-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.75,
                "output": 3.75,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-3.7-flash",
            "serverModel": "google/gemini-3.7-flash",
            "label": "Google: gemini-3.7-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.5,
                "output": 7.5,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-3.7-flash",
            "serverModel": "google/gemini-3.7-flash",
            "label": "Google: gemini-3.7-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.5,
                "output": 7.5,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemini-3.8-flash",
            "serverModel": "google/gemini-3.8-flash",
            "label": "Google: gemini-3.8-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.5,
                "output": 7.5,
                "currency": "USD"
            }
        },
        {
            "id": "gemini-3.8-flash",
            "serverModel": "google/gemini-3.8-flash",
            "label": "Google: gemini-3.8-flash (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.5,
                "output": 7.5,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemma-4-26b-a4b-it",
            "serverModel": "google/gemma-4-26b-a4b-it",
            "label": "Google: gemma-4-26b-a4b-it (WaveSpeed)",
            "context": 262144,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.09,
                "output": 0.3,
                "currency": "USD"
            }
        },
        {
            "id": "gemma-4-26b-a4b-it",
            "serverModel": "google/gemma-4-26b-a4b-it",
            "label": "Google: gemma-4-26b-a4b-it (WaveSpeed)",
            "context": 262144,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.09,
                "output": 0.3,
                "currency": "USD"
            }
        },
        {
            "id": "google/gemma-4-31b-it",
            "serverModel": "google/gemma-4-31b-it",
            "label": "Google: gemma-4-31b-it (WaveSpeed)",
            "context": 262144,
            "maxOutput": 262144,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.09,
                "output": 0.34,
                "currency": "USD"
            }
        },
        {
            "id": "gemma-4-31b-it",
            "serverModel": "google/gemma-4-31b-it",
            "label": "Google: gemma-4-31b-it (WaveSpeed)",
            "context": 262144,
            "maxOutput": 262144,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.09,
                "output": 0.34,
                "currency": "USD"
            }
        },
        {
            "id": "meta-llama/llama-3.1-8b-instruct",
            "serverModel": "meta-llama/llama-3.1-8b-instruct",
            "label": "Meta-llama: llama-3.1-8b-instruct (WaveSpeed)",
            "context": 16384,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.05,
                "output": 0.08,
                "currency": "USD"
            }
        },
        {
            "id": "llama-3.1-8b-instruct",
            "serverModel": "meta-llama/llama-3.1-8b-instruct",
            "label": "Meta-llama: llama-3.1-8b-instruct (WaveSpeed)",
            "context": 16384,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.05,
                "output": 0.08,
                "currency": "USD"
            }
        },
        {
            "id": "meta-llama/llama-3.3-70b-instruct",
            "serverModel": "meta-llama/llama-3.3-70b-instruct",
            "label": "Meta-llama: llama-3.3-70b-instruct (WaveSpeed)",
            "context": 131072,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1,
                "output": 0.32,
                "currency": "USD"
            }
        },
        {
            "id": "llama-3.3-70b-instruct",
            "serverModel": "meta-llama/llama-3.3-70b-instruct",
            "label": "Meta-llama: llama-3.3-70b-instruct (WaveSpeed)",
            "context": 131072,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1,
                "output": 0.32,
                "currency": "USD"
            }
        },
        {
            "id": "meta-llama/llama-guard-4-12b",
            "serverModel": "meta-llama/llama-guard-4-12b",
            "label": "Meta-llama: llama-guard-4-12b (WaveSpeed)",
            "context": 163840,
            "maxOutput": 4096,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.18,
                "output": 0.18,
                "currency": "USD"
            }
        },
        {
            "id": "llama-guard-4-12b",
            "serverModel": "meta-llama/llama-guard-4-12b",
            "label": "Meta-llama: llama-guard-4-12b (WaveSpeed)",
            "context": 163840,
            "maxOutput": 4096,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.18,
                "output": 0.18,
                "currency": "USD"
            }
        },
        {
            "id": "minimax/minimax-m2.1",
            "serverModel": "minimax/minimax-m2.1",
            "label": "Minimax: minimax-m2.1 (WaveSpeed)",
            "context": 196608,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 1.2,
                "currency": "USD"
            }
        },
        {
            "id": "minimax-m2.1",
            "serverModel": "minimax/minimax-m2.1",
            "label": "Minimax: minimax-m2.1 (WaveSpeed)",
            "context": 196608,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 1.2,
                "currency": "USD"
            }
        },
        {
            "id": "minimax/minimax-m2.5",
            "serverModel": "minimax/minimax-m2.5",
            "label": "Minimax: minimax-m2.5 (WaveSpeed)",
            "context": 196608,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 1.2,
                "currency": "USD"
            }
        },
        {
            "id": "minimax-m2.5",
            "serverModel": "minimax/minimax-m2.5",
            "label": "Minimax: minimax-m2.5 (WaveSpeed)",
            "context": 196608,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 1.2,
                "currency": "USD"
            }
        },
        {
            "id": "minimax/minimax-m2.7",
            "serverModel": "minimax/minimax-m2.7",
            "label": "Minimax: minimax-m2.7 (WaveSpeed)",
            "context": 204800,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 1.2,
                "currency": "USD"
            }
        },
        {
            "id": "minimax-m2.7",
            "serverModel": "minimax/minimax-m2.7",
            "label": "Minimax: minimax-m2.7 (WaveSpeed)",
            "context": 204800,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 1.2,
                "currency": "USD"
            }
        },
        {
            "id": "minimax/minimax-m3",
            "serverModel": "minimax/minimax-m3",
            "label": "Minimax: minimax-m3 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 512000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 1.2,
                "currency": "USD"
            }
        },
        {
            "id": "minimax-m3",
            "serverModel": "minimax/minimax-m3",
            "label": "Minimax: minimax-m3 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 512000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 1.2,
                "currency": "USD"
            }
        },
        {
            "id": "mistralai/mistral-large",
            "serverModel": "mistralai/mistral-large",
            "label": "Mistralai: mistral-large (WaveSpeed)",
            "context": 128000,
            "maxOutput": 4096,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 6.0,
                "currency": "USD"
            }
        },
        {
            "id": "mistral-large",
            "serverModel": "mistralai/mistral-large",
            "label": "Mistralai: mistral-large (WaveSpeed)",
            "context": 128000,
            "maxOutput": 4096,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 6.0,
                "currency": "USD"
            }
        },
        {
            "id": "mistralai/mistral-nemo",
            "serverModel": "mistralai/mistral-nemo",
            "label": "Mistralai: mistral-nemo (WaveSpeed)",
            "context": 131072,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.019,
                "output": 0.05,
                "currency": "USD"
            }
        },
        {
            "id": "mistral-nemo",
            "serverModel": "mistralai/mistral-nemo",
            "label": "Mistralai: mistral-nemo (WaveSpeed)",
            "context": 131072,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.019,
                "output": 0.05,
                "currency": "USD"
            }
        },
        {
            "id": "mistralai/mistral-small-24b-instruct-2501",
            "serverModel": "mistralai/mistral-small-24b-instruct-2501",
            "label": "Mistralai: mistral-small-24b-instruct-2501 (WaveSpeed)",
            "context": 32768,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.05,
                "output": 0.08,
                "currency": "USD"
            }
        },
        {
            "id": "mistral-small-24b-instruct-2501",
            "serverModel": "mistralai/mistral-small-24b-instruct-2501",
            "label": "Mistralai: mistral-small-24b-instruct-2501 (WaveSpeed)",
            "context": 32768,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.05,
                "output": 0.08,
                "currency": "USD"
            }
        },
        {
            "id": "moonshotai/kimi-k2",
            "serverModel": "moonshotai/kimi-k2",
            "label": "Moonshotai: kimi-k2 (WaveSpeed)",
            "context": 131072,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.57,
                "output": 2.3,
                "currency": "USD"
            }
        },
        {
            "id": "kimi-k2",
            "serverModel": "moonshotai/kimi-k2",
            "label": "Moonshotai: kimi-k2 (WaveSpeed)",
            "context": 131072,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.57,
                "output": 2.3,
                "currency": "USD"
            }
        },
        {
            "id": "moonshotai/kimi-k2.5",
            "serverModel": "moonshotai/kimi-k2.5",
            "label": "Moonshotai: kimi-k2.5 (WaveSpeed)",
            "context": 262144,
            "maxOutput": 65535,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.45,
                "output": 2.25,
                "currency": "USD"
            }
        },
        {
            "id": "kimi-k2.5",
            "serverModel": "moonshotai/kimi-k2.5",
            "label": "Moonshotai: kimi-k2.5 (WaveSpeed)",
            "context": 262144,
            "maxOutput": 65535,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.45,
                "output": 2.25,
                "currency": "USD"
            }
        },
        {
            "id": "moonshotai/kimi-k2.6",
            "serverModel": "moonshotai/kimi-k2.6",
            "label": "Moonshotai: kimi-k2.6 (WaveSpeed)",
            "context": 262144,
            "maxOutput": 262142,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.95,
                "output": 4.0,
                "currency": "USD"
            }
        },
        {
            "id": "kimi-k2.6",
            "serverModel": "moonshotai/kimi-k2.6",
            "label": "Moonshotai: kimi-k2.6 (WaveSpeed)",
            "context": 262144,
            "maxOutput": 262142,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.95,
                "output": 4.0,
                "currency": "USD"
            }
        },
        {
            "id": "moonshotai/kimi-k2.7-code",
            "serverModel": "moonshotai/kimi-k2.7-code",
            "label": "Moonshotai: kimi-k2.7-code (WaveSpeed)",
            "context": 262144,
            "maxOutput": 262144,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.71,
                "output": 3.5,
                "currency": "USD"
            }
        },
        {
            "id": "kimi-k2.7-code",
            "serverModel": "moonshotai/kimi-k2.7-code",
            "label": "Moonshotai: kimi-k2.7-code (WaveSpeed)",
            "context": 262144,
            "maxOutput": 262144,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.71,
                "output": 3.5,
                "currency": "USD"
            }
        },
        {
            "id": "moonshotai/kimi-k3",
            "serverModel": "moonshotai/kimi-k3",
            "label": "Moonshotai: kimi-k3 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.6481,
                "output": 13.2827,
                "currency": "USD"
            }
        },
        {
            "id": "kimi-k3",
            "serverModel": "moonshotai/kimi-k3",
            "label": "Moonshotai: kimi-k3 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.6481,
                "output": 13.2827,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-4.1",
            "serverModel": "openai/gpt-4.1",
            "label": "Openai: gpt-4.1 (WaveSpeed)",
            "context": 1047576,
            "maxOutput": 32768,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 8.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-4.1",
            "serverModel": "openai/gpt-4.1",
            "label": "Openai: gpt-4.1 (WaveSpeed)",
            "context": 1047576,
            "maxOutput": 32768,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 8.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-4.1-mini",
            "serverModel": "openai/gpt-4.1-mini",
            "label": "Openai: gpt-4.1-mini (WaveSpeed)",
            "context": 1047576,
            "maxOutput": 32768,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.4,
                "output": 1.6,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-4.1-mini",
            "serverModel": "openai/gpt-4.1-mini",
            "label": "Openai: gpt-4.1-mini (WaveSpeed)",
            "context": 1047576,
            "maxOutput": 32768,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.4,
                "output": 1.6,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-4.1-nano",
            "serverModel": "openai/gpt-4.1-nano",
            "label": "Openai: gpt-4.1-nano (WaveSpeed)",
            "context": 1047576,
            "maxOutput": 32768,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1,
                "output": 0.4,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-4.1-nano",
            "serverModel": "openai/gpt-4.1-nano",
            "label": "Openai: gpt-4.1-nano (WaveSpeed)",
            "context": 1047576,
            "maxOutput": 32768,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.1,
                "output": 0.4,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-4o",
            "serverModel": "openai/gpt-4o",
            "label": "Openai: gpt-4o (WaveSpeed)",
            "context": 128000,
            "maxOutput": 16384,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 2.5,
                "output": 10.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-4o",
            "serverModel": "openai/gpt-4o",
            "label": "Openai: gpt-4o (WaveSpeed)",
            "context": 128000,
            "maxOutput": 16384,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 2.5,
                "output": 10.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-4o-mini",
            "serverModel": "openai/gpt-4o-mini",
            "label": "Openai: gpt-4o-mini (WaveSpeed)",
            "context": 128000,
            "maxOutput": 16384,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.15,
                "output": 0.6,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-4o-mini",
            "serverModel": "openai/gpt-4o-mini",
            "label": "Openai: gpt-4o-mini (WaveSpeed)",
            "context": 128000,
            "maxOutput": 16384,
            "vision": true,
            "tools": true,
            "pricing": {
                "input": 0.15,
                "output": 0.6,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5",
            "serverModel": "openai/gpt-5",
            "label": "Openai: gpt-5 (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.25,
                "output": 10.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5",
            "serverModel": "openai/gpt-5",
            "label": "Openai: gpt-5 (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.25,
                "output": 10.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5-mini",
            "serverModel": "openai/gpt-5-mini",
            "label": "Openai: gpt-5-mini (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.25,
                "output": 2.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5-mini",
            "serverModel": "openai/gpt-5-mini",
            "label": "Openai: gpt-5-mini (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.25,
                "output": 2.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5-nano",
            "serverModel": "openai/gpt-5-nano",
            "label": "Openai: gpt-5-nano (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.05,
                "output": 0.4,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5-nano",
            "serverModel": "openai/gpt-5-nano",
            "label": "Openai: gpt-5-nano (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.05,
                "output": 0.4,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.1",
            "serverModel": "openai/gpt-5.1",
            "label": "Openai: gpt-5.1 (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.25,
                "output": 10.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.1",
            "serverModel": "openai/gpt-5.1",
            "label": "Openai: gpt-5.1 (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.25,
                "output": 10.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.2",
            "serverModel": "openai/gpt-5.2",
            "label": "Openai: gpt-5.2 (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.75,
                "output": 14.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.2",
            "serverModel": "openai/gpt-5.2",
            "label": "Openai: gpt-5.2 (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.75,
                "output": 14.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.2-chat",
            "serverModel": "openai/gpt-5.2-chat",
            "label": "Openai: gpt-5.2-chat (WaveSpeed)",
            "context": 128000,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.75,
                "output": 14.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.2-chat",
            "serverModel": "openai/gpt-5.2-chat",
            "label": "Openai: gpt-5.2-chat (WaveSpeed)",
            "context": 128000,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.75,
                "output": 14.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.3-codex",
            "serverModel": "openai/gpt-5.3-codex",
            "label": "Openai: gpt-5.3-codex (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.75,
                "output": 14.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.3-codex",
            "serverModel": "openai/gpt-5.3-codex",
            "label": "Openai: gpt-5.3-codex (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.75,
                "output": 14.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.4",
            "serverModel": "openai/gpt-5.4",
            "label": "Openai: gpt-5.4 (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.5,
                "output": 15.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.4",
            "serverModel": "openai/gpt-5.4",
            "label": "Openai: gpt-5.4 (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.5,
                "output": 15.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.4-mini",
            "serverModel": "openai/gpt-5.4-mini",
            "label": "Openai: gpt-5.4-mini (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.75,
                "output": 4.5,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.4-mini",
            "serverModel": "openai/gpt-5.4-mini",
            "label": "Openai: gpt-5.4-mini (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.75,
                "output": 4.5,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.4-nano",
            "serverModel": "openai/gpt-5.4-nano",
            "label": "Openai: gpt-5.4-nano (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.2,
                "output": 1.25,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.4-nano",
            "serverModel": "openai/gpt-5.4-nano",
            "label": "Openai: gpt-5.4-nano (WaveSpeed)",
            "context": 400000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.2,
                "output": 1.25,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.5",
            "serverModel": "openai/gpt-5.5",
            "label": "Openai: gpt-5.5 (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 30.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.5",
            "serverModel": "openai/gpt-5.5",
            "label": "Openai: gpt-5.5 (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 5.0,
                "output": 30.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.5-pro",
            "serverModel": "openai/gpt-5.5-pro",
            "label": "Openai: gpt-5.5-pro (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 30.0,
                "output": 180.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.5-pro",
            "serverModel": "openai/gpt-5.5-pro",
            "label": "Openai: gpt-5.5-pro (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 30.0,
                "output": 180.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.6-luna",
            "serverModel": "openai/gpt-5.6-luna",
            "label": "Openai: gpt-5.6-luna (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.2,
                "output": 1.2,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.6-luna",
            "serverModel": "openai/gpt-5.6-luna",
            "label": "Openai: gpt-5.6-luna (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.2,
                "output": 1.2,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.6-sol",
            "serverModel": "openai/gpt-5.6-sol",
            "label": "Openai: gpt-5.6-sol (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 4.0,
                "output": 20.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.6-sol",
            "serverModel": "openai/gpt-5.6-sol",
            "label": "Openai: gpt-5.6-sol (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 4.0,
                "output": 20.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-5.6-terra",
            "serverModel": "openai/gpt-5.6-terra",
            "label": "Openai: gpt-5.6-terra (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 12.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-5.6-terra",
            "serverModel": "openai/gpt-5.6-terra",
            "label": "Openai: gpt-5.6-terra (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 12.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-6-astra",
            "serverModel": "openai/gpt-6-astra",
            "label": "Openai: gpt-6-astra (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 10.0,
                "output": 50.0,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-6-astra",
            "serverModel": "openai/gpt-6-astra",
            "label": "Openai: gpt-6-astra (WaveSpeed)",
            "context": 1050000,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 10.0,
                "output": 50.0,
                "currency": "USD"
            }
        },
        {
            "id": "openai/gpt-oss-120b",
            "serverModel": "openai/gpt-oss-120b",
            "label": "Openai: gpt-oss-120b (WaveSpeed)",
            "context": 131072,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.037,
                "output": 0.17,
                "currency": "USD"
            }
        },
        {
            "id": "gpt-oss-120b",
            "serverModel": "openai/gpt-oss-120b",
            "label": "Openai: gpt-oss-120b (WaveSpeed)",
            "context": 131072,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.037,
                "output": 0.17,
                "currency": "USD"
            }
        },
        {
            "id": "openai/o4-mini",
            "serverModel": "openai/o4-mini",
            "label": "Openai: o4-mini (WaveSpeed)",
            "context": 200000,
            "maxOutput": 100000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.1,
                "output": 4.4,
                "currency": "USD"
            }
        },
        {
            "id": "o4-mini",
            "serverModel": "openai/o4-mini",
            "label": "Openai: o4-mini (WaveSpeed)",
            "context": 200000,
            "maxOutput": 100000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.1,
                "output": 4.4,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.5-27b",
            "serverModel": "qwen/qwen3.5-27b",
            "label": "Qwen: qwen3.5-27b (WaveSpeed)",
            "context": 262144,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.195,
                "output": 1.56,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.5-27b",
            "serverModel": "qwen/qwen3.5-27b",
            "label": "Qwen: qwen3.5-27b (WaveSpeed)",
            "context": 262144,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.195,
                "output": 1.56,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.5-35b-a3b",
            "serverModel": "qwen/qwen3.5-35b-a3b",
            "label": "Qwen: qwen3.5-35b-a3b (WaveSpeed)",
            "context": 262144,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3125,
                "output": 1.25,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.5-35b-a3b",
            "serverModel": "qwen/qwen3.5-35b-a3b",
            "label": "Qwen: qwen3.5-35b-a3b (WaveSpeed)",
            "context": 262144,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3125,
                "output": 1.25,
                "currency": "USD"
            }
        },
        {
            "id": "qwen/qwen3.5-397b-a17b",
            "serverModel": "qwen/qwen3.5-397b-a17b",
            "label": "Qwen: qwen3.5-397b-a17b (WaveSpeed)",
            "context": 262144,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.55,
                "output": 3.5,
                "currency": "USD"
            }
        },
        {
            "id": "qwen3.5-397b-a17b",
            "serverModel": "qwen/qwen3.5-397b-a17b",
            "label": "Qwen: qwen3.5-397b-a17b (WaveSpeed)",
            "context": 262144,
            "maxOutput": 65536,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.55,
                "output": 3.5,
                "currency": "USD"
            }
        },
        {
            "id": "tencent/hy3",
            "serverModel": "tencent/hy3",
            "label": "Tencent: hy3 (WaveSpeed)",
            "context": 262144,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.0825,
                "output": 0.33,
                "currency": "USD"
            }
        },
        {
            "id": "hy3",
            "serverModel": "tencent/hy3",
            "label": "Tencent: hy3 (WaveSpeed)",
            "context": 262144,
            "maxOutput": 128000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.0825,
                "output": 0.33,
                "currency": "USD"
            }
        },
        {
            "id": "tencent/hy4-preview",
            "serverModel": "tencent/hy4-preview",
            "label": "Tencent: hy4-preview (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 64000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.834,
                "output": 2.501,
                "currency": "USD"
            }
        },
        {
            "id": "hy4-preview",
            "serverModel": "tencent/hy4-preview",
            "label": "Tencent: hy4-preview (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 64000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.834,
                "output": 2.501,
                "currency": "USD"
            }
        },
        {
            "id": "thedrummer/cydonia-24b-v4.1",
            "serverModel": "thedrummer/cydonia-24b-v4.1",
            "label": "Thedrummer: cydonia-24b-v4.1 (WaveSpeed)",
            "context": 131072,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 0.5,
                "currency": "USD"
            }
        },
        {
            "id": "cydonia-24b-v4.1",
            "serverModel": "thedrummer/cydonia-24b-v4.1",
            "label": "Thedrummer: cydonia-24b-v4.1 (WaveSpeed)",
            "context": 131072,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.3,
                "output": 0.5,
                "currency": "USD"
            }
        },
        {
            "id": "x-ai/grok-4.20",
            "serverModel": "x-ai/grok-4.20",
            "label": "X-ai: grok-4.20 (WaveSpeed)",
            "context": 2000000,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.25,
                "output": 2.5,
                "currency": "USD"
            }
        },
        {
            "id": "grok-4.20",
            "serverModel": "x-ai/grok-4.20",
            "label": "X-ai: grok-4.20 (WaveSpeed)",
            "context": 2000000,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.25,
                "output": 2.5,
                "currency": "USD"
            }
        },
        {
            "id": "x-ai/grok-4.3",
            "serverModel": "x-ai/grok-4.3",
            "label": "X-ai: grok-4.3 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.5,
                "output": 5.0,
                "currency": "USD"
            }
        },
        {
            "id": "grok-4.3",
            "serverModel": "x-ai/grok-4.3",
            "label": "X-ai: grok-4.3 (WaveSpeed)",
            "context": 1000000,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.5,
                "output": 5.0,
                "currency": "USD"
            }
        },
        {
            "id": "x-ai/grok-4.5",
            "serverModel": "x-ai/grok-4.5",
            "label": "X-ai: grok-4.5 (WaveSpeed)",
            "context": 500000,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 6.0,
                "currency": "USD"
            }
        },
        {
            "id": "grok-4.5",
            "serverModel": "x-ai/grok-4.5",
            "label": "X-ai: grok-4.5 (WaveSpeed)",
            "context": 500000,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 6.0,
                "currency": "USD"
            }
        },
        {
            "id": "x-ai/grok-4.6",
            "serverModel": "x-ai/grok-4.6",
            "label": "X-ai: grok-4.6 (WaveSpeed)",
            "context": 500000,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 6.0,
                "currency": "USD"
            }
        },
        {
            "id": "grok-4.6",
            "serverModel": "x-ai/grok-4.6",
            "label": "X-ai: grok-4.6 (WaveSpeed)",
            "context": 500000,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 2.0,
                "output": 6.0,
                "currency": "USD"
            }
        },
        {
            "id": "x-ai/grok-4.7",
            "serverModel": "x-ai/grok-4.7",
            "label": "X-ai: grok-4.7 (WaveSpeed)",
            "context": 500000,
            "maxOutput": 450000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.6,
                "output": 4.8,
                "currency": "USD"
            }
        },
        {
            "id": "grok-4.7",
            "serverModel": "x-ai/grok-4.7",
            "label": "X-ai: grok-4.7 (WaveSpeed)",
            "context": 500000,
            "maxOutput": 450000,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 1.6,
                "output": 4.8,
                "currency": "USD"
            }
        },
        {
            "id": "xiaomi/mimo-v2.5",
            "serverModel": "xiaomi/mimo-v2.5",
            "label": "Xiaomi: mimo-v2.5 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.14,
                "output": 0.28,
                "currency": "USD"
            }
        },
        {
            "id": "mimo-v2.5",
            "serverModel": "xiaomi/mimo-v2.5",
            "label": "Xiaomi: mimo-v2.5 (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 131072,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.14,
                "output": 0.28,
                "currency": "USD"
            }
        },
        {
            "id": "xiaomi/mimo-v2.5-pro",
            "serverModel": "xiaomi/mimo-v2.5-pro",
            "label": "Xiaomi: mimo-v2.5-pro (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.435,
                "output": 0.87,
                "currency": "USD"
            }
        },
        {
            "id": "mimo-v2.5-pro",
            "serverModel": "xiaomi/mimo-v2.5-pro",
            "label": "Xiaomi: mimo-v2.5-pro (WaveSpeed)",
            "context": 1048576,
            "maxOutput": 16384,
            "vision": false,
            "tools": true,
            "pricing": {
                "input": 0.435,
                "output": 0.87,
                "currency": "USD"
            }
        }
    ]
}
  },
  mcp:{servers:{}},
  packages:[],
  hooks:{},
  deploy:{
    vercel:{enabled:true},
    netlify:{enabled:true},
    supabase:{enabled:true},
    resend:{enabled:true},
    expo:{enabled:true},
    eas:{enabled:true}
  }
};
