import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = [
    { id: 1, name: "OpenAI GPT-4o", provider: "openai", model: "gpt-4o", status: "HEALTHY", latency_ms: 280, error_rate: 0.1 },
    { id: 2, name: "Anthropic Claude 3.5 Sonnet", provider: "anthropic", model: "claude-3-5-sonnet-20241022", status: "HEALTHY", latency_ms: 310, error_rate: 0.0 },
    { id: 3, name: "Google Gemini 1.5 Pro", provider: "google", model: "gemini-1.5-pro", status: "HEALTHY", latency_ms: 240, error_rate: 0.0 },
    { id: 4, name: "DeepSeek R1 Reasoning", provider: "deepseek", model: "deepseek-reasoner", status: "HEALTHY", latency_ms: 450, error_rate: 0.2 },
    { id: 5, name: "Groq Llama 3.3 70B Fast", provider: "groq", model: "llama-3.3-70b-versatile", status: "HEALTHY", latency_ms: 110, error_rate: 0.0 },
    { id: 6, name: "Serper Google Search Engine", provider: "serper", model: "search-api", status: "HEALTHY", latency_ms: 190, error_rate: 0.0 }
  ];
  return proxyToBackend("/api/providers", req, fallback);
}
