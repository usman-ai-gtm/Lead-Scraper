export interface DefaultProvider {
  id: number;
  name: string;
  type: string;
  model: string;
  apiKey: string;
  status: string;
}

export const USMAN_DEFAULT_29_PROVIDERS: DefaultProvider[] = [
  { id: 1, name: "Serper API", type: "Search Engine", model: "google-search", apiKey: "2baa9b7d5907ecc3fe3fceebb8c4b9b7e30e3297", status: "Active" },
  { id: 2, name: "Crawl4AI", type: "Scraper Engine", model: "crawl4ai-markdown", apiKey: "", status: "Standby" },
  { id: 3, name: "Gemini AI Studio", type: "Primary Researcher", model: "gemini-1.5-pro", apiKey: "AQ.Ab8RN6I...", status: "Active" },
  { id: 4, name: "Groq Cloud", type: "Primary Reasoner", model: "llama-3.3-70b-versatile", apiKey: "gsk_ThbJq7...", status: "Active" },
  { id: 5, name: "Cerebras Cloud", type: "Super-Speed Inference", model: "llama3.1-70b", apiKey: "csk-95ycfn...", status: "Active" },
  { id: 6, name: "SambaNova Cloud", type: "Deep Analytics", model: "Meta-Llama-3.1-405B-Instruct", apiKey: "b4fc9f8f-a...", status: "Active" },
  { id: 7, name: "OpenRouter AI", type: "Multi-Model Gateway", model: "deepseek/deepseek-chat", apiKey: "sk-or-v1-5...", status: "Active" },
  { id: 8, name: "N-Router AI", type: "Heavy Token Pool", model: "default-model", apiKey: "", status: "Standby" },
  { id: 9, name: "API-NEXT", type: "Dynamic Model Handler", model: "default-model", apiKey: "", status: "Standby" },
  { id: 10, name: "AIML API", type: "Backup Cluster Parser", model: "mistralai/mistral-large-latest", apiKey: "d1f112c66d...", status: "Active" },
  { id: 11, name: "Plugsky AI", type: "Continuous Tokens", model: "default-model", apiKey: "sk-live-c0...", status: "Active" },
  { id: 12, name: "Kilo AI", type: "Deep Requests Pipeline", model: "default-model", apiKey: "", status: "Standby" },
  { id: 13, name: "Xyro AI", type: "Multi-threading Matrix", model: "default-model", apiKey: "", status: "Standby" },
  { id: 14, name: "BazaarLink AI", type: "SDK Conversion", model: "openai-compatible", apiKey: "", status: "Standby" },
  { id: 15, name: "DeepSeek API", type: "Efficiency Tracker", model: "deepseek-chat", apiKey: "sk-aa91ff2...", status: "Active" },
  { id: 16, name: "NVIDIA NIM (Build)", type: "Enterprise Grade", model: "meta/llama-3.1-70b-instruct", apiKey: "", status: "Standby" },
  { id: 17, name: "GitHub Models", type: "Developer Stream", model: "gpt-4o", apiKey: "", status: "Standby" },
  { id: 18, name: "Mistral AI (La Plateforme)", type: "Codestral Framework", model: "codestral-latest", apiKey: "", status: "Standby" },
  { id: 19, name: "Cloudflare Workers AI", type: "Serverless Neurons", model: "@cf/meta/llama-3-8b-instruct", apiKey: "cfk_h7RXqt...", status: "Active" },
  { id: 20, name: "Hugging Face Serverless", type: "Open-Source Endpoint", model: "meta-llama/Meta-Llama-3-70B-Instruct", apiKey: "", status: "Standby" },
  { id: 21, name: "Cohere AI", type: "Enterprise Text", model: "command-r-plus", apiKey: "cohere_gTb...", status: "Active" },
  { id: 22, name: "siliconflow", type: "Inference Provider", model: "Qwen/Qwen2.5-72B-Instruct", apiKey: "sk-qwmkkpl...", status: "Active" },
  { id: 23, name: "Aion Labs", type: "Inference Provider", model: "default-model", apiKey: "alv2_vUlAc...", status: "Active" },
  { id: 24, name: "Venice.Ai", type: "Privacy Inference", model: "default-model", apiKey: "VENICE_INF...", status: "Active" },
  { id: 25, name: "DeepInfra", type: "Inference Provider", model: "meta-llama/Meta-Llama-3.1-70B-Instruct", apiKey: "KDUp1eiy1y...", status: "Active" },
  { id: 26, name: "Novita AI", type: "Inference Provider", model: "meta-llama/llama-3-70b-instruct", apiKey: "sk_PiAJZoE...", status: "Active" },
  { id: 27, name: "Hyperbolic", type: "Inference Provider", model: "meta-llama/Meta-Llama-3.1-70B-Instruct", apiKey: "sk_live_iO...", status: "Active" },
  { id: 28, name: "Friendli AI", type: "Production Inference", model: "meta-llama-3-70b-instruct", apiKey: "flp_F5ECpL...", status: "Active" },
  { id: 29, name: "serpapi", type: "Search Engine", model: "google", apiKey: "1ceef6f408...", status: "Active" },
];
