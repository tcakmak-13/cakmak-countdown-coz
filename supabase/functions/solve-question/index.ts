import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate hash for image URL to detect duplicates
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionId, imageUrl, subject, category, description } = await req.json();

    if (!questionId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: "questionId ve imageUrl gereklidir" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY yapılandırılmamış");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate image hash
    const imageHash = hashString(imageUrl);

    // Check if we already have a solution for this image
    const { data: existingSolution } = await supabase
      .from("ai_solutions")
      .select("*")
      .eq("image_hash", imageHash)
      .single();

    if (existingSolution) {
      console.log("Mevcut çözüm bulundu, önbellekten dönüyor...");
      return new Response(
        JSON.stringify({
          success: true,
          solution: existingSolution,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // System prompt for AI Vision Analysis
    const systemPrompt = `Sen YKS sınavına hazırlanan Türk öğrencilere yardımcı olan uzman bir eğitim asistanısın.

GÖREV: Verilen soru görseli analiz et ve adım adım çözümünü yap.

ÇIKTI FORMATI (Bu yapıya kesinlikle uy):

📚 **[KAZANIM]**
Bu sorunun ait olduğu konu ve alt başlığı yaz. Örnek: "Logaritma - Logaritma Kuralları ve Özellikleri"

📝 **[ADIM ADIM ÇÖZÜM]**
1. İlk adımı açıkla...
2. İkinci adımı açıkla...
3. Son adıma kadar devam et...

✅ **[CEVAP]**
Doğru cevap şıkkını belirt (A, B, C, D veya E)

💡 **[KRİTİK NOT]**
Bu soru tipinde dikkat edilmesi gereken püf noktası, sık yapılan hata veya kısayol.

🏷️ **[ETİKETLER]**
#Konu1 #Konu2 şeklinde 2-3 etiket

KURALLAR:
- Türkçe cevap ver
- Matematiksel ifadeleri düz metin olarak yaz (x², √, ∑ gibi Unicode karakterler kullan)
- Her adımı anlaşılır ve sade bir dille açıkla
- Öğrencinin seviyesine uygun ol
- Geometri/grafik sorularında şekli de analiz et`;

    const userPrompt = `Lütfen aşağıdaki soruyu analiz et ve çöz:

Branş: ${subject || "Belirtilmemiş"}
Kategori: ${category || "Belirtilmemiş"}
${description ? `Açıklama: ${description}` : ""}

Soru görseli URL: ${imageUrl}`;

    console.log("AI Vision analizi başlatılıyor...");

    // Call Lovable AI with Vision model (gemini-2.5-pro for best image analysis)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Çok fazla istek gönderildi. Lütfen biraz bekleyin." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredisi yetersiz. Lütfen yöneticiyle iletişime geçin." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway hatası:", response.status, errorText);
      throw new Error(`AI Gateway hatası: ${response.status}`);
    }

    const aiResponse = await response.json();
    const solutionText = aiResponse.choices?.[0]?.message?.content || "";

    if (!solutionText) {
      throw new Error("AI yanıt üretemedi");
    }

    console.log("AI çözümü alındı, veritabanına kaydediliyor...");

    // Extract topic analysis from the solution
    const topicMatch = solutionText.match(/\[KAZANIM\]\s*([\s\S]*?)(?=📝|\[ADIM|$)/i);
    const topicAnalysis = topicMatch?.[1]?.trim().replace(/^\*+|\*+$/g, '').trim() || subject;

    // Extract tags
    const tagMatch = solutionText.match(/\[ETİKETLER\]\s*([\s\S]*?)$/i);
    const tags = tagMatch?.[1]?.match(/#\w+/g) || [`#${subject}`];

    // Parse reasoning steps
    const stepsMatch = solutionText.match(/\[ADIM ADIM ÇÖZÜM\]\s*([\s\S]*?)(?=✅|\[CEVAP|$)/i);
    const stepsText = stepsMatch?.[1]?.trim() || "";
    const reasoningSteps = stepsText
      .split(/\n(?=\d+\.)/)
      .filter(s => s.trim())
      .map(s => s.trim());

    // Extract study recommendation (kritik not)
    const kritikMatch = solutionText.match(/\[KRİTİK NOT\]\s*([\s\S]*?)(?=🏷️|\[ETİKETLER|$)/i);
    const studyRecommendation = kritikMatch?.[1]?.trim().replace(/^\*+|\*+$/g, '').trim() || null;

    // Save solution to database
    const { data: savedSolution, error: saveError } = await supabase
      .from("ai_solutions")
      .insert({
        question_id: questionId,
        image_hash: imageHash,
        solution_text: solutionText,
        topic_analysis: topicAnalysis,
        reasoning_steps: reasoningSteps,
        study_recommendation: studyRecommendation,
        model_used: "google/gemini-2.5-pro",
        confidence_score: 0.92,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Çözüm kaydetme hatası:", saveError);
      // Still return the solution even if save fails
      return new Response(
        JSON.stringify({
          success: true,
          solution: {
            solution_text: solutionText,
            topic_analysis: topicAnalysis,
            reasoning_steps: reasoningSteps,
            study_recommendation: studyRecommendation,
            tags: tags,
          },
          cached: false,
          saveError: saveError.message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Çözüm başarıyla kaydedildi:", savedSolution.id);

    return new Response(
      JSON.stringify({
        success: true,
        solution: {
          ...savedSolution,
          tags: tags,
        },
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("solve-question hatası:", error);
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
