const FALLBACK_OPENROUTER_MODELS = [
  { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B IT (Free)", provider: "openrouter", description: "Google's latest lightweight text generation model with incredible speed.", contextLength: 8192, isFree: true },
  { id: "liquid/lfm-2.5-1.2b-instruct:free", name: "Liquid LFM 1.2B Instruct (Free)", provider: "openrouter", description: "An incredibly fast, highly optimized 1.2B model.", contextLength: 32768, isFree: true },
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", name: "Nemotron Nano 12B Vision (Free)", provider: "openrouter", description: "A high-performance multimodal model by NVIDIA.", contextLength: 4096, isFree: true },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "Nemotron-3 Nano (Free)", provider: "openrouter", description: "A highly efficient language model customized by NVIDIA.", contextLength: 4096, isFree: true }
];

const FALLBACK_NVIDIA_MODELS = [
  { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", provider: "nvidia", description: "Highly advanced reasoning and language understanding model.", contextLength: 131072, isFree: true },
  { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct", provider: "nvidia", description: "NVIDIA's customized efficient model with exceptional conversational capabilities.", contextLength: 8192, isFree: true },
  { id: "google/gemma-2-2b-it", name: "Gemma 2 2B IT", provider: "nvidia", description: "Google's lightweight and powerful instruction-following model.", contextLength: 8192, isFree: true }
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
        openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
        nvidiaConfigured: !!process.env.NVIDIA_API_KEY,
        groqConfigured: !!process.env.GROQ_API_KEY
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
    if (process.env.OPENROUTER_API_KEY) {
      list.push(...FALLBACK_OPENROUTER_MODELS);
    }
    if (process.env.NVIDIA_API_KEY) {
      list.push(...FALLBACK_NVIDIA_MODELS);
    }
    if (process.env.GROQ_API_KEY) {
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

      let apiKey = "";
      let baseEndpoint = "";

      if (providerId === "openrouter") {
        apiKey = process.env.OPENROUTER_API_KEY || "";
        baseEndpoint = "https://openrouter.ai/api/v1/chat/completions";
      } else if (providerId === "nvidia") {
        apiKey = process.env.NVIDIA_API_KEY || "";
        baseEndpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
      } else if (providerId === "generic-chat-completion-api") {
        apiKey = process.env.GROQ_API_KEY || "";
        baseEndpoint = "https://api.groq.com/openai/v1/chat/completions";
      } else {
        return new Response(JSON.stringify({ error: "Invalid provider selection." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (!apiKey) {
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
      console.error("[Netlify Serverless Internal Error]:", error);
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
