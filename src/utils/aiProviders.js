// Shared AI provider + model definitions used by:
//   - Store form "AI Models" tab
//   - Procurement email Extract modal
//   - RFQ Create form AI extraction sections
//
// Models are sorted cheapest-first within each provider.
// costPer1M = USD input price per 1 million tokens (used for sort only).
// Prices approximate as of mid-2025 — verify at each provider's pricing page.

export const AI_PROVIDERS = [
    // ── Groq ─────────────────────────────────────────────────────────────────
    {
        value: 'groq', label: 'Groq', hint: 'gsk_...', apiKeyField: 'extraction_groq_api_key',
        supportsFiles: true,
        description: 'Ultra-fast LPU inference · free tier · vision on select models',
        docsUrl: 'https://console.groq.com/keys',
        keyInstructions: 'Free tier — no credit card required. Sign up at console.groq.com, then go to API Keys to create a key.',
        models: [
            { value: 'llama-3.1-8b-instant',                              label: 'Llama 3.1 8B Instant',           costPer1M: 0.05, costLabel: '$0.05/1M' },
            { value: 'meta-llama/llama-4-scout-17b-16e-instruct',         label: 'Llama 4 Scout 17B',              costPer1M: 0.11, costLabel: '$0.11/1M', badge: 'Free tier' },
            { value: 'llama-3.2-11b-vision-preview',                      label: 'Llama 3.2 11B Vision',           costPer1M: 0.18, costLabel: '$0.18/1M', badge: 'Vision' },
            { value: 'gemma2-9b-it',                                      label: 'Gemma 2 9B',                     costPer1M: 0.20, costLabel: '$0.20/1M' },
            { value: 'meta-llama/llama-4-maverick-17b-128e-instruct-fp8', label: 'Llama 4 Maverick 17B',          costPer1M: 0.20, costLabel: '$0.20/1M', badge: 'Free tier' },
            { value: 'mixtral-8x7b-32768',                                label: 'Mixtral 8x7B (32K ctx)',         costPer1M: 0.24, costLabel: '$0.24/1M' },
            { value: 'qwen/qwen3-32b',                                    label: 'Qwen3 32B',                      costPer1M: 0.29, costLabel: '$0.29/1M' },
            { value: 'llama-3.3-70b-versatile',                           label: 'Llama 3.3 70B Versatile',        costPer1M: 0.59, costLabel: '$0.59/1M', badge: 'Free tier' },
            { value: 'llama-3.1-70b-versatile',                           label: 'Llama 3.1 70B Versatile',        costPer1M: 0.59, costLabel: '$0.59/1M' },
            { value: 'deepseek-r1-distill-llama-70b',                     label: 'DeepSeek R1 Distill 70B',        costPer1M: 0.75, costLabel: '$0.75/1M', badge: 'Reasoning' },
            { value: 'llama-3.2-90b-vision-preview',                      label: 'Llama 3.2 90B Vision',           costPer1M: 0.90, costLabel: '$0.90/1M', badge: 'Vision' },
        ],
    },

    // ── Google Gemini ─────────────────────────────────────────────────────────
    {
        value: 'gemini', label: 'Google Gemini', hint: 'AIza...', apiKeyField: 'extraction_gemini_api_key',
        supportsFiles: true,
        description: 'Native vision · PDF · Excel · free tier via AI Studio',
        docsUrl: 'https://aistudio.google.com/apikey',
        keyInstructions: 'Free tier — no billing required. Go to Google AI Studio and click "Get API key". Flash models have generous free quotas.',
        models: [
            { value: 'gemini-3.5-flash-lite',   label: 'Gemini 3.5 Flash Lite',   costPer1M: 0.00,  costLabel: 'Free',       badge: 'Vision', pdf: true },
            { value: 'gemini-3.6-flash',         label: 'Gemini 3.6 Flash',        costPer1M: 0.00,  costLabel: 'Free',       badge: 'Vision', pdf: true },
            { value: 'gemini-3.1-pro-preview',   label: 'Gemini 3.1 Pro Preview',  costPer1M: 1.25,  costLabel: '$1.25/1M',   badge: 'Vision', pdf: true },
        ],
    },

    // ── OpenAI ────────────────────────────────────────────────────────────────
    {
        value: 'openai', label: 'OpenAI', hint: 'sk-...', apiKeyField: 'extraction_openai_api_key',
        supportsFiles: true,
        description: 'GPT-4 family · vision + PDF support on all listed models',
        docsUrl: 'https://platform.openai.com/api-keys',
        keyInstructions: 'Requires billing account. New accounts receive free trial credits. Create key at platform.openai.com/api-keys.',
        models: [
            { value: 'gpt-4.1-nano',  label: 'GPT-4.1 Nano',   costPer1M: 0.10,  costLabel: '$0.10/1M', badge: 'Vision' },
            { value: 'gpt-4o-mini',   label: 'GPT-4o Mini',     costPer1M: 0.15,  costLabel: '$0.15/1M', badge: 'Vision' },
            { value: 'gpt-4.1-mini',  label: 'GPT-4.1 Mini',    costPer1M: 0.40,  costLabel: '$0.40/1M', badge: 'Vision' },
            { value: 'o4-mini',       label: 'o4-mini',          costPer1M: 1.10,  costLabel: '$1.10/1M', badge: 'Reasoning' },
            { value: 'o3-mini',       label: 'o3-mini',          costPer1M: 1.10,  costLabel: '$1.10/1M', badge: 'Reasoning' },
            { value: 'gpt-4.1',       label: 'GPT-4.1',          costPer1M: 2.00,  costLabel: '$2.00/1M', badge: 'Vision' },
            { value: 'gpt-4o',        label: 'GPT-4o',           costPer1M: 2.50,  costLabel: '$2.50/1M', badge: 'Vision' },
            { value: 'o3',            label: 'o3',               costPer1M: 10.00, costLabel: '$10.00/1M', badge: 'Reasoning' },
            { value: 'gpt-4-turbo',   label: 'GPT-4 Turbo',      costPer1M: 10.00, costLabel: '$10.00/1M', badge: 'Vision' },
        ],
    },

    // ── Anthropic ─────────────────────────────────────────────────────────────
    {
        value: 'anthropic', label: 'Anthropic (Claude)', hint: 'sk-ant-...', apiKeyField: 'extraction_anthropic_api_key',
        supportsFiles: true,
        description: 'Claude · vision · PDF support on all models',
        docsUrl: 'https://console.anthropic.com/settings/keys',
        keyInstructions: 'Requires billing account. New accounts receive free trial credits. Create key at console.anthropic.com/settings/keys.',
        models: [
            { value: 'claude-3-haiku-20240307',   label: 'Claude 3 Haiku',       costPer1M: 0.25,  costLabel: '$0.25/1M', badge: 'Vision', pdf: true },
            { value: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku',     costPer1M: 0.80,  costLabel: '$0.80/1M', badge: 'Vision', pdf: true },
            { value: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5',     costPer1M: 0.80,  costLabel: '$0.80/1M', badge: 'Vision', pdf: true },
            { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet',    costPer1M: 3.00,  costLabel: '$3.00/1M', badge: 'Vision', pdf: true },
            { value: 'claude-sonnet-4-5-20251001', label: 'Claude Sonnet 4.5',    costPer1M: 3.00,  costLabel: '$3.00/1M', badge: 'Vision', pdf: true },
            { value: 'claude-3-opus-20240229',     label: 'Claude 3 Opus',        costPer1M: 15.00, costLabel: '$15.00/1M', badge: 'Vision', pdf: true },
            { value: 'claude-opus-4-5-20251101',   label: 'Claude Opus 4.5',      costPer1M: 15.00, costLabel: '$15.00/1M', badge: 'Vision', pdf: true },
        ],
    },

    // ── xAI ───────────────────────────────────────────────────────────────────
    {
        value: 'xai', label: 'xAI (Grok)', hint: 'xai-...', apiKeyField: 'extraction_xai_api_key',
        supportsFiles: true,
        description: 'Grok models · vision support on all models',
        docsUrl: 'https://console.x.ai',
        keyInstructions: 'Sign up at console.x.ai — free trial credits included. Go to API Keys to generate your key.',
        models: [
            { value: 'grok-3-mini',      label: 'Grok 3 Mini',       costPer1M: 0.30, costLabel: '$0.30/1M' },
            { value: 'grok-3-mini-fast', label: 'Grok 3 Mini Fast',  costPer1M: 0.60, costLabel: '$0.60/1M' },
            { value: 'grok-2-1212',      label: 'Grok 2',            costPer1M: 2.00, costLabel: '$2.00/1M', badge: 'Vision' },
            { value: 'grok-3',           label: 'Grok 3',            costPer1M: 3.00, costLabel: '$3.00/1M', badge: 'Vision' },
            { value: 'grok-3-fast',      label: 'Grok 3 Fast',       costPer1M: 5.00, costLabel: '$5.00/1M', badge: 'Vision' },
        ],
    },

    // ── Mistral AI ────────────────────────────────────────────────────────────
    {
        value: 'mistral', label: 'Mistral AI', hint: 'sk-...', apiKeyField: 'extraction_mistral_api_key',
        supportsFiles: true,
        description: 'EU-based · Pixtral models support vision · free trial tier',
        docsUrl: 'https://console.mistral.ai/api-keys',
        keyInstructions: 'Free trial tier available — no credit card required initially. Sign up at console.mistral.ai, then create a key under API Keys.',
        models: [
            { value: 'mistral-small-latest',     label: 'Mistral Small',          costPer1M: 0.10, costLabel: '$0.10/1M' },
            { value: 'open-mistral-nemo',         label: 'Mistral Nemo 12B',       costPer1M: 0.15, costLabel: '$0.15/1M' },
            { value: 'pixtral-12b-2409',          label: 'Pixtral 12B',            costPer1M: 0.15, costLabel: '$0.15/1M', badge: 'Vision' },
            { value: 'mistral-saba-latest',       label: 'Mistral Saba 24B',       costPer1M: 0.20, costLabel: '$0.20/1M' },
            { value: 'mistral-medium-latest',     label: 'Mistral Medium',         costPer1M: 0.40, costLabel: '$0.40/1M' },
            { value: 'magistral-small-latest',    label: 'Magistral Small',        costPer1M: 0.50, costLabel: '$0.50/1M', badge: 'Reasoning' },
            { value: 'codestral-latest',          label: 'Codestral 22B',          costPer1M: 0.30, costLabel: '$0.30/1M' },
            { value: 'mistral-large-latest',      label: 'Mistral Large',          costPer1M: 2.00, costLabel: '$2.00/1M' },
            { value: 'pixtral-large-latest',      label: 'Pixtral Large',          costPer1M: 2.00, costLabel: '$2.00/1M', badge: 'Vision' },
            { value: 'magistral-medium-latest',   label: 'Magistral Medium',       costPer1M: 2.00, costLabel: '$2.00/1M', badge: 'Reasoning' },
        ],
    },

    // ── Cerebras ──────────────────────────────────────────────────────────────
    {
        value: 'cerebras', label: 'Cerebras', hint: 'csk-...', apiKeyField: 'extraction_cerebras_api_key',
        supportsFiles: false,
        description: 'World\'s fastest inference · text-only · free tier available',
        docsUrl: 'https://cloud.cerebras.ai',
        keyInstructions: 'Free tier available with rate limits. Sign up at cloud.cerebras.ai — no credit card required for the free tier.',
        models: [
            { value: 'llama3.1-8b',    label: 'Llama 3.1 8B',    costPer1M: 0.10, costLabel: '$0.10/1M' },
            { value: 'llama-3.3-70b',  label: 'Llama 3.3 70B',   costPer1M: 0.60, costLabel: '$0.60/1M' },
        ],
    },

    // ── Together AI ───────────────────────────────────────────────────────────
    {
        value: 'together', label: 'Together AI', hint: '...', apiKeyField: 'extraction_together_api_key',
        supportsFiles: true,
        description: 'Open-source models · vision on select models · free credits on signup',
        docsUrl: 'https://api.together.ai/settings/api-keys',
        keyInstructions: 'Free credits on signup. Pay-as-you-go with no minimum. Create key at api.together.ai/settings/api-keys.',
        models: [
            { value: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',          label: 'Llama 3.1 8B Turbo',        costPer1M: 0.18, costLabel: '$0.18/1M' },
            { value: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',  label: 'Llama 3.2 11B Vision',      costPer1M: 0.18, costLabel: '$0.18/1M', badge: 'Vision' },
            { value: 'Qwen/Qwen2.5-7B-Instruct-Turbo',                  label: 'Qwen 2.5 7B',               costPer1M: 0.30, costLabel: '$0.30/1M' },
            { value: 'mistralai/Mixtral-8x7B-Instruct-v0.1',            label: 'Mixtral 8x7B',              costPer1M: 0.60, costLabel: '$0.60/1M' },
            { value: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',         label: 'Llama 3.3 70B Turbo',       costPer1M: 0.88, costLabel: '$0.88/1M' },
            { value: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',  label: 'Llama 3.2 90B Vision',      costPer1M: 1.20, costLabel: '$1.20/1M', badge: 'Vision' },
            { value: 'Qwen/Qwen2.5-72B-Instruct-Turbo',                 label: 'Qwen 2.5 72B',              costPer1M: 1.20, costLabel: '$1.20/1M' },
            { value: 'deepseek-ai/DeepSeek-V3',                         label: 'DeepSeek V3',               costPer1M: 1.28, costLabel: '$1.28/1M' },
            { value: 'deepseek-ai/DeepSeek-R1',                         label: 'DeepSeek R1',               costPer1M: 7.00, costLabel: '$7.00/1M', badge: 'Reasoning' },
            { value: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',   label: 'Llama 3.1 405B Turbo',      costPer1M: 5.00, costLabel: '$5.00/1M' },
        ],
    },

    // ── OpenRouter ────────────────────────────────────────────────────────────
    {
        value: 'openrouter', label: 'OpenRouter', hint: 'sk-or-...', apiKeyField: 'extraction_openrouter_api_key',
        supportsFiles: true,
        description: 'Access 300+ models via one API · pay-as-you-go · vision available',
        docsUrl: 'https://openrouter.ai/keys',
        keyInstructions: 'No subscription — top up credits and pay per token. Sign up at openrouter.ai and create a key at openrouter.ai/keys.',
        models: [
            // ── Sorted cheapest first ─────────────────────────────────────────
            { value: 'google/gemma-3-4b-it',                               label: 'Gemma 3 4B',                    costPer1M: 0.02,  costLabel: '$0.02/1M' },
            { value: 'meta-llama/llama-3.2-1b-instruct',                   label: 'Llama 3.2 1B',                  costPer1M: 0.02,  costLabel: '$0.02/1M' },
            { value: 'meta-llama/llama-3.2-3b-instruct',                   label: 'Llama 3.2 3B',                  costPer1M: 0.03,  costLabel: '$0.03/1M' },
            { value: 'meta-llama/llama-3.1-8b-instruct',                   label: 'Llama 3.1 8B',                  costPer1M: 0.04,  costLabel: '$0.04/1M' },
            { value: 'google/gemma-3-12b-it',                              label: 'Gemma 3 12B',                   costPer1M: 0.06,  costLabel: '$0.06/1M' },
            { value: 'microsoft/phi-4',                                    label: 'Phi-4',                         costPer1M: 0.07,  costLabel: '$0.07/1M' },
            { value: 'mistralai/mistral-small-3.1-24b-instruct',           label: 'Mistral Small 3.1',             costPer1M: 0.10,  costLabel: '$0.10/1M', badge: 'Vision' },
            { value: 'google/gemma-3-27b-it',                              label: 'Gemma 3 27B',                   costPer1M: 0.10,  costLabel: '$0.10/1M' },
            { value: 'openai/gpt-4o-mini',                                 label: 'GPT-4o Mini',                   costPer1M: 0.15,  costLabel: '$0.15/1M', badge: 'Vision' },
            { value: 'google/gemini-2.5-flash',                            label: 'Gemini 2.5 Flash',              costPer1M: 0.15,  costLabel: '$0.15/1M', badge: 'Vision' },
            { value: 'meta-llama/llama-4-scout',                           label: 'Llama 4 Scout',                 costPer1M: 0.17,  costLabel: '$0.17/1M' },
            { value: 'qwen/qwen3-30b-a3b',                                 label: 'Qwen3 30B A3B',                 costPer1M: 0.20,  costLabel: '$0.20/1M' },
            { value: 'qwen/qwen3-235b-a22b',                               label: 'Qwen3 235B MoE',                costPer1M: 0.25,  costLabel: '$0.25/1M' },
            { value: 'deepseek/deepseek-chat-v3-0324',                     label: 'DeepSeek V3',                   costPer1M: 0.38,  costLabel: '$0.38/1M' },
            { value: 'meta-llama/llama-3.3-70b-instruct',                  label: 'Llama 3.3 70B',                 costPer1M: 0.39,  costLabel: '$0.39/1M' },
            { value: 'qwen/qwen-2.5-72b-instruct',                         label: 'Qwen 2.5 72B',                  costPer1M: 0.40,  costLabel: '$0.40/1M' },
            { value: 'qwen/qwen-2.5-vl-72b-instruct',                      label: 'Qwen 2.5 VL 72B',               costPer1M: 0.40,  costLabel: '$0.40/1M', badge: 'Vision' },
            { value: 'meta-llama/llama-4-maverick',                        label: 'Llama 4 Maverick',              costPer1M: 0.50,  costLabel: '$0.50/1M' },
            { value: 'deepseek/deepseek-r1',                               label: 'DeepSeek R1',                   costPer1M: 0.55,  costLabel: '$0.55/1M', badge: 'Reasoning' },
            { value: 'deepseek/deepseek-r1-zero',                          label: 'DeepSeek R1 Zero',              costPer1M: 0.55,  costLabel: '$0.55/1M', badge: 'Reasoning' },
            { value: 'anthropic/claude-3.5-haiku',                         label: 'Claude 3.5 Haiku',              costPer1M: 0.80,  costLabel: '$0.80/1M', badge: 'Vision' },
            { value: 'google/gemini-2.5-pro',                              label: 'Gemini 2.5 Pro',                costPer1M: 1.25,  costLabel: '$1.25/1M', badge: 'Vision' },
            { value: 'openai/gpt-4o',                                      label: 'GPT-4o',                        costPer1M: 2.50,  costLabel: '$2.50/1M', badge: 'Vision' },
            { value: 'anthropic/claude-sonnet-4-5',                        label: 'Claude Sonnet 4.5',             costPer1M: 3.00,  costLabel: '$3.00/1M', badge: 'Vision' },
        ],
    },

    // ── SambaNova ─────────────────────────────────────────────────────────────
    {
        value: 'sambanova', label: 'SambaNova', hint: '...', apiKeyField: 'extraction_sambanova_api_key',
        supportsFiles: false,
        description: 'High-speed enterprise inference · text-only · free tier available',
        docsUrl: 'https://cloud.sambanova.ai',
        keyInstructions: 'Free API access available. Sign up at cloud.sambanova.ai to get your API key.',
        models: [
            { value: 'Meta-Llama-3.1-8B-Instruct',          label: 'Llama 3.1 8B',         costPer1M: 0.10, costLabel: '$0.10/1M' },
            { value: 'Llama-4-Scout-17B-16E-Instruct',       label: 'Llama 4 Scout 17B',    costPer1M: 0.40, costLabel: '$0.40/1M' },
            { value: 'Meta-Llama-3.3-70B-Instruct',          label: 'Llama 3.3 70B',        costPer1M: 0.60, costLabel: '$0.60/1M' },
            { value: 'Llama-4-Maverick-17B-128E-Instruct',   label: 'Llama 4 Maverick 17B', costPer1M: 0.60, costLabel: '$0.60/1M' },
            { value: 'Qwen2.5-72B-Instruct',                 label: 'Qwen 2.5 72B',         costPer1M: 0.60, costLabel: '$0.60/1M' },
            { value: 'DeepSeek-V3-0324',                     label: 'DeepSeek V3',          costPer1M: 0.70, costLabel: '$0.70/1M' },
            { value: 'Meta-Llama-3.1-405B-Instruct',         label: 'Llama 3.1 405B',       costPer1M: 5.00, costLabel: '$5.00/1M' },
            { value: 'DeepSeek-R1',                          label: 'DeepSeek R1',          costPer1M: 5.00, costLabel: '$5.00/1M', badge: 'Reasoning' },
        ],
    },

    // ── Fireworks AI ──────────────────────────────────────────────────────────
    {
        value: 'fireworks', label: 'Fireworks AI', hint: 'fw-...', apiKeyField: 'extraction_fireworks_api_key',
        supportsFiles: false,
        description: 'Fast open-source hosting · text-only · free credits on signup',
        docsUrl: 'https://app.fireworks.ai/account/api-keys',
        keyInstructions: 'Free credits on signup. Create account at app.fireworks.ai, then get your key at app.fireworks.ai/account/api-keys.',
        models: [
            { value: 'accounts/fireworks/models/llama4-scout-instruct-basic',  label: 'Llama 4 Scout',          costPer1M: 0.15, costLabel: '$0.15/1M' },
            { value: 'accounts/fireworks/models/llama-v3p1-8b-instruct',       label: 'Llama 3.1 8B',           costPer1M: 0.20, costLabel: '$0.20/1M' },
            { value: 'accounts/fireworks/models/llama4-maverick-instruct-basic', label: 'Llama 4 Maverick',     costPer1M: 0.22, costLabel: '$0.22/1M' },
            { value: 'accounts/fireworks/models/mixtral-8x7b-instruct',        label: 'Mixtral 8x7B',           costPer1M: 0.50, costLabel: '$0.50/1M' },
            { value: 'accounts/fireworks/models/llama-v3p3-70b-instruct',      label: 'Llama 3.3 70B',          costPer1M: 0.90, costLabel: '$0.90/1M' },
            { value: 'accounts/fireworks/models/llama-v3p1-70b-instruct',      label: 'Llama 3.1 70B',          costPer1M: 0.90, costLabel: '$0.90/1M' },
            { value: 'accounts/fireworks/models/qwen2p5-72b-instruct',         label: 'Qwen 2.5 72B',           costPer1M: 0.90, costLabel: '$0.90/1M' },
            { value: 'accounts/fireworks/models/deepseek-r1',                  label: 'DeepSeek R1',            costPer1M: 3.00, costLabel: '$3.00/1M', badge: 'Reasoning' },
        ],
    },

    // ── NVIDIA NIM ────────────────────────────────────────────────────────────
    {
        value: 'nvidia', label: 'NVIDIA NIM', hint: 'nvapi-...', apiKeyField: 'extraction_nvidia_api_key',
        supportsFiles: false,
        description: 'NVIDIA inference microservices · text-only · 1,000 free credits',
        docsUrl: 'https://build.nvidia.com',
        keyInstructions: 'Includes 1,000 free credits on signup. Create account at build.nvidia.com, then generate an API key in the settings.',
        models: [
            { value: 'meta/llama-3.1-8b-instruct',                  label: 'Llama 3.1 8B',             costPer1M: 0.20, costLabel: '$0.20/1M' },
            { value: 'meta/llama-3.3-70b-instruct',                  label: 'Llama 3.3 70B',            costPer1M: 0.20, costLabel: '$0.20/1M' },
            { value: 'nv-mistralai/mistral-nemo-12b-instruct',        label: 'Mistral Nemo 12B',         costPer1M: 0.20, costLabel: '$0.20/1M' },
            { value: 'mistralai/mistral-7b-instruct-v0.3',            label: 'Mistral 7B v0.3',          costPer1M: 0.20, costLabel: '$0.20/1M' },
            { value: 'meta/llama-3.1-70b-instruct',                  label: 'Llama 3.1 70B',            costPer1M: 0.35, costLabel: '$0.35/1M' },
            { value: 'nvidia/llama-3.1-nemotron-70b-instruct',        label: 'Nemotron 70B',             costPer1M: 0.35, costLabel: '$0.35/1M' },
            { value: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',       label: 'Nemotron Ultra 253B',      costPer1M: 0.80, costLabel: '$0.80/1M' },
            { value: 'meta/llama-3.1-405b-instruct',                  label: 'Llama 3.1 405B',           costPer1M: 5.00, costLabel: '$5.00/1M' },
        ],
    },

    // ── GitHub Models ─────────────────────────────────────────────────────────
    {
        value: 'github', label: 'GitHub Models', hint: 'ghp_...', apiKeyField: 'extraction_github_api_key',
        supportsFiles: true,
        description: 'Free tier with GitHub PAT · rate limited · no credit card',
        docsUrl: 'https://github.com/settings/tokens',
        keyInstructions: 'Use a GitHub Personal Access Token (PAT) — completely free. Go to github.com/settings/tokens → Generate new token (classic) → no special scopes needed.',
        models: [
            { value: 'microsoft/phi-3.5-mini-instruct', label: 'Phi-3.5 Mini',        costPer1M: 0.00, costLabel: 'Free', badge: 'Free tier' },
            { value: 'microsoft/phi-4',                  label: 'Phi-4',               costPer1M: 0.01, costLabel: 'Free', badge: 'Free tier' },
            { value: 'meta-llama-3-1-8b-instruct',       label: 'Llama 3.1 8B',        costPer1M: 0.02, costLabel: 'Free', badge: 'Free tier' },
            { value: 'Mistral-Nemo',                     label: 'Mistral Nemo',        costPer1M: 0.03, costLabel: 'Free', badge: 'Free tier' },
            { value: 'meta-llama-3-1-70b-instruct',      label: 'Llama 3.1 70B',       costPer1M: 0.04, costLabel: 'Free', badge: 'Free tier' },
            { value: 'gpt-4o-mini',                      label: 'GPT-4o Mini',         costPer1M: 0.05, costLabel: 'Free', badge: 'Free · Vision' },
            { value: 'gpt-4.1-mini',                     label: 'GPT-4.1 Mini',        costPer1M: 0.06, costLabel: 'Free', badge: 'Free · Vision' },
            { value: 'gpt-4o',                           label: 'GPT-4o',              costPer1M: 0.07, costLabel: 'Free', badge: 'Free · Vision' },
        ],
    },

    // ── HuggingFace ───────────────────────────────────────────────────────────
    {
        value: 'huggingface', label: 'HuggingFace', hint: 'hf_...', apiKeyField: 'extraction_huggingface_api_key',
        supportsFiles: true,
        description: 'Serverless inference API · vision on select models · free tier',
        docsUrl: 'https://huggingface.co/settings/tokens',
        keyInstructions: 'Free tier with rate limits. Create a HuggingFace account, then go to huggingface.co/settings/tokens and create a token (choose "Read" access).',
        models: [
            { value: 'mistralai/Mistral-7B-Instruct-v0.3',          label: 'Mistral 7B v0.3',          costPer1M: 0.10, costLabel: '$0.10/1M' },
            { value: 'microsoft/Phi-3.5-mini-instruct',              label: 'Phi-3.5 Mini',             costPer1M: 0.15, costLabel: '$0.15/1M' },
            { value: 'meta-llama/Llama-3.1-8B-Instruct',            label: 'Llama 3.1 8B',             costPer1M: 0.20, costLabel: '$0.20/1M' },
            { value: 'Qwen/Qwen2.5-7B-Instruct',                    label: 'Qwen 2.5 7B',              costPer1M: 0.20, costLabel: '$0.20/1M' },
            { value: 'google/gemma-2-9b-it',                        label: 'Gemma 2 9B',               costPer1M: 0.20, costLabel: '$0.20/1M' },
            { value: 'meta-llama/Llama-3.2-11B-Vision-Instruct',    label: 'Llama 3.2 11B Vision',     costPer1M: 0.25, costLabel: '$0.25/1M', badge: 'Vision' },
            { value: 'meta-llama/Llama-3.3-70B-Instruct',           label: 'Llama 3.3 70B',            costPer1M: 0.40, costLabel: '$0.40/1M' },
            { value: 'Qwen/Qwen2.5-72B-Instruct',                   label: 'Qwen 2.5 72B',             costPer1M: 0.40, costLabel: '$0.40/1M' },
            { value: 'meta-llama/Llama-3.2-90B-Vision-Instruct',    label: 'Llama 3.2 90B Vision',     costPer1M: 0.80, costLabel: '$0.80/1M', badge: 'Vision' },
        ],
    },

    // ── Cloudflare Workers AI ─────────────────────────────────────────────────
    {
        value: 'cloudflare', label: 'Cloudflare Workers AI', hint: 'API token', apiKeyField: 'extraction_cloudflare_api_key',
        supportsFiles: true,
        description: 'Edge AI · all models free within Workers quotas · vision + reasoning',
        docsUrl: 'https://dash.cloudflare.com/profile/api-tokens',
        keyInstructions: 'Free within Cloudflare Workers limits. Create an API token at dash.cloudflare.com/profile/api-tokens with "Workers AI:Read" permission. Your Account ID is shown in the right sidebar of dash.cloudflare.com.',
        extraFields: [{ key: 'extraction_cloudflare_account_id', label: 'Account ID', hint: '32-char hex ID from dash.cloudflare.com' }],
        models: [
            { value: '@cf/meta/llama-3.2-1b-instruct',                       label: 'Llama 3.2 1B',                costPer1M: 0.00, costLabel: 'Free', badge: 'Free' },
            { value: '@cf/meta/llama-3.1-8b-instruct-fast',                  label: 'Llama 3.1 8B Fast',           costPer1M: 0.01, costLabel: 'Free', badge: 'Free' },
            { value: '@cf/google/gemma-3-12b-it',                            label: 'Gemma 3 12B',                 costPer1M: 0.02, costLabel: 'Free', badge: 'Free' },
            { value: '@cf/meta/llama-3.2-11b-vision-instruct',               label: 'Llama 3.2 11B Vision',        costPer1M: 0.03, costLabel: 'Free', badge: 'Free · Vision' },
            { value: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',             label: 'Llama 3.3 70B Fast',          costPer1M: 0.04, costLabel: 'Free', badge: 'Free' },
            { value: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',         label: 'DeepSeek R1 Distill 32B',     costPer1M: 0.05, costLabel: 'Free', badge: 'Free · Reasoning' },
            { value: '@cf/qwen/qwq-32b',                                     label: 'Qwen QwQ 32B',                costPer1M: 0.06, costLabel: 'Free', badge: 'Free · Reasoning' },
        ],
    },

    // ── Cohere ────────────────────────────────────────────────────────────────
    {
        value: 'cohere', label: 'Cohere', hint: 'no specific prefix', apiKeyField: 'extraction_cohere_api_key',
        supportsFiles: false,
        description: 'Command-R models · free trial tier · text-only',
        docsUrl: 'https://dashboard.cohere.com/api-keys',
        keyInstructions: 'Free trial tier — no credit card required initially. Sign up at cohere.com and get your key at dashboard.cohere.com/api-keys.',
        models: [
            { value: 'command-r',        label: 'Command R',        costPer1M: 0.15, costLabel: '$0.15/1M', badge: 'Free tier' },
            { value: 'command-r-plus',   label: 'Command R+',       costPer1M: 2.50, costLabel: '$2.50/1M' },
            { value: 'command-a-03-2025', label: 'Command A',       costPer1M: 2.50, costLabel: '$2.50/1M' },
        ],
    },

    // ── Perplexity ────────────────────────────────────────────────────────────
    {
        value: 'perplexity', label: 'Perplexity', hint: 'pplx-...', apiKeyField: 'extraction_perplexity_api_key',
        supportsFiles: false,
        description: 'Search-augmented Sonar models · credits on signup',
        docsUrl: 'https://www.perplexity.ai/settings/api',
        keyInstructions: 'Credits included on signup. Sign in at perplexity.ai and go to Settings → API to generate your key.',
        models: [
            { value: 'sonar',              label: 'Sonar',             costPer1M: 1.00, costLabel: '$1.00/1M' },
            { value: 'sonar-pro',          label: 'Sonar Pro',         costPer1M: 3.00, costLabel: '$3.00/1M' },
            { value: 'sonar-reasoning',    label: 'Sonar Reasoning',   costPer1M: 5.00, costLabel: '$5.00/1M', badge: 'Reasoning' },
            { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro', costPer1M: 8.00, costLabel: '$8.00/1M', badge: 'Reasoning' },
        ],
    },

    // ── DeepInfra ─────────────────────────────────────────────────────────────
    {
        value: 'deepinfra', label: 'DeepInfra', hint: 'no specific prefix', apiKeyField: 'extraction_deepinfra_api_key',
        supportsFiles: false,
        description: 'Very cheap open-source hosting · free credits on signup · text-only',
        docsUrl: 'https://deepinfra.com/dash?tab=api_keys',
        keyInstructions: 'Free $0.50 credit on signup — no credit card required. Sign up at deepinfra.com and get your key from the dashboard.',
        models: [
            { value: 'meta-llama/Meta-Llama-3.1-8B-Instruct',           label: 'Llama 3.1 8B',          costPer1M: 0.06, costLabel: '$0.06/1M' },
            { value: 'google/gemma-2-9b-it',                             label: 'Gemma 2 9B',             costPer1M: 0.06, costLabel: '$0.06/1M' },
            { value: 'Qwen/Qwen2.5-7B-Instruct',                         label: 'Qwen 2.5 7B',            costPer1M: 0.07, costLabel: '$0.07/1M' },
            { value: 'microsoft/phi-4',                                   label: 'Phi-4',                  costPer1M: 0.10, costLabel: '$0.10/1M' },
            { value: 'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF',        label: 'Nemotron 70B',           costPer1M: 0.13, costLabel: '$0.13/1M' },
            { value: 'meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo',     label: 'Llama 3.3 70B Turbo',   costPer1M: 0.23, costLabel: '$0.23/1M' },
            { value: 'Qwen/Qwen2.5-72B-Instruct',                        label: 'Qwen 2.5 72B',           costPer1M: 0.35, costLabel: '$0.35/1M' },
            { value: 'deepseek-ai/DeepSeek-R1',                          label: 'DeepSeek R1',            costPer1M: 3.00, costLabel: '$3.00/1M', badge: 'Reasoning' },
        ],
    },
];

/** Flat list of all models sorted ascending by cost (cheapest first). */
export const ALL_MODELS_SORTED = AI_PROVIDERS
    .flatMap(p => p.models.map(m => ({ ...m, provider: p.value, providerLabel: p.label, supportsFiles: p.supportsFiles })))
    .sort((a, b) => a.costPer1M - b.costPer1M);

/** Returns models for a given provider, sorted cheapest first. */
export function modelsForProvider(providerValue) {
    const p = AI_PROVIDERS.find(p => p.value === providerValue);
    if (!p) return [];
    return [...p.models].sort((a, b) => a.costPer1M - b.costPer1M);
}

/** Reads the API key for a provider from cached store settings. */
export function getApiKeyFromSettings(providerValue, settings) {
    if (!settings) return '';
    const p = AI_PROVIDERS.find(p => p.value === providerValue);
    if (!p) return '';
    return settings[p.apiKeyField] || '';
}

/** Returns the first provider that has an API key configured in store settings. */
export function firstConfiguredProvider(settings) {
    if (!settings) return AI_PROVIDERS[0];
    return AI_PROVIDERS.find(p => settings[p.apiKeyField]) || AI_PROVIDERS[0];
}

/**
 * Returns the file-capability suffix for a model option label.
 * Three tiers:
 *   pdf:true models (Gemini/Anthropic) → [Scanned PDF + Image ✓]
 *   vision:true models (OpenAI, Groq vision, etc.) → [Image ✓ / Excel ✓]
 *   text-only models → [Excel ✓ / Text PDF only]
 *
 * Excel and text-based PDFs are extracted server-side and work with ALL models.
 * Only scanned/image PDFs require a vision-capable backend path (Gemini or Anthropic).
 */
export function fileCapabilityLabel(model) {
    if (model.pdf) return ' [Scanned PDF + Image ✓]';
    const badge = (model.badge || '').toLowerCase();
    if (badge.includes('vision')) return ' [Image ✓ · Excel ✓ · Text PDF ✓]';
    return ' [Excel ✓ · Text PDF ✓]';
}
