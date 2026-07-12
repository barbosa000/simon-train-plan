import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GoalEnum = z.enum(["emagrecimento", "hipertrofia", "forca", "condicionamento", "saude_geral"]);

const IntakeSchema = z.object({
  weight_kg: z.number().min(30).max(300),
  height_cm: z.number().min(120).max(230),
  sex: z.enum(["masculino", "feminino", "outro"]),
  age: z.number().int().min(12).max(90).optional().nullable(),
  experience_level: z.enum(["iniciante", "intermediario", "avancado"]),
  limitations: z.string().max(500).optional().nullable(),
  goals: z.array(GoalEnum).min(1).max(5),
  focus: z.string().max(500).optional().nullable(),
  days_per_week: z.number().int().min(1).max(7),
  minutes_per_session: z.number().int().min(15).max(180),
});


const goalLabel: Record<string, string> = {
  emagrecimento: "Emagrecimento", hipertrofia: "Hipertrofia",
  forca: "Força", condicionamento: "Condicionamento", saude_geral: "Saúde geral",
};


export const generateWorkoutPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IntakeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { goals, ...rest } = data;
    const goalCsv = goals.join(",");

    // Save intake (goal column stores joined string; check constraint removed)
    const { data: intakeRow, error: intakeErr } = await supabase
      .from("intakes")
      .insert({ ...rest, goal: goalCsv, user_id: userId })
      .select()
      .single();
    if (intakeErr) throw new Error(intakeErr.message);

    const prompt = `Você é um preparador físico especialista em musculação. Crie uma planilha semanal detalhada em JSON para o seguinte aluno.

Dados do aluno:
- Sexo: ${data.sex}
- Idade: ${data.age ?? "não informada"}
- Peso: ${data.weight_kg} kg
- Altura: ${data.height_cm} cm
- Experiência: ${data.experience_level}
- Objetivos: ${goals.map((g) => goalLabel[g]).join(", ")}

- Dias por semana: ${data.days_per_week}
- Tempo por sessão: ${data.minutes_per_session} minutos
- Limitações/lesões: ${data.limitations || "nenhuma"}

Retorne APENAS um objeto JSON válido, sem markdown, com esta estrutura exata:
{
  "title": "Nome curto e motivador da planilha",
  "summary": "1-2 frases descrevendo a divisão e a estratégia",
  "split": "Ex: ABC, Push/Pull/Legs, Full-body",
  "weeks_recommended": 6,
  "days": [
    {
      "day": "Dia 1 — Peito e Tríceps",
      "focus": "Peito, tríceps",
      "warmup": "5 min esteira leve + mobilidade de ombros",
      "exercises": [
        {
          "name": "Supino reto com barra",
          "sets": 4,
          "reps": "8-10",
          "rest_seconds": 90,
          "tempo": "2-0-1-0",
          "cues": "Escápulas retraídas, pés firmes, barra na linha do peito",
          "video_query": "supino reto com barra execução",
          "image_query": "supino reto com barra"
        }
      ],
      "cooldown": "5 min alongamento de peito e tríceps"
    }
  ],
  "nutrition_tips": ["dica 1", "dica 2", "dica 3"],
  "safety_notes": "considerações importantes dadas as limitações do aluno"
}

Regras:
- Respeite o objetivo (hipertrofia = 8-12 reps, força = 3-6 reps, emagrecimento = circuitos + cardio, etc.)
- Considere as limitações e evite exercícios contraindicados
- Inclua entre 5 e 8 exercícios por dia, ajustando ao tempo disponível
- video_query e image_query em português para busca no YouTube/imagens
- Nomes de exercícios em português`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
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

    // Deactivate previous plans
    await supabase.from("workout_plans").update({ is_active: false }).eq("user_id", userId);

    const { data: planRow, error: planErr } = await supabase
      .from("workout_plans")
      .insert({
        user_id: userId,
        intake_id: intakeRow.id,
        title: plan.title ?? "Sua planilha",
        summary: plan.summary ?? null,
        plan,
        is_active: true,
      })
      .select()
      .single();
    if (planErr) throw new Error(planErr.message);

    await supabase.from("profiles").update({ onboarded: true }).eq("id", userId);

    return { id: planRow.id };
  });

export const getActivePlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("onboarded, full_name").eq("id", userId).maybeSingle();
    const { data: plan } = await supabase
      .from("workout_plans").select("*")
      .eq("user_id", userId).eq("is_active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    return { profile, plan };
  });
