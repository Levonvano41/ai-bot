import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { botId, message, sessionId, apiKey } = await req.json();

    if (!botId || !message || !sessionId || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("*")
      .eq("id", botId)
      .eq("is_active", true)
      .maybeSingle();

    if (botError || !bot) {
      return new Response(
        JSON.stringify({ error: "Bot not found or inactive" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let conversation = null;
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .eq("bot_id", botId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingConv) {
      conversation = existingConv;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({ bot_id: botId, session_id: sessionId })
        .select()
        .single();

      if (convError) throw convError;
      conversation = newConv;
    }

    await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        role: "user",
        content: message,
      });

    const { data: knowledge } = await supabase
      .from("knowledge_base")
      .select("content")
      .eq("bot_id", botId)
      .limit(5);

    let context = "";
    if (knowledge && knowledge.length > 0) {
      context = knowledge.map((k) => k.content).join("\n\n");
    }

    const styleInstructions: Record<string, string> = {
      formal: "Вы должны общаться официально и профессионально.",
      friendly: "Вы должны общаться дружелюбно и тепло.",
      humorous: "Вы можете использовать юмор в общении, оставаясь профессиональным.",
      expert: "Вы должны общаться как эксперт в своей области, предоставляя детальную информацию.",
    };

    const systemPrompt = `Вы - AI ассистент по имени ${bot.name} для компании ${bot.company_name}.
${bot.industry ? `Сфера деятельности: ${bot.industry}.` : ""}
${bot.description ? `О компании: ${bot.description}` : ""}
${styleInstructions[bot.style] || ""}
${bot.custom_prompt || ""}

Используйте следующую информацию для ответов на вопросы пользователей:
${context}

Отвечайте только на основе предоставленной информации. Если информации недостаточно, честно скажите об этом и предложите связаться с менеджером.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Понял, готов помочь!" }] },
      { role: "user", parts: [{ text: message }] },
    ]);

    const response = result.response;
    const answer = response.text();

    await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        role: "assistant",
        content: answer,
      });

    return new Response(
      JSON.stringify({ answer }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});