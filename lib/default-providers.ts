export interface DefaultProvider {
  id: number;
  name: string;
  type: string;
  model: string;
  apiKey: string;
  envVar?: string;
  status: string;
}

// Note: No API keys or key prefixes are stored in source control.
// Runtime integrations resolve exclusively from server environment variables.
export const USMAN_DEFAULT_29_PROVIDERS: DefaultProvider[] = [
  { id: 1, name: "Serper API", type: "Search Engine", model: "google-search", apiKey: "", envVar: "SERPER_API_KEY", status: "Active" },
  { id: 2, name: "Gemini AI Studio", type: "Primary Researcher", model: "gemini-2.5-flash", apiKey: "", envVar: "GEMINI_API_KEY", status: "Active" },
  { id: 3, name: "Groq Cloud", type: "Optional Reasoner", model: "llama-3.3-70b-versatile", apiKey: "", envVar: "GROQ_API_KEY", status: "Standby" },
  { id: 4, name: "OpenAI API", type: "Optional Assistant", model: "gpt-4o-mini", apiKey: "", envVar: "OPENAI_API_KEY", status: "Standby" },
  { id: 5, name: "Anthropic API", type: "Optional Research", model: "claude-3-5-sonnet", apiKey: "", envVar: "ANTHROPIC_API_KEY", status: "Standby" },
  { id: 6, name: "SerpAPI", type: "Optional Search Backup", model: "google", apiKey: "", envVar: "SERPAPI_API_KEY", status: "Standby" },
];
