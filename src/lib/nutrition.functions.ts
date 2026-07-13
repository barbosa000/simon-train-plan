import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getNutritionLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  });

export const logNutrition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      calories: z.number().nullable().optional(),
      protein: z.number().nullable().optional(),
      carbs: z.number().nullable().optional(),
      fat: z.number().nullable().optional(),
      notes: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase.from("nutrition_logs").insert({
      user_id: userId,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      notes: data.notes,
      date: new Date().toISOString().split('T')[0]
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getActiveDietPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: plan } = await supabase
      .from("nutrition_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return plan;
  });

export const generateDietPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { data: intake } = await supabase
      .from("intakes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!intake) throw new Error("Preencha o formulário de treino primeiro para que a IA conheça seu perfil.");

    const prompt = `Você é um nutricionista esportivo. Crie um plano alimentar de sugestão em formato JSON para o seguinte aluno:

Dados:
- Peso: ${intake.weight_kg} kg
- Altura: ${intake.height_cm} cm
- Sexo: ${intake.sex}
- Idade: ${intake.age || "não informada"}
- Objetivos: ${intake.goal}

Retorne APENAS um objeto JSON válido, sem markdown:
{
  "target_calories": 2500,
  "macros": {
    "protein": 160,
    "carbs": 250,
    "fat": 70
  },
  "meals": [
    {
      "name": "Café da Manhã",
      "time": "08:00",
      "options": ["Opção 1: Ovos mexidos com pão", "Opção 2: Aveia com whey"]
    }
  ],
  "hydration_liters": 3.5,
  "notes": "Dicas gerais..."
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI Gateway ${res.status}: ${text}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");
    
    let plan: any;
    try { plan = JSON.parse(content); } catch { throw new Error("Resposta inválida da IA"); }

    await supabase.from("nutrition_plans").update({ is_active: false }).eq("user_id", userId);

    const { data: planRow, error: planErr } = await supabase
      .from("nutrition_plans")
      .insert({
        user_id: userId,
        plan,
        is_active: true,
      })
      .select()
      .single();

    if (planErr) throw new Error(planErr.message);
    return { id: planRow.id, plan };
  });
