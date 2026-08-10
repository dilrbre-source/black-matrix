export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === "POST") {
      try {
        const { prompt, systemPrompt } = await request.json();
        const sys = systemPrompt || "أنت مساعد ذكي ونظام Black Matrix Executer. أجب باللغة العربية بأسلوب واضح ودقيق.";

        const aiResponse = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
          messages: [
            { role: "system", content: sys },
            { role: "user", content: prompt || "مرحبا" }
          ]
        });

        const reply = aiResponse.response || "تمت معالجة الطلب بنجاح.";

        return new Response(JSON.stringify({ result: reply }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ result: `خطأ في الذكاء الاصطناعي: ${error.message}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("BLACK MATRIX CORE API ONLINE", { headers: corsHeaders });
  }
};
