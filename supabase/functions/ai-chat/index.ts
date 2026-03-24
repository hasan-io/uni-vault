import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const systemPrompt = `You are UniVault's academic advisor chatbot. You help university students with skill development, career guidance, and learning paths. Be concise, encouraging, and practical. Tailor advice based on the student's course and skills when available.
${context?.name ? `Student name: ${context.name}` : ""}
${context?.course ? `Course: ${context.course}` : ""}
${context?.skills?.length ? `Student's current skills: ${context.skills.join(", ")}` : ""}
${context?.achievements?.length ? `Achievement types: ${context.achievements.join(", ")}` : ""}
Keep responses focused, actionable and encouraging. Use markdown formatting sparingly.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 800,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      console.error("Groq error:", status, errText);
      if (status === 429) return new Response(
        JSON.stringify({ error: "Rate limited, please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      return new Response(
        JSON.stringify({ error: "AI error: " + status }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream response back to client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (e) {
    console.error("Function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});