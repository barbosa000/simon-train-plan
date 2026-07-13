import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GoalEnum = z.enum(["emagrecimento", "hipertrofia", "forca", "condicionamento", "saude_geral", "atleta"]);

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
  forca: "Força", condicionamento: "Condicionamento", saude_geral: "Saúde geral", atleta: "Atleta de Esporte de Combate (Jiu Jitsu, Judô)",
};


export const generateWorkoutPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IntakeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { goals, focus, ...rest } = data;
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
- Foco / pedidos especiais do aluno: ${focus || "nenhum pedido específico"}

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
      "warmup": "5 min esteira leve",
      "warmup_mobility": [
        {
          "name": "Nome do alongamento/mobilidade ESPECÍFICO para os músculos deste dia",
          "duration": "60s ou 10 reps",
          "cues": "Instrução de como realizar",
          "video_query": "nome do alongamento execução",
          "image_query": "nome do alongamento"
        }
      ],
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
      "cooldown": "5 min alongamento"
    }
  ],
  "nutrition_tips": ["dica 1", "dica 2", "dica 3"],
  "safety_notes": "considerações importantes dadas as limitações do aluno"
}

Regras:
- Se o objetivo incluir Atleta, foque fortemente em condicionamento esportivo, mobilidade, core e explosão.
- IMPORTANTE: Cada dia DEVE ter seu próprio array "warmup_mobility" com 3 a 5 exercícios de mobilidade e alongamento ESPECÍFICOS para os grupos musculares trabalhados naquele dia. Os exercícios de mobilidade devem variar de dia para dia conforme o foco muscular muda.
- Por exemplo: dia de peito deve ter mobilidade de ombro e peitoral; dia de pernas deve ter mobilidade de quadril e tornozelo.
- Respeite as limitações do aluno.
- Inclua entre 5 e 8 exercícios de musculação por dia em "exercises".
- video_query e image_query em português.`;

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

export const refinePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ request: z.string().min(3).max(600) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { data: current, error: curErr } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (curErr) throw new Error(curErr.message);
    if (!current) throw new Error("Nenhuma planilha ativa para ajustar");

    const prompt = `Você é um preparador físico. O aluno já tem esta planilha ativa (JSON):

${JSON.stringify(current.plan)}

O aluno pediu o seguinte ajuste/adição:
"${data.request}"

Atualize a planilha respeitando o pedido. Mantenha a MESMA estrutura JSON exata (title, summary, split, days[], nutrition_tips, safety_notes) com os mesmos campos. Cada dia deve ter seu próprio array "warmup_mobility" com exercícios de mobilidade/alongamento ESPECÍFICOS para os músculos daquele dia. Ajuste apenas o necessário e retorne APENAS o JSON completo atualizado, sem markdown.`;

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

    await supabase.from("workout_plans").update({ is_active: false }).eq("user_id", userId);
    const { data: planRow, error: planErr } = await supabase
      .from("workout_plans")
      .insert({
        user_id: userId,
        intake_id: current.intake_id,
        title: plan.title ?? current.title,
        summary: plan.summary ?? current.summary,
        plan,
        is_active: true,
      })
      .select()
      .single();
    if (planErr) throw new Error(planErr.message);
    return { id: planRow.id };
  });

