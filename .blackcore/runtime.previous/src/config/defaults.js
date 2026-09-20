export const VERSION="3.8.0";

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
  agentTaskBudget:{enabled:true,maxInputTokens:1500000,maxOutputTokens:300000,maxTotalTokens:1800000,maxCostUSD:2,warnRatio:0.8},
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
    deepseek:{
      type:"deepseek",
      baseUrl:"https://api.deepseek.com",
      apiKeyEnv:"DEEPSEEK_API_KEY",
      models:[
        {id:"deepseek-v4-flash",label:"DeepSeek V4 Flash",context:1000000,maxOutput:384000,thinking:true,tools:true,pricing:{input:0.14,cacheRead:0.0028,output:0.28,currency:"USD"}},
        {id:"deepseek-v4-pro",label:"DeepSeek V4 Pro",context:1000000,maxOutput:384000,thinking:true,tools:true,pricing:{input:0.435,cacheRead:0.003625,output:0.87,currency:"USD"}}
      ]
    },
    google:{
      type:"google",
      baseUrl:"https://generativelanguage.googleapis.com/v1beta/openai",
      nativeBaseUrl:"https://generativelanguage.googleapis.com/v1beta",
      apiKeyEnv:"GEMINI_API_KEY",
      apiKeyEnvs:["GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4"],
      googleKeyPool:{enabled:true,maxKeys:4,strategy:"sequential-sticky",handoffSafeStreaming:true,lastSuccessSlot:1,cooldownMs:{quota:60000,auth:600000,server:15000}},
      maxActiveTools:20,
      freeTier:true,
      freePoolModels:["gemini-3.8-flash","gemini-3.7-flash","gemini-3.6-flash","gemini-3.5-flash-lite","gemini-3.1-flash-lite","gemma-4-31b-it","gemma-4-26b-a4b-it","gemini-3.6-flash"],
      models:[
        {id:"google-free-pool",label:"★ Google Supremo Pool (3.8 · 3.7 · 3.6)",context:1048576,maxOutput:65536,vision:true,tools:true,freeTier:true,pool:true,description:"Trio Supremo failover pool (Gemini 3.8 Flash → 3.7 Flash → 3.6 Flash). Resiliente a 503/429 sem travar a sessão."},
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
