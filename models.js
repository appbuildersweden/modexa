/* Model catalogue for Modexa.
 *
 * `cost` is the daily-time multiplier: a 3x model spends three minutes of the
 * 21-hour daily budget for every real minute it runs.
 *
 * `keyEnv` names the server-side variable that holds the provider key. Keys are
 * deliberately NOT part of the bundle: anything shipped to the client can be
 * read by whoever runs the app, so provider calls belong behind a proxy.
 */
export const MODELS = [
  {
    id: "nvidia-deepseek-v4-1-flash",
    name: "DeepSeek V4.1 Flash",
    provider: "NVIDIA",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "deepseek-ai/deepseek-v4.1-flash",
    keyEnv: "NVIDIA_API_KEY_DEEPSEEK",
    cost: 3,
  },
  {
    id: "nvidia-nemotron-3-5-super-vl",
    name: "Nemotron 3.5 Super VL 120B",
    provider: "NVIDIA",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
    keyEnv: "NVIDIA_API_KEY_NEMOTRON_SUPER",
    cost: 5,
  },
  {
    id: "nvidia-nemotron-3-5-lightning",
    name: "Nemotron 3.5 Lightning 30B",
    provider: "NVIDIA",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "nvidia/nemotron-3.5-lightning-30b-a3b",
    keyEnv: "NVIDIA_API_KEY_NEMOTRON_LIGHTNING",
    cost: 2,
  },
  {
    id: "openrouter-gpt-6-1-terra-pro",
    name: "GPT-6.1 Terra Pro",
    provider: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "OpenAI/GPT-6.1-Terra-Pro",
    keyEnv: "OPENROUTER_API_KEY_TERRA",
    cost: 10,
  },
  {
    id: "openrouter-gemma-4-26b",
    name: "Gemma 4 26B",
    provider: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemma-4-26b-a4b-it:free",
    keyEnv: "OPENROUTER_API_KEY_GEMMA",
    cost: 1,
  },
];
