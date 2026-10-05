// AI provider catalogue (ported from legacy utils/aiProviders.js). Models are sorted cheapest-first per provider.
export interface AiModel { value: string; label: string; costPer1M: number; costLabel: string; badge?: string; pdf?: boolean }
export interface AiProvider { value: string; label: string; apiKeyField: string; supportsFiles: boolean; docsUrl: string; keyInstructions: string; models: AiModel[] }

export const AI_PROVIDERS: AiProvider[] = [
  {
    "value": "groq",
    "label": "Groq",
    "apiKeyField": "extraction_groq_api_key",
    "supportsFiles": true,
    "docsUrl": "https://console.groq.com/keys",
    "keyInstructions": "Free tier — no credit card required. Sign up at console.groq.com, then go to API Keys to create a key.",
    "models": [
      {
        "value": "llama-3.1-8b-instant",
        "label": "Llama 3.1 8B Instant",
        "costPer1M": 0.05,
        "costLabel": "$0.05/1M"
      },
      {
        "value": "meta-llama/llama-4-scout-17b-16e-instruct",
        "label": "Llama 4 Scout 17B",
        "costPer1M": 0.11,
        "costLabel": "$0.11/1M",
        "badge": "Free tier"
      },
      {
        "value": "llama-3.2-11b-vision-preview",
        "label": "Llama 3.2 11B Vision",
        "costPer1M": 0.18,
        "costLabel": "$0.18/1M",
        "badge": "Vision"
      },
      {
        "value": "gemma2-9b-it",
        "label": "Gemma 2 9B",
        "costPer1M": 0.2,
        "costLabel": "$0.20/1M"
      },
      {
        "value": "meta-llama/llama-4-maverick-17b-128e-instruct-fp8",
        "label": "Llama 4 Maverick 17B",
        "costPer1M": 0.2,
        "costLabel": "$0.20/1M",
        "badge": "Free tier"
      },
      {
        "value": "mixtral-8x7b-32768",
        "label": "Mixtral 8x7B (32K ctx)",
        "costPer1M": 0.24,
        "costLabel": "$0.24/1M"
      },
      {
        "value": "qwen/qwen3-32b",
        "label": "Qwen3 32B",
        "costPer1M": 0.29,
        "costLabel": "$0.29/1M"
      },
      {
        "value": "llama-3.3-70b-versatile",
        "label": "Llama 3.3 70B Versatile",
        "costPer1M": 0.59,
        "costLabel": "$0.59/1M",
        "badge": "Free tier"
      },
      {
        "value": "llama-3.1-70b-versatile",
        "label": "Llama 3.1 70B Versatile",
        "costPer1M": 0.59,
        "costLabel": "$0.59/1M"
      },
      {
        "value": "deepseek-r1-distill-llama-70b",
        "label": "DeepSeek R1 Distill 70B",
        "costPer1M": 0.75,
        "costLabel": "$0.75/1M",
        "badge": "Reasoning"
      },
      {
        "value": "llama-3.2-90b-vision-preview",
        "label": "Llama 3.2 90B Vision",
        "costPer1M": 0.9,
        "costLabel": "$0.90/1M",
        "badge": "Vision"
      }
    ]
  },
  {
    "value": "gemini",
    "label": "Google Gemini",
    "apiKeyField": "extraction_gemini_api_key",
    "supportsFiles": true,
    "docsUrl": "https://aistudio.google.com/apikey",
    "keyInstructions": "Free tier — no billing required. Go to Google AI Studio and click \"Get API key\". Flash models have generous free quotas.",
    "models": [
      {
        "value": "gemini-3.5-flash-lite",
        "label": "Gemini 3.5 Flash Lite",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Vision",
        "pdf": true
      },
      {
        "value": "gemini-3.6-flash",
        "label": "Gemini 3.6 Flash",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Vision",
        "pdf": true
      },
      {
        "value": "gemini-3.1-pro-preview",
        "label": "Gemini 3.1 Pro Preview",
        "costPer1M": 1.25,
        "costLabel": "$1.25/1M",
        "badge": "Vision",
        "pdf": true
      }
    ]
  },
  {
    "value": "openai",
    "label": "OpenAI",
    "apiKeyField": "extraction_openai_api_key",
    "supportsFiles": true,
    "docsUrl": "https://platform.openai.com/api-keys",
    "keyInstructions": "Requires billing account. New accounts receive free trial credits. Create key at platform.openai.com/api-keys.",
    "models": [
      {
        "value": "gpt-4.1-nano",
        "label": "GPT-4.1 Nano",
        "costPer1M": 0.1,
        "costLabel": "$0.10/1M",
        "badge": "Vision"
      },
      {
        "value": "gpt-4o-mini",
        "label": "GPT-4o Mini",
        "costPer1M": 0.15,
        "costLabel": "$0.15/1M",
        "badge": "Vision"
      },
      {
        "value": "gpt-4.1-mini",
        "label": "GPT-4.1 Mini",
        "costPer1M": 0.4,
        "costLabel": "$0.40/1M",
        "badge": "Vision"
      },
      {
        "value": "o4-mini",
        "label": "o4-mini",
        "costPer1M": 1.1,
        "costLabel": "$1.10/1M",
        "badge": "Reasoning"
      },
      {
        "value": "o3-mini",
        "label": "o3-mini",
        "costPer1M": 1.1,
        "costLabel": "$1.10/1M",
        "badge": "Reasoning"
      },
      {
        "value": "gpt-4.1",
        "label": "GPT-4.1",
        "costPer1M": 2,
        "costLabel": "$2.00/1M",
        "badge": "Vision"
      },
      {
        "value": "gpt-4o",
        "label": "GPT-4o",
        "costPer1M": 2.5,
        "costLabel": "$2.50/1M",
        "badge": "Vision"
      },
      {
        "value": "o3",
        "label": "o3",
        "costPer1M": 10,
        "costLabel": "$10.00/1M",
        "badge": "Reasoning"
      },
      {
        "value": "gpt-4-turbo",
        "label": "GPT-4 Turbo",
        "costPer1M": 10,
        "costLabel": "$10.00/1M",
        "badge": "Vision"
      }
    ]
  },
  {
    "value": "anthropic",
    "label": "Anthropic (Claude)",
    "apiKeyField": "extraction_anthropic_api_key",
    "supportsFiles": true,
    "docsUrl": "https://console.anthropic.com/settings/keys",
    "keyInstructions": "Requires billing account. New accounts receive free trial credits. Create key at console.anthropic.com/settings/keys.",
    "models": [
      {
        "value": "claude-3-haiku-20240307",
        "label": "Claude 3 Haiku",
        "costPer1M": 0.25,
        "costLabel": "$0.25/1M",
        "badge": "Vision",
        "pdf": true
      },
      {
        "value": "claude-3-5-haiku-20241022",
        "label": "Claude 3.5 Haiku",
        "costPer1M": 0.8,
        "costLabel": "$0.80/1M",
        "badge": "Vision",
        "pdf": true
      },
      {
        "value": "claude-haiku-4-5-20251001",
        "label": "Claude Haiku 4.5",
        "costPer1M": 0.8,
        "costLabel": "$0.80/1M",
        "badge": "Vision",
        "pdf": true
      },
      {
        "value": "claude-3-5-sonnet-20241022",
        "label": "Claude 3.5 Sonnet",
        "costPer1M": 3,
        "costLabel": "$3.00/1M",
        "badge": "Vision",
        "pdf": true
      },
      {
        "value": "claude-sonnet-4-5-20251001",
        "label": "Claude Sonnet 4.5",
        "costPer1M": 3,
        "costLabel": "$3.00/1M",
        "badge": "Vision",
        "pdf": true
      },
      {
        "value": "claude-3-opus-20240229",
        "label": "Claude 3 Opus",
        "costPer1M": 15,
        "costLabel": "$15.00/1M",
        "badge": "Vision",
        "pdf": true
      },
      {
        "value": "claude-opus-4-5-20251101",
        "label": "Claude Opus 4.5",
        "costPer1M": 15,
        "costLabel": "$15.00/1M",
        "badge": "Vision",
        "pdf": true
      }
    ]
  },
  {
    "value": "xai",
    "label": "xAI (Grok)",
    "apiKeyField": "extraction_xai_api_key",
    "supportsFiles": true,
    "docsUrl": "https://console.x.ai",
    "keyInstructions": "Sign up at console.x.ai — free trial credits included. Go to API Keys to generate your key.",
    "models": [
      {
        "value": "grok-3-mini",
        "label": "Grok 3 Mini",
        "costPer1M": 0.3,
        "costLabel": "$0.30/1M"
      },
      {
        "value": "grok-3-mini-fast",
        "label": "Grok 3 Mini Fast",
        "costPer1M": 0.6,
        "costLabel": "$0.60/1M"
      },
      {
        "value": "grok-2-1212",
        "label": "Grok 2",
        "costPer1M": 2,
        "costLabel": "$2.00/1M",
        "badge": "Vision"
      },
      {
        "value": "grok-3",
        "label": "Grok 3",
        "costPer1M": 3,
        "costLabel": "$3.00/1M",
        "badge": "Vision"
      },
      {
        "value": "grok-3-fast",
        "label": "Grok 3 Fast",
        "costPer1M": 5,
        "costLabel": "$5.00/1M",
        "badge": "Vision"
      }
    ]
  },
  {
    "value": "mistral",
    "label": "Mistral AI",
    "apiKeyField": "extraction_mistral_api_key",
    "supportsFiles": true,
    "docsUrl": "https://console.mistral.ai/api-keys",
    "keyInstructions": "Free trial tier available — no credit card required initially. Sign up at console.mistral.ai, then create a key under API Keys.",
    "models": [
      {
        "value": "mistral-small-latest",
        "label": "Mistral Small",
        "costPer1M": 0.1,
        "costLabel": "$0.10/1M"
      },
      {
        "value": "open-mistral-nemo",
        "label": "Mistral Nemo 12B",
        "costPer1M": 0.15,
        "costLabel": "$0.15/1M"
      },
      {
        "value": "pixtral-12b-2409",
        "label": "Pixtral 12B",
        "costPer1M": 0.15,
        "costLabel": "$0.15/1M",
        "badge": "Vision"
      },
      {
        "value": "mistral-saba-latest",
        "label": "Mistral Saba 24B",
        "costPer1M": 0.2,
        "costLabel": "$0.20/1M"
      },
      {
        "value": "mistral-medium-latest",
        "label": "Mistral Medium",
        "costPer1M": 0.4,
        "costLabel": "$0.40/1M"
      },
      {
        "value": "magistral-small-latest",
        "label": "Magistral Small",
        "costPer1M": 0.5,
        "costLabel": "$0.50/1M",
        "badge": "Reasoning"
      },
      {
        "value": "codestral-latest",
        "label": "Codestral 22B",
        "costPer1M": 0.3,
        "costLabel": "$0.30/1M"
      },
      {
        "value": "mistral-large-latest",
        "label": "Mistral Large",
        "costPer1M": 2,
        "costLabel": "$2.00/1M"
      },
      {
        "value": "pixtral-large-latest",
        "label": "Pixtral Large",
        "costPer1M": 2,
        "costLabel": "$2.00/1M",
        "badge": "Vision"
      },
      {
        "value": "magistral-medium-latest",
        "label": "Magistral Medium",
        "costPer1M": 2,
        "costLabel": "$2.00/1M",
        "badge": "Reasoning"
      }
    ]
  },
  {
    "value": "cerebras",
    "label": "Cerebras",
    "apiKeyField": "extraction_cerebras_api_key",
    "supportsFiles": false,
    "docsUrl": "https://cloud.cerebras.ai",
    "keyInstructions": "Free tier available with rate limits. Sign up at cloud.cerebras.ai — no credit card required for the free tier.",
    "models": [
      {
        "value": "llama3.1-8b",
        "label": "Llama 3.1 8B",
        "costPer1M": 0.1,
        "costLabel": "$0.10/1M"
      },
      {
        "value": "llama-3.3-70b",
        "label": "Llama 3.3 70B",
        "costPer1M": 0.6,
        "costLabel": "$0.60/1M"
      }
    ]
  },
  {
    "value": "together",
    "label": "Together AI",
    "apiKeyField": "extraction_together_api_key",
    "supportsFiles": true,
    "docsUrl": "https://api.together.ai/settings/api-keys",
    "keyInstructions": "Free credits on signup. Pay-as-you-go with no minimum. Create key at api.together.ai/settings/api-keys.",
    "models": [
      {
        "value": "meta-llama/Llama-3.1-8B-Instruct-Turbo",
        "label": "Llama 3.1 8B Turbo",
        "costPer1M": 0.18,
        "costLabel": "$0.18/1M"
      },
      {
        "value": "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
        "label": "Llama 3.2 11B Vision",
        "costPer1M": 0.18,
        "costLabel": "$0.18/1M",
        "badge": "Vision"
      },
      {
        "value": "Qwen/Qwen2.5-7B-Instruct-Turbo",
        "label": "Qwen 2.5 7B",
        "costPer1M": 0.3,
        "costLabel": "$0.30/1M"
      },
      {
        "value": "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "label": "Mixtral 8x7B",
        "costPer1M": 0.6,
        "costLabel": "$0.60/1M"
      },
      {
        "value": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "label": "Llama 3.3 70B Turbo",
        "costPer1M": 0.88,
        "costLabel": "$0.88/1M"
      },
      {
        "value": "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
        "label": "Llama 3.2 90B Vision",
        "costPer1M": 1.2,
        "costLabel": "$1.20/1M",
        "badge": "Vision"
      },
      {
        "value": "Qwen/Qwen2.5-72B-Instruct-Turbo",
        "label": "Qwen 2.5 72B",
        "costPer1M": 1.2,
        "costLabel": "$1.20/1M"
      },
      {
        "value": "deepseek-ai/DeepSeek-V3",
        "label": "DeepSeek V3",
        "costPer1M": 1.28,
        "costLabel": "$1.28/1M"
      },
      {
        "value": "deepseek-ai/DeepSeek-R1",
        "label": "DeepSeek R1",
        "costPer1M": 7,
        "costLabel": "$7.00/1M",
        "badge": "Reasoning"
      },
      {
        "value": "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
        "label": "Llama 3.1 405B Turbo",
        "costPer1M": 5,
        "costLabel": "$5.00/1M"
      }
    ]
  },
  {
    "value": "openrouter",
    "label": "OpenRouter",
    "apiKeyField": "extraction_openrouter_api_key",
    "supportsFiles": true,
    "docsUrl": "https://openrouter.ai/keys",
    "keyInstructions": "No subscription — top up credits and pay per token. Sign up at openrouter.ai and create a key at openrouter.ai/keys.",
    "models": [
      {
        "value": "google/gemma-3-4b-it",
        "label": "Gemma 3 4B",
        "costPer1M": 0.02,
        "costLabel": "$0.02/1M"
      },
      {
        "value": "meta-llama/llama-3.2-1b-instruct",
        "label": "Llama 3.2 1B",
        "costPer1M": 0.02,
        "costLabel": "$0.02/1M"
      },
      {
        "value": "meta-llama/llama-3.2-3b-instruct",
        "label": "Llama 3.2 3B",
        "costPer1M": 0.03,
        "costLabel": "$0.03/1M"
      },
      {
        "value": "meta-llama/llama-3.1-8b-instruct",
        "label": "Llama 3.1 8B",
        "costPer1M": 0.04,
        "costLabel": "$0.04/1M"
      },
      {
        "value": "google/gemma-3-12b-it",
        "label": "Gemma 3 12B",
        "costPer1M": 0.06,
        "costLabel": "$0.06/1M"
      },
      {
        "value": "microsoft/phi-4",
        "label": "Phi-4",
        "costPer1M": 0.07,
        "costLabel": "$0.07/1M"
      },
      {
        "value": "mistralai/mistral-small-3.1-24b-instruct",
        "label": "Mistral Small 3.1",
        "costPer1M": 0.1,
        "costLabel": "$0.10/1M",
        "badge": "Vision"
      },
      {
        "value": "google/gemma-3-27b-it",
        "label": "Gemma 3 27B",
        "costPer1M": 0.1,
        "costLabel": "$0.10/1M"
      },
      {
        "value": "openai/gpt-4o-mini",
        "label": "GPT-4o Mini",
        "costPer1M": 0.15,
        "costLabel": "$0.15/1M",
        "badge": "Vision"
      },
      {
        "value": "google/gemini-2.5-flash",
        "label": "Gemini 2.5 Flash",
        "costPer1M": 0.15,
        "costLabel": "$0.15/1M",
        "badge": "Vision"
      },
      {
        "value": "meta-llama/llama-4-scout",
        "label": "Llama 4 Scout",
        "costPer1M": 0.17,
        "costLabel": "$0.17/1M"
      },
      {
        "value": "qwen/qwen3-30b-a3b",
        "label": "Qwen3 30B A3B",
        "costPer1M": 0.2,
        "costLabel": "$0.20/1M"
      },
      {
        "value": "qwen/qwen3-235b-a22b",
        "label": "Qwen3 235B MoE",
        "costPer1M": 0.25,
        "costLabel": "$0.25/1M"
      },
      {
        "value": "deepseek/deepseek-chat-v3-0324",
        "label": "DeepSeek V3",
        "costPer1M": 0.38,
        "costLabel": "$0.38/1M"
      },
      {
        "value": "meta-llama/llama-3.3-70b-instruct",
        "label": "Llama 3.3 70B",
        "costPer1M": 0.39,
        "costLabel": "$0.39/1M"
      },
      {
        "value": "qwen/qwen-2.5-72b-instruct",
        "label": "Qwen 2.5 72B",
        "costPer1M": 0.4,
        "costLabel": "$0.40/1M"
      },
      {
        "value": "qwen/qwen-2.5-vl-72b-instruct",
        "label": "Qwen 2.5 VL 72B",
        "costPer1M": 0.4,
        "costLabel": "$0.40/1M",
        "badge": "Vision"
      },
      {
        "value": "meta-llama/llama-4-maverick",
        "label": "Llama 4 Maverick",
        "costPer1M": 0.5,
        "costLabel": "$0.50/1M"
      },
      {
        "value": "deepseek/deepseek-r1",
        "label": "DeepSeek R1",
        "costPer1M": 0.55,
        "costLabel": "$0.55/1M",
        "badge": "Reasoning"
      },
      {
        "value": "deepseek/deepseek-r1-zero",
        "label": "DeepSeek R1 Zero",
        "costPer1M": 0.55,
        "costLabel": "$0.55/1M",
        "badge": "Reasoning"
      },
      {
        "value": "anthropic/claude-3.5-haiku",
        "label": "Claude 3.5 Haiku",
        "costPer1M": 0.8,
        "costLabel": "$0.80/1M",
        "badge": "Vision"
      },
      {
        "value": "google/gemini-2.5-pro",
        "label": "Gemini 2.5 Pro",
        "costPer1M": 1.25,
        "costLabel": "$1.25/1M",
        "badge": "Vision"
      },
      {
        "value": "openai/gpt-4o",
        "label": "GPT-4o",
        "costPer1M": 2.5,
        "costLabel": "$2.50/1M",
        "badge": "Vision"
      },
      {
        "value": "anthropic/claude-sonnet-4-5",
        "label": "Claude Sonnet 4.5",
        "costPer1M": 3,
        "costLabel": "$3.00/1M",
        "badge": "Vision"
      }
    ]
  },
  {
    "value": "sambanova",
    "label": "SambaNova",
    "apiKeyField": "extraction_sambanova_api_key",
    "supportsFiles": false,
    "docsUrl": "https://cloud.sambanova.ai",
    "keyInstructions": "Free API access available. Sign up at cloud.sambanova.ai to get your API key.",
    "models": [
      {
        "value": "Meta-Llama-3.1-8B-Instruct",
        "label": "Llama 3.1 8B",
        "costPer1M": 0.1,
        "costLabel": "$0.10/1M"
      },
      {
        "value": "Llama-4-Scout-17B-16E-Instruct",
        "label": "Llama 4 Scout 17B",
        "costPer1M": 0.4,
        "costLabel": "$0.40/1M"
      },
      {
        "value": "Meta-Llama-3.3-70B-Instruct",
        "label": "Llama 3.3 70B",
        "costPer1M": 0.6,
        "costLabel": "$0.60/1M"
      },
      {
        "value": "Llama-4-Maverick-17B-128E-Instruct",
        "label": "Llama 4 Maverick 17B",
        "costPer1M": 0.6,
        "costLabel": "$0.60/1M"
      },
      {
        "value": "Qwen2.5-72B-Instruct",
        "label": "Qwen 2.5 72B",
        "costPer1M": 0.6,
        "costLabel": "$0.60/1M"
      },
      {
        "value": "DeepSeek-V3-0324",
        "label": "DeepSeek V3",
        "costPer1M": 0.7,
        "costLabel": "$0.70/1M"
      },
      {
        "value": "Meta-Llama-3.1-405B-Instruct",
        "label": "Llama 3.1 405B",
        "costPer1M": 5,
        "costLabel": "$5.00/1M"
      },
      {
        "value": "DeepSeek-R1",
        "label": "DeepSeek R1",
        "costPer1M": 5,
        "costLabel": "$5.00/1M",
        "badge": "Reasoning"
      }
    ]
  },
  {
    "value": "fireworks",
    "label": "Fireworks AI",
    "apiKeyField": "extraction_fireworks_api_key",
    "supportsFiles": false,
    "docsUrl": "https://app.fireworks.ai/account/api-keys",
    "keyInstructions": "Free credits on signup. Create account at app.fireworks.ai, then get your key at app.fireworks.ai/account/api-keys.",
    "models": [
      {
        "value": "accounts/fireworks/models/llama4-scout-instruct-basic",
        "label": "Llama 4 Scout",
        "costPer1M": 0.15,
        "costLabel": "$0.15/1M"
      },
      {
        "value": "accounts/fireworks/models/llama-v3p1-8b-instruct",
        "label": "Llama 3.1 8B",
        "costPer1M": 0.2,
        "costLabel": "$0.20/1M"
      },
      {
        "value": "accounts/fireworks/models/llama4-maverick-instruct-basic",
        "label": "Llama 4 Maverick",
        "costPer1M": 0.22,
        "costLabel": "$0.22/1M"
      },
      {
        "value": "accounts/fireworks/models/mixtral-8x7b-instruct",
        "label": "Mixtral 8x7B",
        "costPer1M": 0.5,
        "costLabel": "$0.50/1M"
      },
      {
        "value": "accounts/fireworks/models/llama-v3p3-70b-instruct",
        "label": "Llama 3.3 70B",
        "costPer1M": 0.9,
        "costLabel": "$0.90/1M"
      },
      {
        "value": "accounts/fireworks/models/llama-v3p1-70b-instruct",
        "label": "Llama 3.1 70B",
        "costPer1M": 0.9,
        "costLabel": "$0.90/1M"
      },
      {
        "value": "accounts/fireworks/models/qwen2p5-72b-instruct",
        "label": "Qwen 2.5 72B",
        "costPer1M": 0.9,
        "costLabel": "$0.90/1M"
      },
      {
        "value": "accounts/fireworks/models/deepseek-r1",
        "label": "DeepSeek R1",
        "costPer1M": 3,
        "costLabel": "$3.00/1M",
        "badge": "Reasoning"
      }
    ]
  },
  {
    "value": "nvidia",
    "label": "NVIDIA NIM",
    "apiKeyField": "extraction_nvidia_api_key",
    "supportsFiles": false,
    "docsUrl": "https://build.nvidia.com",
    "keyInstructions": "Many models are completely free. Create account at build.nvidia.com, then generate an API key in settings.",
    "models": [
      {
        "value": "meta/llama-3.2-1b-instruct",
        "label": "Llama 3.2 1B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "meta/llama-3.2-3b-instruct",
        "label": "Llama 3.2 3B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "meta/llama-3.1-8b-instruct",
        "label": "Llama 3.1 8B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "meta/llama-3.1-70b-instruct",
        "label": "Llama 3.1 70B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "meta/llama-3.1-405b-instruct",
        "label": "Llama 3.1 405B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "meta/llama-3.3-70b-instruct",
        "label": "Llama 3.3 70B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "nvidia/llama-3.1-nemotron-nano-8b-v1",
        "label": "Nemotron Nano 8B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "nvidia/llama-3.1-nemotron-70b-instruct",
        "label": "Nemotron 70B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "nvidia/llama-3.3-nemotron-super-49b-v1",
        "label": "Nemotron Super 49B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "nvidia/llama-3.1-nemotron-ultra-253b-v1",
        "label": "Nemotron Ultra 253B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "nvidia/llama3-chatqa-1.5-8b",
        "label": "ChatQA 1.5 8B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "nvidia/llama3-chatqa-1.5-70b",
        "label": "ChatQA 1.5 70B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "mistralai/mistral-7b-instruct-v0.3",
        "label": "Mistral 7B v0.3",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "nv-mistralai/mistral-nemo-12b-instruct",
        "label": "Mistral Nemo 12B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "mistralai/mixtral-8x7b-instruct-v0.1",
        "label": "Mixtral 8x7B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "mistralai/mixtral-8x22b-instruct-v0.1",
        "label": "Mixtral 8x22B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "mistralai/mamba-codestral-7b-v0.1",
        "label": "Mamba Codestral 7B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "google/gemma-7b",
        "label": "Gemma 7B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "google/gemma-2-9b-it",
        "label": "Gemma 2 9B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "google/gemma-2-27b-it",
        "label": "Gemma 2 27B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "microsoft/phi-3-mini-4k-instruct",
        "label": "Phi-3 Mini 4K",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "microsoft/phi-3-small-8k-instruct",
        "label": "Phi-3 Small 8K",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "microsoft/phi-3-medium-4k-instruct",
        "label": "Phi-3 Medium 4K",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "microsoft/phi-3.5-mini-instruct",
        "label": "Phi-3.5 Mini",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "qwen/qwen2-7b-instruct",
        "label": "Qwen2 7B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "qwen/qwen2.5-7b-instruct",
        "label": "Qwen 2.5 7B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "qwen/qwen2.5-72b-instruct",
        "label": "Qwen 2.5 72B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "deepseek-ai/deepseek-r1",
        "label": "DeepSeek R1",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "deepseek-ai/deepseek-r1-distill-llama-70b",
        "label": "DeepSeek R1 Distill 70B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "deepseek-ai/deepseek-r1-distill-qwen-32b",
        "label": "DeepSeek R1 Distill 32B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "ibm/granite-3.0-8b-instruct",
        "label": "Granite 3.0 8B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "ibm/granite-3.1-8b-instruct",
        "label": "Granite 3.1 8B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "ibm/granite-3.2-8b-instruct",
        "label": "Granite 3.2 8B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "upstage/solar-10.7b-instruct",
        "label": "Solar 10.7B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "snowflake/arctic-instruct",
        "label": "Snowflake Arctic",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "baichuan-inc/baichuan2-7b-chat",
        "label": "Baichuan2 7B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "writer/palmyra-med-70b-32k",
        "label": "Palmyra Med 70B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      }
    ]
  },
  {
    "value": "github",
    "label": "GitHub Models",
    "apiKeyField": "extraction_github_api_key",
    "supportsFiles": true,
    "docsUrl": "https://github.com/settings/tokens",
    "keyInstructions": "Use a GitHub Personal Access Token (PAT) — completely free. Go to github.com/settings/tokens → Generate new token (classic) → no special scopes needed.",
    "models": [
      {
        "value": "microsoft/phi-3.5-mini-instruct",
        "label": "Phi-3.5 Mini",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free tier"
      },
      {
        "value": "microsoft/phi-4",
        "label": "Phi-4",
        "costPer1M": 0.01,
        "costLabel": "Free",
        "badge": "Free tier"
      },
      {
        "value": "meta-llama-3-1-8b-instruct",
        "label": "Llama 3.1 8B",
        "costPer1M": 0.02,
        "costLabel": "Free",
        "badge": "Free tier"
      },
      {
        "value": "Mistral-Nemo",
        "label": "Mistral Nemo",
        "costPer1M": 0.03,
        "costLabel": "Free",
        "badge": "Free tier"
      },
      {
        "value": "meta-llama-3-1-70b-instruct",
        "label": "Llama 3.1 70B",
        "costPer1M": 0.04,
        "costLabel": "Free",
        "badge": "Free tier"
      },
      {
        "value": "gpt-4o-mini",
        "label": "GPT-4o Mini",
        "costPer1M": 0.05,
        "costLabel": "Free",
        "badge": "Free · Vision"
      },
      {
        "value": "gpt-4.1-mini",
        "label": "GPT-4.1 Mini",
        "costPer1M": 0.06,
        "costLabel": "Free",
        "badge": "Free · Vision"
      },
      {
        "value": "gpt-4o",
        "label": "GPT-4o",
        "costPer1M": 0.07,
        "costLabel": "Free",
        "badge": "Free · Vision"
      }
    ]
  },
  {
    "value": "huggingface",
    "label": "HuggingFace",
    "apiKeyField": "extraction_huggingface_api_key",
    "supportsFiles": true,
    "docsUrl": "https://huggingface.co/settings/tokens",
    "keyInstructions": "Free tier with rate limits. Create a HuggingFace account, then go to huggingface.co/settings/tokens and create a token (choose \"Read\" access).",
    "models": [
      {
        "value": "mistralai/Mistral-7B-Instruct-v0.3",
        "label": "Mistral 7B v0.3",
        "costPer1M": 0.1,
        "costLabel": "$0.10/1M"
      },
      {
        "value": "microsoft/Phi-3.5-mini-instruct",
        "label": "Phi-3.5 Mini",
        "costPer1M": 0.15,
        "costLabel": "$0.15/1M"
      },
      {
        "value": "meta-llama/Llama-3.1-8B-Instruct",
        "label": "Llama 3.1 8B",
        "costPer1M": 0.2,
        "costLabel": "$0.20/1M"
      },
      {
        "value": "Qwen/Qwen2.5-7B-Instruct",
        "label": "Qwen 2.5 7B",
        "costPer1M": 0.2,
        "costLabel": "$0.20/1M"
      },
      {
        "value": "google/gemma-2-9b-it",
        "label": "Gemma 2 9B",
        "costPer1M": 0.2,
        "costLabel": "$0.20/1M"
      },
      {
        "value": "meta-llama/Llama-3.2-11B-Vision-Instruct",
        "label": "Llama 3.2 11B Vision",
        "costPer1M": 0.25,
        "costLabel": "$0.25/1M",
        "badge": "Vision"
      },
      {
        "value": "meta-llama/Llama-3.3-70B-Instruct",
        "label": "Llama 3.3 70B",
        "costPer1M": 0.4,
        "costLabel": "$0.40/1M"
      },
      {
        "value": "Qwen/Qwen2.5-72B-Instruct",
        "label": "Qwen 2.5 72B",
        "costPer1M": 0.4,
        "costLabel": "$0.40/1M"
      },
      {
        "value": "meta-llama/Llama-3.2-90B-Vision-Instruct",
        "label": "Llama 3.2 90B Vision",
        "costPer1M": 0.8,
        "costLabel": "$0.80/1M",
        "badge": "Vision"
      }
    ]
  },
  {
    "value": "cloudflare",
    "label": "Cloudflare Workers AI",
    "apiKeyField": "extraction_cloudflare_api_key",
    "supportsFiles": true,
    "docsUrl": "https://dash.cloudflare.com/profile/api-tokens",
    "keyInstructions": "Free within Cloudflare Workers limits. Create an API token at dash.cloudflare.com/profile/api-tokens with \"Workers AI:Read\" permission. Your Account ID is shown in the right sidebar of dash.cloudflare.com.",
    "models": [
      {
        "value": "@cf/meta/llama-3.2-1b-instruct",
        "label": "Llama 3.2 1B",
        "costPer1M": 0,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "@cf/meta/llama-3.1-8b-instruct-fast",
        "label": "Llama 3.1 8B Fast",
        "costPer1M": 0.01,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "@cf/google/gemma-3-12b-it",
        "label": "Gemma 3 12B",
        "costPer1M": 0.02,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "@cf/meta/llama-3.2-11b-vision-instruct",
        "label": "Llama 3.2 11B Vision",
        "costPer1M": 0.03,
        "costLabel": "Free",
        "badge": "Free · Vision"
      },
      {
        "value": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        "label": "Llama 3.3 70B Fast",
        "costPer1M": 0.04,
        "costLabel": "Free",
        "badge": "Free"
      },
      {
        "value": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
        "label": "DeepSeek R1 Distill 32B",
        "costPer1M": 0.05,
        "costLabel": "Free",
        "badge": "Free · Reasoning"
      },
      {
        "value": "@cf/qwen/qwq-32b",
        "label": "Qwen QwQ 32B",
        "costPer1M": 0.06,
        "costLabel": "Free",
        "badge": "Free · Reasoning"
      }
    ]
  },
  {
    "value": "cohere",
    "label": "Cohere",
    "apiKeyField": "extraction_cohere_api_key",
    "supportsFiles": false,
    "docsUrl": "https://dashboard.cohere.com/api-keys",
    "keyInstructions": "Free trial tier — no credit card required initially. Sign up at cohere.com and get your key at dashboard.cohere.com/api-keys.",
    "models": [
      {
        "value": "command-r",
        "label": "Command R",
        "costPer1M": 0.15,
        "costLabel": "$0.15/1M",
        "badge": "Free tier"
      },
      {
        "value": "command-r-plus",
        "label": "Command R+",
        "costPer1M": 2.5,
        "costLabel": "$2.50/1M"
      },
      {
        "value": "command-a-03-2025",
        "label": "Command A",
        "costPer1M": 2.5,
        "costLabel": "$2.50/1M"
      }
    ]
  },
  {
    "value": "perplexity",
    "label": "Perplexity",
    "apiKeyField": "extraction_perplexity_api_key",
    "supportsFiles": false,
    "docsUrl": "https://www.perplexity.ai/settings/api",
    "keyInstructions": "Credits included on signup. Sign in at perplexity.ai and go to Settings → API to generate your key.",
    "models": [
      {
        "value": "sonar",
        "label": "Sonar",
        "costPer1M": 1,
        "costLabel": "$1.00/1M"
      },
      {
        "value": "sonar-pro",
        "label": "Sonar Pro",
        "costPer1M": 3,
        "costLabel": "$3.00/1M"
      },
      {
        "value": "sonar-reasoning",
        "label": "Sonar Reasoning",
        "costPer1M": 5,
        "costLabel": "$5.00/1M",
        "badge": "Reasoning"
      },
      {
        "value": "sonar-reasoning-pro",
        "label": "Sonar Reasoning Pro",
        "costPer1M": 8,
        "costLabel": "$8.00/1M",
        "badge": "Reasoning"
      }
    ]
  },
  {
    "value": "deepinfra",
    "label": "DeepInfra",
    "apiKeyField": "extraction_deepinfra_api_key",
    "supportsFiles": false,
    "docsUrl": "https://deepinfra.com/dash?tab=api_keys",
    "keyInstructions": "Free $0.50 credit on signup — no credit card required. Sign up at deepinfra.com and get your key from the dashboard.",
    "models": [
      {
        "value": "meta-llama/Meta-Llama-3.1-8B-Instruct",
        "label": "Llama 3.1 8B",
        "costPer1M": 0.06,
        "costLabel": "$0.06/1M"
      },
      {
        "value": "google/gemma-2-9b-it",
        "label": "Gemma 2 9B",
        "costPer1M": 0.06,
        "costLabel": "$0.06/1M"
      },
      {
        "value": "Qwen/Qwen2.5-7B-Instruct",
        "label": "Qwen 2.5 7B",
        "costPer1M": 0.07,
        "costLabel": "$0.07/1M"
      },
      {
        "value": "microsoft/phi-4",
        "label": "Phi-4",
        "costPer1M": 0.1,
        "costLabel": "$0.10/1M"
      },
      {
        "value": "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF",
        "label": "Nemotron 70B",
        "costPer1M": 0.13,
        "costLabel": "$0.13/1M"
      },
      {
        "value": "meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo",
        "label": "Llama 3.3 70B Turbo",
        "costPer1M": 0.23,
        "costLabel": "$0.23/1M"
      },
      {
        "value": "Qwen/Qwen2.5-72B-Instruct",
        "label": "Qwen 2.5 72B",
        "costPer1M": 0.35,
        "costLabel": "$0.35/1M"
      },
      {
        "value": "deepseek-ai/DeepSeek-R1",
        "label": "DeepSeek R1",
        "costPer1M": 3,
        "costLabel": "$3.00/1M",
        "badge": "Reasoning"
      }
    ]
  }
];

export const modelsForProvider = (provider: string): AiModel[] =>
  [...(AI_PROVIDERS.find((p) => p.value === provider)?.models || [])].sort((a, b) => a.costPer1M - b.costPer1M);

export const providerHasKey = (provider: string, settings: Record<string, any> | null | undefined): boolean => {
  const p = AI_PROVIDERS.find((x) => x.value === provider);
  return !!(p && settings?.[p.apiKeyField]);
};

/** First provider with a configured key, else the first in the catalogue. */
export const firstConfiguredProvider = (settings: Record<string, any> | null | undefined): AiProvider =>
  AI_PROVIDERS.find((p) => settings?.[p.apiKeyField]) || AI_PROVIDERS[0];

/** Capability suffix shown after model names in pickers. */
export function fileCapabilityLabel(m: AiModel): string {
  if (m.pdf) return ' [Scanned PDF + Image ✓]';
  if ((m.badge || '').toLowerCase().includes('vision')) return ' [Image ✓ · Excel ✓ · Text PDF ✓]';
  return ' [Excel ✓ · Text PDF ✓]';
}
