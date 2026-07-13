import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActivePlan, refinePlan } from "@/lib/workout.functions";
import { logExercise } from "@/lib/progress.functions";
import { resolveExerciseVideo } from "@/lib/media.functions";
import { Sparkles, PlayCircle, Timer, Repeat, Loader2, Plus, ChevronRight, ImageIcon, Wand2, Flame, Target, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";



export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

interface Exercise {
  name: string; sets: number; reps: string; rest_seconds?: number;
  tempo?: string; cues?: string; video_query?: string; image_query?: string;
}
interface StretchingExercise {
  name: string; duration: string; cues?: string; video_query?: string; image_query?: string;
}
interface Day {
  day: string; focus?: string; warmup?: string; cooldown?: string; exercises: Exercise[];
}

function Dashboard() {
  const navigate = useNavigate();
  const getPlan = useServerFn(getActivePlan);
  const { data, isLoading } = useQuery({ queryKey: ["active-plan"], queryFn: () => getPlan() });
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!data?.plan) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center animate-fade-up">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="font-display text-4xl">Vamos criar sua planilha</h1>
        <p className="mt-3 text-muted-foreground">Responda algumas perguntas rápidas e a IA monta um treino sob medida.</p>
        <button
          onClick={() => navigate({ to: "/onboarding" })}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground"
        >
          Começar agora <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const plan = data.plan.plan as unknown as { 
    days: Day[]; summary?: string; split?: string; nutrition_tips?: string[]; safety_notes?: string;
    stretching_routine?: StretchingExercise[];
  };
  const isStretching = selectedIdx === -1;
  const day = !isStretching ? plan.days?.[selectedIdx] : null;

  return (
    <div className="animate-fade-up">
      <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-gold">
            <Flame className="h-3 w-3" /> Planilha ativa
          </div>
          <h1 className="mt-2 truncate font-display text-2xl sm:text-4xl">{data.plan.title}</h1>
          {plan.summary && <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{plan.summary}</p>}
          {plan.split && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" /> Divisão: {plan.split}
            </div>
          )}
        </div>
        <Link to="/onboarding" className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground sm:px-4 sm:py-2 sm:text-xs">
          Nova planilha
        </Link>
      </div>

      <div className="mb-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex gap-2 sm:flex-wrap">
          {plan.days?.map((d, i) => (
            <button key={i} onClick={() => setSelectedIdx(i)}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-all ${
                i === selectedIdx
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "border border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}>
              {d.day}
            </button>
          ))}
          {plan.stretching_routine && plan.stretching_routine.length > 0 && (
            <button onClick={() => setSelectedIdx(-1)}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-all ${
                isStretching
                  ? "bg-gold text-gold-foreground shadow-gold"
                  : "border border-gold/40 bg-gold/5 text-gold hover:border-gold hover:bg-gold/10"
              }`}>
              Mobilidade e Alongamento
            </button>
          )}
        </div>
      </div>

      {day && <DayView day={day} planId={data.plan.id} />}
      {isStretching && plan.stretching_routine && <StretchingView routine={plan.stretching_routine} />}

      <RefinePanel />

      {plan.safety_notes && (
        <div className="mt-10 rounded-xl border border-gold/40 bg-gold/5 p-5 text-sm">
          <div className="mb-1 text-xs uppercase tracking-widest text-gold">Atenção</div>
          {plan.safety_notes}
        </div>
      )}
      {plan.nutrition_tips?.length ? (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Dicas de nutrição</div>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {plan.nutrition_tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function RefinePanel() {
  const refine = useServerFn(refinePlan);
  const qc = useQueryClient();
  const [request, setRequest] = useState("");
  const [focused, setFocused] = useState(false);
  const mut = useMutation({
    mutationFn: () => refine({ data: { request } }),
    onSuccess: () => {
      toast.success("Planilha atualizada!");
      setRequest("");
      qc.invalidateQueries({ queryKey: ["active-plan"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao ajustar"),
  });

  const suggestions = [
    "Adicione um dia focado em glúteos",
    "Trocar supino por flexão",
    "Mais exercícios de core",
    "Reduzir tempo de descanso",
  ];

  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-card to-card p-5 sm:p-6 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-gold-foreground">
          <Wand2 className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">Peça um ajuste à IA</div>
          <div className="text-xs text-muted-foreground">Adicione exercícios, mude o foco, altere volume — a planilha é atualizada.</div>
        </div>
      </div>
      <div className={`flex flex-col gap-2 rounded-xl border bg-background p-2 transition-all sm:flex-row sm:items-end ${focused ? "border-gold ring-2 ring-gold/20" : "border-border"}`}>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={2}
          placeholder="Ex: quero um dia extra de cardio ou trocar agachamento por leg press..."
          className="min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || request.trim().length < 3}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {mut.isPending ? "Ajustando..." : "Enviar"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => setRequest((r) => (r ? `${r}. ${s}` : s))}
            className="rounded-full border border-border bg-background/50 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}



function DayView({ day, planId }: { day: Day; planId: string }) {
  return (
    <div className="space-y-6">
      {day.warmup && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Aquecimento</div>
          <div className="mt-1 text-sm">{day.warmup}</div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {day.exercises?.map((ex, i) => <ExerciseCard key={i} ex={ex} dayKey={day.day} planId={planId} />)}
      </div>
      {day.cooldown && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Volta à calma</div>
          <div className="mt-1 text-sm">{day.cooldown}</div>
        </div>
      )}
    </div>
  );
}

function StretchingView({ routine }: { routine: StretchingExercise[] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gold/40 bg-gold/5 p-4 text-sm text-muted-foreground">
        <strong className="text-gold">Sua rotina de mobilidade.</strong> Recomendamos realizar antes ou após os treinos, ou em um dia de descanso para otimizar sua recuperação.
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {routine.map((ex, i) => (
          <StretchingCard key={i} ex={ex} />
        ))}
      </div>
    </div>
  );
}

function StretchingCard({ ex }: { ex: StretchingExercise }) {
  const [open, setOpen] = useState(false);
  const resolve = useServerFn(resolveExerciseVideo);
  const query = ex.video_query ?? `${ex.name} alongamento mobilidade`;

  const { data: media, isLoading: mediaLoading } = useQuery({
    queryKey: ["exercise-media", query],
    queryFn: () => resolve({ data: { query } }),
    enabled: open,
    staleTime: 1000 * 60 * 60 * 6,
  });

  const videoId = media?.videoId ?? null;
  const videoUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gold/40 bg-card shadow-soft transition-all hover:border-gold/80">
      <div className="flex flex-col p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight text-gold">{ex.name}</h3>
          <button
            onClick={() => setOpen(!open)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold hover:bg-gold hover:text-gold-foreground transition-colors"
          >
            <PlayCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-gold/10 px-2 py-1 text-xs font-medium text-gold w-fit">
          <Timer className="h-3.5 w-3.5" /> {ex.duration}
        </div>
        {ex.cues && <p className="text-xs text-muted-foreground">{ex.cues}</p>}
      </div>

      {open && (
        <div className="border-t border-gold/20 bg-background/30 p-4 pt-4 animate-fade-up">
          <div className="aspect-video overflow-hidden rounded-lg bg-black relative shadow-inner">
            {mediaLoading && (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
              </div>
            )}
            {!mediaLoading && videoId && (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
                title={ex.name}
              />
            )}
            {!mediaLoading && !videoId && (
              <a href={videoUrl} target="_blank" rel="noreferrer" className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-gold hover:text-gold/80">
                <PlayCircle className="h-10 w-10" /> Ver no YouTube
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ ex, dayKey, planId }: { ex: Exercise; dayKey: string; planId: string }) {
  const [open, setOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const resolve = useServerFn(resolveExerciseVideo);
  const query = ex.video_query ?? `${ex.name} execução musculação`;
  const imgQuery = ex.image_query ?? ex.name;

  const { data: media, isLoading: mediaLoading } = useQuery({
    queryKey: ["exercise-media", query],
    queryFn: () => resolve({ data: { query } }),
    enabled: open,
    staleTime: 1000 * 60 * 60 * 6,
  });

  const videoId = media?.videoId ?? null;
  const videoUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const thumbnailUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all hover:border-border/80">
      <div className="flex flex-col p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight text-foreground">{ex.name}</h3>
          <button
            onClick={() => setOpen(!open)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground hover:bg-gold hover:text-gold-foreground transition-colors"
            title="Ver Mídia e Detalhes"
          >
            <PlayCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mt-auto grid grid-cols-2 gap-2 text-center text-sm">
          <div className="flex flex-col rounded-lg border border-border bg-background/50 p-2">
            <span className="font-semibold text-foreground">{ex.sets}x {ex.reps}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Séries</span>
          </div>
          <div className="flex flex-col rounded-lg border border-border bg-background/50 p-2">
            <span className="font-semibold text-foreground">{ex.rest_seconds ?? "60"}s</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Descanso</span>
          </div>
        </div>
        {ex.cues && (
          <p className="mt-4 border-t border-border/50 pt-3 text-xs text-muted-foreground">
            {ex.cues}
          </p>
        )}
      </div>

      {open && (
        <div className="border-t border-border bg-background/30 p-4 pt-4 animate-fade-up">
          <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-black relative shadow-inner">
            {mediaLoading && (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!mediaLoading && videoId && (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
                title={ex.name}
              />
            )}
            {!mediaLoading && !videoId && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <PlayCircle className="h-10 w-10" />
                Abrir no YouTube
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLog(!showLog)} className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Registrar
            </button>
          </div>
          {showLog && <QuickLog dayKey={dayKey} planId={planId} exerciseName={ex.name} onDone={() => setShowLog(false)} />}
        </div>
      )}
    </div>
  );
}


function QuickLog({ dayKey, planId, exerciseName, onDone }: { dayKey: string; planId: string; exerciseName: string; onDone: () => void }) {
  const log = useServerFn(logExercise);
  const qc = useQueryClient();
  const [weight, setWeight] = useState<number | "">("");
  const [reps, setReps] = useState<number | "">("");
  const [sets, setSets] = useState<number | "">("");
  const mut = useMutation({
    mutationFn: () => log({ data: {
      exercise_name: exerciseName, day_key: dayKey,
      weight_kg: weight === "" ? null : Number(weight),
      reps: reps === "" ? null : Number(reps),
      sets: sets === "" ? null : Number(sets),
    }}),
    onSuccess: () => { toast.success("Registrado!"); qc.invalidateQueries({ queryKey: ["logs"] }); onDone(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  void planId;
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      <input type="number" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : +e.target.value)} className="rounded border border-input bg-background px-2 py-1.5 text-sm" />
      <input type="number" placeholder="reps" value={reps} onChange={(e) => setReps(e.target.value === "" ? "" : +e.target.value)} className="rounded border border-input bg-background px-2 py-1.5 text-sm" />
      <input type="number" placeholder="séries" value={sets} onChange={(e) => setSets(e.target.value === "" ? "" : +e.target.value)} className="rounded border border-input bg-background px-2 py-1.5 text-sm" />
      <button onClick={() => mut.mutate()} disabled={mut.isPending} className="rounded bg-gold px-2 py-1.5 text-sm text-gold-foreground disabled:opacity-50">Salvar</button>
    </div>
  );
}
