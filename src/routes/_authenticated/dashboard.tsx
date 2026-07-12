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

  const plan = data.plan.plan as unknown as { days: Day[]; summary?: string; split?: string; nutrition_tips?: string[]; safety_notes?: string };
  const day = plan.days?.[selectedIdx];

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Sua planilha ativa</div>
          <h1 className="mt-1 font-display text-4xl">{data.plan.title}</h1>
          {plan.summary && <p className="mt-2 max-w-2xl text-muted-foreground">{plan.summary}</p>}
        </div>
        <Link to="/onboarding" className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
          Gerar nova planilha
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {plan.days?.map((d, i) => (
          <button key={i} onClick={() => setSelectedIdx(i)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              i === selectedIdx ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}>
            {d.day}
          </button>
        ))}
      </div>

      {day && <DayView day={day} planId={data.plan.id} />}

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

function DayView({ day, planId }: { day: Day; planId: string }) {
  return (
    <div className="space-y-4">
      {day.warmup && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Aquecimento</div>
          <div className="mt-1 text-sm">{day.warmup}</div>
        </div>
      )}
      {day.exercises?.map((ex, i) => <ExerciseCard key={i} ex={ex} dayKey={day.day} planId={planId} />)}
      {day.cooldown && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Volta à calma</div>
          <div className="mt-1 text-sm">{day.cooldown}</div>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ ex, dayKey, planId }: { ex: Exercise; dayKey: string; planId: string }) {
  const [open, setOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
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
  const imagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(imgQuery)}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{ex.name}</div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" /> {ex.sets}x {ex.reps}</span>
            {ex.rest_seconds ? <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> {ex.rest_seconds}s</span> : null}
            {ex.tempo && <span>Tempo {ex.tempo}</span>}
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border p-5 pt-4 animate-fade-up">
          {ex.cues && <p className="mb-4 text-sm text-muted-foreground">{ex.cues}</p>}
          <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-black relative">
            {mediaLoading && (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!mediaLoading && videoId && showPlayer && (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
                title={ex.name}
              />
            )}
            {!mediaLoading && videoId && !showPlayer && thumbnailUrl && (
              <button
                onClick={() => setShowPlayer(true)}
                className="group relative block h-full w-full"
                aria-label={`Reproduzir vídeo de ${ex.name}`}
              >
                <img src={thumbnailUrl} alt={ex.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/50">
                  <PlayCircle className="h-16 w-16 text-white drop-shadow-lg" />
                </div>
              </button>
            )}
            {!mediaLoading && !videoId && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <PlayCircle className="h-10 w-10" />
                Vídeo indisponível — buscar no YouTube
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent">
              <PlayCircle className="h-3.5 w-3.5" /> Ver no YouTube
            </a>
            <a href={imagesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent">
              <ImageIcon className="h-3.5 w-3.5" /> Ver imagens
            </a>
            <button onClick={() => setShowLog(!showLog)} className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">
              <Plus className="h-3.5 w-3.5" /> Registrar carga
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
