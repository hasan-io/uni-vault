import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const {
      name, avgMarks, attendancePct,
      achievementCount, achievementTypes, skills
    } = body;

    const prompt = `Analyze this student resume profile and return ONLY a valid JSON object.

Student Profile:
- Name: ${name || "Unknown"}
- Academic Average: ${avgMarks}%
- Attendance: ${attendancePct}%
- Verified Achievements: ${achievementCount}
- Achievement Types: ${(achievementTypes || []).join(", ") || "None"}
- Skills: ${(skills || []).join(", ") || "None"}

Return ONLY this JSON structure, no extra text, no markdown, no backticks:
{
  "score": <number 0-100>,
  "suggestions": [
    "<specific suggestion referencing actual data>",
    "<specific suggestion referencing actual data>",
    "<specific suggestion referencing actual data>",
    "<specific suggestion referencing actual data>"
  ]
}

Scoring guide:
- Academic average contributes 30 points max
- Achievements contribute 40 points max  
- Skills contribute 20 points max
- Attendance contributes 10 points max

Make suggestions specific — mention actual numbers from the profile.
Example: "You have ${achievementCount} verified achievements — aim for at least 5 to stand out."`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "You are a resume analysis expert. You only respond with valid JSON. Never use markdown, never use backticks, never add any text outside the JSON object.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq error:", response.status, errText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log("Groq raw response:", content);

    // Clean any accidental markdown and parse
    const cleaned = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Function error:", e);
    return new Response(
      JSON.stringify({
        score: 0,
        suggestions: [
          "Analysis failed. Please ensure GROQ_API_KEY is set correctly in Supabase secrets and try again."
        ],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});