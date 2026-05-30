import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Helper function to strip quotes and trim whitespaces from key values (common during copy-pasting to Netlify UI)
function getCleanedKey(key: string | undefined): string {
  if (!key) return "";
  let cleaned = key.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  return cleaned.trim();
}

// Check if a key is formatted properly and not just a placeholder value from .env.example
function isKeyValid(key: string | undefined): boolean {
  const cleaned = getCleanedKey(key);
  if (!cleaned) return false;
  const lower = cleaned.toLowerCase();
  if (
    lower === "my_gemini_api_key" ||
    lower === "my_openrouter_api_key" ||
    lower === "my_nvidia_api_key" ||
    lower === "my_groq_api_key" ||
    lower === "my_app_url" ||
    lower.startsWith("my_") ||
    lower === "placeholder" ||
    lower === "your_api_key"
  ) {
    return false;
  }
  return cleaned.length > 5;
}

// Lazy initializer for Google GenAI client
function getGoogleGenAI(): GoogleGenAI {
  const rawKey = process.env.GEMINI_API_KEY;
  const cleaned = getCleanedKey(rawKey);
  if (!isKeyValid(cleaned)) {
    throw new Error("GEMINI_API_KEY is not configured or contains placeholder text.");
  }
  return new GoogleGenAI({
    apiKey: cleaned,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Parsers
app.use(express.json());

const FALLBACK_OFFLINE_MODELS = [
  { 
    id: "demo/offline-assistant", 
    name: "Demo Assistant (No Keys Required)", 
    provider: "offline" as const, 
    description: "A friendly simulated AI agent that helps you test the chat client offline, custom parameters, and explains how to configure live models easily.", 
    contextLength: 4096, 
    isFree: true 
  }
];

const FALLBACK_OPENROUTER_MODELS = [
  { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B IT (Free)", provider: "openrouter" as const, description: "Google's latest lightweight text generation model with incredible speed.", contextLength: 8192, isFree: true },
  { id: "liquid/lfm-2.5-1.2b-instruct:free", name: "Liquid LFM 1.2B Instruct (Free)", provider: "openrouter" as const, description: "An incredibly fast, highly optimized 1.2B model.", contextLength: 32768, isFree: true },
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", name: "Nemotron Nano 12B Vision (Free)", provider: "openrouter" as const, description: "A high-performance multimodal model by NVIDIA.", contextLength: 4096, isFree: true },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "Nemotron-3 Nano (Free)", provider: "openrouter" as const, description: "A highly efficient language model customized by NVIDIA.", contextLength: 4096, isFree: true }
];

const FALLBACK_NVIDIA_MODELS = [
  { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", provider: "nvidia" as const, description: "Highly advanced reasoning and language understanding model.", contextLength: 131072, isFree: true },
  { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct", provider: "nvidia" as const, description: "NVIDIA's customized efficient model with exceptional conversational capabilities.", contextLength: 8192, isFree: true },
  { id: "google/gemma-2-2b-it", name: "Gemma 2 2B IT", provider: "nvidia" as const, description: "Google's lightweight and powerful instruction-following model.", contextLength: 8192, isFree: true }
];

const FALLBACK_CUSTOM_MODELS = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B [Groq]",
    provider: "generic-chat-completion-api" as const,
    description: "Extremely powerful 120B parameter open-source model running on Groq (65k context length).",
    contextLength: 65536,
    isFree: true,
    customModel: {
      model_display_name: "GPT-OSS 120B [Groq]",
      model: "openai/gpt-oss-120b",
      base_url: "https://api.groq.com/openai/v1",
      api_key: "", // Hidden securely server-side
      provider: "generic-chat-completion-api",
      max_tokens: 65536
    }
  }
];

// Health Check & Key Availability Status
app.get("/api/status", (req, res) => {
  res.json({
    openrouterConfigured: isKeyValid(process.env.OPENROUTER_API_KEY),
    nvidiaConfigured: isKeyValid(process.env.NVIDIA_API_KEY),
    groqConfigured: isKeyValid(process.env.GROQ_API_KEY),
    geminiConfigured: false
  });
});

// Models Endpoint
app.get("/api/models", async (req, res) => {
  try {
    const list: any[] = [];

    // Always include simulated/offline models so user gets immediate visual options and a guiding welcome walkthrough
    list.push(...FALLBACK_OFFLINE_MODELS);

    // Filter list of models based on which keys are configured
    if (isKeyValid(process.env.OPENROUTER_API_KEY)) {
      list.push(...FALLBACK_OPENROUTER_MODELS);
    } else {
      console.log("[Models Config Check] OPENROUTER_API_KEY is not defined. Skipping OpenRouter models.");
    }

    if (isKeyValid(process.env.NVIDIA_API_KEY)) {
      list.push(...FALLBACK_NVIDIA_MODELS);
    } else {
      console.log("[Models Config Check] NVIDIA_API_KEY is not defined. Skipping NVIDIA models.");
    }

    if (isKeyValid(process.env.GROQ_API_KEY)) {
      list.push(...FALLBACK_CUSTOM_MODELS);
    } else {
      console.log("[Models Config Check] GROQ_API_KEY is not defined. Skipping Groq models.");
    }

    res.json(list);
  } catch (error: any) {
    console.error("[Models Endpoint Error]:", error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy Chat Completions with SSE Streaming
app.post("/api/chat", async (req, res) => {
  const { messages, modelId, providerId, temperature, maxTokens, systemPrompt } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  if (providerId === "offline") {
    console.log(`[Offline Simulation Request] Routing simulated content.`);
    const userMessageContent = messages[messages.length - 1]?.content || "";
    const offlineText = `👋 Hello! I am your **Demo Assistant** (Offline Mode). 

I am here to help you test the user interface, typography pairings, and layout transitions completely key-free! 

### 🔧 How to Activate Live LLMs:
To unlock actual, state-of-the-art open-source and proprietary models, follow these quick configuration steps:

1. **Google AI Studio (Preview Mode)**:
   - Your environment automatically has access to a built-in **\`GEMINI_API_KEY\`**, so you can use the **Gemini 3.5 Flash** or **Gemini 3.1 Pro** models immediately without any extra setup!
   - Under the **Secrets** panel in the AI Studio UI, you can configure other keys:
     - **\`OPENROUTER_API_KEY\`** (unlocked OpenRouter free & deep models)
     - **\`NVIDIA_API_KEY\`** (unlocked highly efficient NVIDIA NIMs)
     - **\`GROQ_API_KEY\`** (unlocked blazing-fast Llama-3/custom GPT-OSS via Groq)

2. **When Deploying on Netlify**:
   - Go to your Netlify Site Settings dashboard.
   - Navigate to **Site configuration > Environment variables**.
   - Declare one or more of:
     - **\`OPENROUTER_API_KEY\`**
     - **\`NVIDIA_API_KEY\`**
     - **\`GROQ_API_KEY\`**
     - **\`GEMINI_API_KEY\`**
   - Re-deploy your site or restart your build, and they will become fully operational on your private backend proxy!

### 🧪 Responsive Client Test
I detected that your message was:
> "${userMessageContent}"

Your chat interface is running fully responsive. You can test code blocks, bullet points, Markdown rendering, and parameters in the sidebar settings panels right now!`;

    // Helper to stream simulated response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const words = offlineText.split(/(\s+)/);
    for (const word of words) {
      const chunk = {
        choices: [
          {
            delta: {
              content: word
            }
          }
        ]
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
      await new Promise(resolve => setTimeout(resolve, 15));
    }
    res.write("data: [DONE]\n\n");
    return res.end();
  }

  if (providerId === "gemini") {
    if (!isKeyValid(process.env.GEMINI_API_KEY)) {
      console.warn(`[Proxy Chat Warning] GEMINI_API_KEY is not configured or is placeholder.`);
      return res.status(401).json({ 
        error: "GEMINI_API_KEY is not configured on the server. Please check your secrets." 
      });
    }

    console.log(`[Proxy Gemini Request] Routing request to Gemini model: ${modelId}`);

    try {
      // Map chat messages format to Google GenAI format (it uses roles: user, model)
      const contents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: [{ text: m.content }]
      }));

      const responseStream = await getGoogleGenAI().models.generateContentStream({
        model: modelId || "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt || undefined,
          temperature: temperature ?? 0.7,
        }
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        if (text) {
          const chunkPayload = {
            choices: [
              {
                delta: {
                  content: text
                }
              }
            ]
          };
          res.write(`data: ${JSON.stringify(chunkPayload)}\n\n`);
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        }
      }

      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (error: any) {
      console.error("[Proxy Gemini Error]:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Choose URL and API Key
  let apiKey = "";
  let baseEndpoint = "";

  if (providerId === "openrouter") {
    apiKey = getCleanedKey(process.env.OPENROUTER_API_KEY);
    baseEndpoint = "https://openrouter.ai/api/v1/chat/completions";
  } else if (providerId === "nvidia") {
    apiKey = getCleanedKey(process.env.NVIDIA_API_KEY);
    baseEndpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
  } else if (providerId === "generic-chat-completion-api") {
    // Read Groq API Key securely from server environment instead of browser body
    apiKey = getCleanedKey(process.env.GROQ_API_KEY);
    const custom = req.body.customModel || {};
    baseEndpoint = custom.base_url || "https://api.groq.com/openai/v1/chat/completions";
    if (baseEndpoint && !baseEndpoint.endsWith("/chat/completions")) {
      baseEndpoint = baseEndpoint.replace(/\/+$/, "") + "/chat/completions";
    }
  } else {
    console.warn(`[Proxy Chat Warning] Invalid provider selected: ${providerId}`);
    return res.status(400).json({ error: "Invalid provider selection." });
  }

  if (!isKeyValid(apiKey)) {
    console.warn(`[Proxy Chat Warning] API key for ${providerId} is not configured or is placeholder. Blocked request.`);
    return res.status(401).json({ 
      error: `API key for ${providerId} is not configured on the server. Please check your environment variables.` 
    });
  }

  console.log(`[Proxy Chat Request] Routing request to: ${providerId} | Model: ${modelId} | URL: ${baseEndpoint}`);

  try {
    // Formulate final payload
    const finalMessages = [];
    if (systemPrompt) {
      finalMessages.push({ role: "system", content: systemPrompt });
    }
    messages.forEach((msg: any) => {
      finalMessages.push({ role: msg.role, content: msg.content });
    });

    const payload = {
      model: modelId,
      messages: finalMessages,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 2048,
      stream: true
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    };

    if (providerId === "openrouter") {
      headers["HTTP-Referer"] = process.env.APP_URL || "https://ai.studio/";
      headers["X-Title"] = "Open-Source ChatGPT";
    }

    const apiResponse = await fetch(baseEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`[Proxy Chat API Error] Upstream external service responded with status (${apiResponse.status}):`, errorText);
      let errorParsed;
      try {
        errorParsed = JSON.parse(errorText);
      } catch (err) {
        errorParsed = { error: errorText };
      }
      return res.status(apiResponse.status).json(errorParsed);
    }

    // Set client headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Retrieve stream reader
    if (!apiResponse.body) {
      console.error("[Proxy Chat Stream Error] Upstream returned an empty response body.");
      return res.status(500).json({ error: "External API returned an empty response body." });
    }

    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let isClosed = false;

    req.on("close", () => {
      isClosed = true;
      reader.cancel().catch(e => console.error("Stream cancelled on client disconnect:", e));
    });

    while (!isClosed) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      const decodedChunk = decoder.decode(value, { stream: true });
      res.write(decodedChunk);
      
      // Force flushing if middleware (like compression) buffers content
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    }

    res.end();
  } catch (error: any) {
    console.error("[Proxy Chat Internal Server Error] Error processing chat proxy stream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Configure Vite or production static server middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Open-Source ChatGPT proxy server is running at http://localhost:${PORT}`);
  });
}

startServer();
