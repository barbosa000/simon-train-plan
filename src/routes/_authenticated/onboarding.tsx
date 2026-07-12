import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateWorkoutPlan } from "@/lib/workout.functions";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({ component: Onboarding });

const goals = [
  { v: "hipertrofia", label: "Hipertrofia", desc: "Ganho de massa muscular" },
  { v: "emagrecimento", label: "Emagrecimento", desc: "Perda de gordura" },
  { v: "forca", label: "Força", desc: "Máximo desempenho" },
  { v: "condicionamento", label: "Condicionamento", desc: "Resistência e fôlego" },
  { v: "saude_geral", label: "Saúde geral", desc: "Bem-estar e disposição" },
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const generate = useServerFn(generateWorkoutPlan);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    sex: "masculino" as "masculino" | "feminino" | "outro",
    age: 25,
    weight_kg: 75,
    height_cm: 175,
    experience_level: "iniciante" as "iniciante" | "intermediario" | "avancado",
    goals: ["hipertrofia"] as (typeof goals)[number]["v"][],
    days_per_week: 4,
    minutes_per_session: 60,
    limitations: "",
  });

  const mutation = useMutation({
    mutationFn: () => generate({
      data: {
        ...form,
        limitations: form.limitations || null,
        age: form.age || null,
      },
    }),
    onSuccess: () => {
      toast.success("Sua planilha está pronta!");
      navigate({ to: "/dashboard" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao gerar"),
  });


  const steps = [
    { title: "Sobre você", body: <StepAbout form={form} setForm={setForm} /> },
    { title: "Sua experiência", body: <StepExperience form={form} setForm={setForm} /> },
    { title: "Seu objetivo", body: <StepGoal form={form} setForm={setForm} /> },
    { title: "Sua rotina", body: <StepRoutine form={form} setForm={setForm} /> },
    { title: "Limitações", body: <StepLimits form={form} setForm={setForm} /> },
  ];
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center justify-between text-sm text-muted-foreground">
        <span>Etapa {step + 1} de {steps.length}</span>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 w-8 rounded-full transition-colors ${i <= step ? "bg-gold" : "bg-border"}`} />
          ))}
        </div>
      </div>

      <div className="animate-fade-up rounded-2xl border border-border bg-card p-8 shadow-soft" key={step}>
        <h2 className="font-display text-3xl">{current.title}</h2>
        <div className="mt-6">{current.body}</div>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0 || mutation.isPending}
          className="rounded-full px-5 py-2 text-sm text-muted-foreground disabled:opacity-40"
        >
          Voltar
        </button>
        <button
          onClick={() => isLast ? mutation.mutate() : setStep(step + 1)}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLast ? (<><Sparkles className="h-4 w-4 text-gold" /> Gerar minha planilha</>) : "Continuar"}
        </button>
      </div>
    </div>
  );
}

type Form = Parameters<typeof StepAbout>[0]["form"];
type Setter = Parameters<typeof StepAbout>[0]["setForm"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function StepAbout({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Sexo">
        <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} className={inputCls}>
          <option value="masculino">Masculino</option><option value="feminino">Feminino</option><option value="outro">Outro</option>
        </select>
      </Field>
      <Field label="Idade">
        <input type="number" min={12} max={90} value={form.age} onChange={(e) => setForm({ ...form, age: +e.target.value })} className={inputCls} />
      </Field>
      <Field label="Peso (kg)">
        <input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: +e.target.value })} className={inputCls} />
      </Field>
      <Field label="Altura (cm)">
        <input type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: +e.target.value })} className={inputCls} />
      </Field>
    </div>
  );
}

function StepExperience({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const opts = [
    { v: "iniciante", label: "Iniciante", desc: "Menos de 6 meses" },
    { v: "intermediario", label: "Intermediário", desc: "6 meses a 2 anos" },
    { v: "avancado", label: "Avançado", desc: "Mais de 2 anos" },
  ];
  return (
    <div className="grid gap-3">
      {opts.map((o) => (
        <button key={o.v} onClick={() => setForm({ ...form, experience_level: o.v })}
          className={`rounded-xl border p-4 text-left transition-all ${form.experience_level === o.v ? "border-gold bg-gold/5" : "border-border hover:border-foreground/30"}`}>
          <div className="font-medium">{o.label}</div>
          <div className="text-sm text-muted-foreground">{o.desc}</div>
        </button>
      ))}
    </div>
  );
}

function StepGoal({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {goals.map((g) => (
        <button key={g.v} onClick={() => setForm({ ...form, goal: g.v })}
          className={`rounded-xl border p-4 text-left transition-all ${form.goal === g.v ? "border-gold bg-gold/5" : "border-border hover:border-foreground/30"}`}>
          <div className="font-medium">{g.label}</div>
          <div className="text-sm text-muted-foreground">{g.desc}</div>
        </button>
      ))}
    </div>
  );
}

function StepRoutine({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="space-y-6">
      <Field label={`Dias por semana: ${form.days_per_week}`}>
        <input type="range" min={1} max={7} value={form.days_per_week} onChange={(e) => setForm({ ...form, days_per_week: +e.target.value })} className="w-full accent-gold" />
      </Field>
      <Field label={`Minutos por sessão: ${form.minutes_per_session}`}>
        <input type="range" min={20} max={120} step={5} value={form.minutes_per_session} onChange={(e) => setForm({ ...form, minutes_per_session: +e.target.value })} className="w-full accent-gold" />
      </Field>
    </div>
  );
}

function StepLimits({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <Field label="Fraturas, lesões ou limitações (opcional)">
      <textarea rows={5} placeholder="Ex: hérnia de disco lombar, dor no ombro direito, cirurgia no joelho..."
        value={form.limitations} onChange={(e) => setForm({ ...form, limitations: e.target.value })} className={inputCls} />
    </Field>
  );
}
