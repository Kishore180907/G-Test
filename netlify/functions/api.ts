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

const FALLBACK_GEMINI_MODELS = [
  { 
    id: "gemini-3.5-flash", 
    name: "Gemini 3.5 Flash", 
    provider: "gemini" as const, 
    description: "Google's latest ultra-fast, high-performance lightweight text generation model.", 
    contextLength: 1048576, 
    isFree: true 
  },
  { 
    id: "gemini-3.1-pro-preview", 
    name: "Gemini 3.1 Pro Preview", 
    provider: "gemini" as const, 
    description: "Google's premium reasoning model designed for complex technical, coding, and logical tasks.", 
    contextLength: 2097152, 
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
      api_key: "", // Hidden server-side
      provider: "generic-chat-completion-api",
      max_tokens: 65536
    }
  }
];

export default async (req: Request, context: any) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/$/, "");

  console.log(`[Netlify Function] Path: ${path} | Method: ${req.method}`);

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Route 1: Status Configuration
  if (path.endsWith("/api/status") || path.endsWith("/status")) {
    return new Response(
      JSON.stringify({
        openrouterConfigured: isKeyValid(process.env.OPENROUTER_API_KEY),
        nvidiaConfigured: isKeyValid(process.env.NVIDIA_API_KEY),
        groqConfigured: isKeyValid(process.env.GROQ_API_KEY),
        geminiConfigured: isKeyValid(process.env.GEMINI_API_KEY)
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }

  // Route 2: Get Models
  if (path.endsWith("/api/models") || path.endsWith("/models")) {
    const list: any[] = [];
    
    // Always include offline assistant
    list.push(...FALLBACK_OFFLINE_MODELS);

    if (isKeyValid(process.env.GEMINI_API_KEY)) {
      list.push(...FALLBACK_GEMINI_MODELS);
    }
    if (isKeyValid(process.env.OPENROUTER_API_KEY)) {
      list.push(...FALLBACK_OPENROUTER_MODELS);
    }
    if (isKeyValid(process.env.NVIDIA_API_KEY)) {
      list.push(...FALLBACK_NVIDIA_MODELS);
    }
    if (isKeyValid(process.env.GROQ_API_KEY)) {
      list.push(...FALLBACK_CUSTOM_MODELS);
    }

    return new Response(JSON.stringify(list), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }

  // Route 3: Chat Completions Stream
  if ((path.endsWith("/api/chat") || path.endsWith("/chat")) && req.method === "POST") {
    try {
      const body = await req.json();
      const { messages, modelId, providerId, temperature, maxTokens, systemPrompt } = body;

      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: "Messages array is required." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 1. Intercept Offline/Demo mode
      if (providerId === "offline") {
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

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
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
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 15));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            ...corsHeaders
          }
        });
      }

      // 2. Intercept Gemini mode
      if (providerId === "gemini") {
        if (!isKeyValid(process.env.GEMINI_API_KEY)) {
          return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured or is a placeholder." }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const model = modelId || "gemini-3.5-flash";
        const cleanedGeminiKey = getCleanedKey(process.env.GEMINI_API_KEY);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${cleanedGeminiKey}`;

        const payload = {
          contents: messages.map((m: any) => ({
            role: m.role === "assistant" ? "model" : m.role,
            parts: [{ text: m.content }]
          })),
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          generationConfig: {
            temperature: temperature ?? 0.7,
            maxOutputTokens: maxTokens ?? 2048,
          }
        };

        const apiResponse = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          return new Response(errorText, {
            status: apiResponse.status,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder("utf-8");

        const stream = new ReadableStream({
          async start(controller) {
            const reader = apiResponse.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            let buffer = "";
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith("data: ")) {
                  try {
                    const parsed = JSON.parse(trimmed.substring(6));
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (text) {
                      const chunk = {
                        choices: [
                          {
                            delta: {
                              content: text
                            }
                          }
                        ]
                      };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                    }
                  } catch (e) {
                    // Ignore parsing issues
                  }
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            ...corsHeaders
          }
        });
      }

      // 3. Other third party providers
      let apiKey = "";
      let baseEndpoint = "";

      if (providerId === "openrouter") {
        apiKey = getCleanedKey(process.env.OPENROUTER_API_KEY);
        baseEndpoint = "https://openrouter.ai/api/v1/chat/completions";
      } else if (providerId === "nvidia") {
        apiKey = getCleanedKey(process.env.NVIDIA_API_KEY);
        baseEndpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
      } else if (providerId === "generic-chat-completion-api") {
        apiKey = getCleanedKey(process.env.GROQ_API_KEY);
        baseEndpoint = "https://api.groq.com/openai/v1/chat/completions";
      } else {
        return new Response(JSON.stringify({ error: "Invalid provider selection." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (!isKeyValid(apiKey)) {
        return new Response(
          JSON.stringify({ error: `API key for ${providerId} is not configured on the server. Please check your Netlify environment variables.` }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

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

      console.log(`[Netlify Serverless Function] Routing request to: ${providerId} | Model: ${modelId} | Endpoint: ${baseEndpoint}`);

      const apiResponse = await fetch(baseEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`[Netlify Stream API Error] External service responded with status (${apiResponse.status}):`, errorText);
        return new Response(errorText, {
          status: apiResponse.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // Netlify v2 functions natively support pipeline stream response.
      return new Response(apiResponse.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          ...corsHeaders
        }
      });
    } catch (error: any) {
      console.error("[Netlify Serverless Error]:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  return new Response(JSON.stringify({ error: `Route not found: ${path}` }), {
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
};
