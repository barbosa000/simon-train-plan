import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMediaWithUrls, createMediaUploadUrl, registerMedia,
  listExerciseLogs, listMeasurements, addMeasurement,
} from "@/lib/progress.functions";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Ruler, Dumbbell, Loader2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/progress")({ component: Progress });

type Tab = "fotos" | "medidas" | "cargas";

function Progress() {
  const [tab, setTab] = useState<Tab>("fotos");
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-4xl">Sua evolução</h1>
      <p className="mt-2 text-muted-foreground">Registre fotos, medidas e cargas para ver seu progresso.</p>
      <div className="my-6 flex gap-2 border-b border-border">
        {([
          { v: "fotos", label: "Fotos & vídeos", icon: Camera },
          { v: "medidas", label: "Medidas", icon: Ruler },
          { v: "cargas", label: "Cargas", icon: Dumbbell },
        ] as const).map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors ${
              tab === t.v ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === "fotos" && <MediaTab />}
      {tab === "medidas" && <MeasureTab />}
      {tab === "cargas" && <LogsTab />}
    </div>
  );
}

function MediaTab() {
  const qc = useQueryClient();
  const list = useServerFn(listMediaWithUrls);
  const createUrl = useServerFn(createMediaUploadUrl);
  const register = useServerFn(registerMedia);
  const { data, isLoading } = useQuery({ queryKey: ["media"], queryFn: () => list() });
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<"progresso" | "execucao">("progresso");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const { path, token } = await createUrl({ data: {
        filename: file.name, contentType: file.type, category, mediaType,
      }});
      const { error } = await supabase.storage.from("progress-media").uploadToSignedUrl(path, token, file);
      if (error) throw error;
      await register({ data: { path, mediaType, category, caption: null }});
      toast.success("Enviado!");
      qc.invalidateQueries({ queryKey: ["media"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="progresso">Foto de progresso</option>
          <option value="execucao">Vídeo/foto do treino</option>
        </select>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-50">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Enviar mídia
        </button>
      </div>
      {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {data?.length ? data.map((m) => (
            <div key={m.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              {m.media_type === "video"
                ? <video src={m.url ?? undefined} controls className="h-full w-full object-cover" />
                : <img src={m.url ?? undefined} alt="" className="h-full w-full object-cover" />}
              <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                {new Date(m.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
          )) : <p className="col-span-full py-16 text-center text-sm text-muted-foreground">Nenhuma mídia ainda.</p>}
        </div>
      )}
    </div>
  );
}

function MeasureTab() {
  const qc = useQueryClient();
  const list = useServerFn(listMeasurements);
  const add = useServerFn(addMeasurement);
  const { data } = useQuery({ queryKey: ["measurements"], queryFn: () => list() });
  const [form, setForm] = useState({ weight_kg: "", body_fat_pct: "", waist_cm: "", chest_cm: "", arm_cm: "", thigh_cm: "", hip_cm: "" });
  const mut = useMutation({
    mutationFn: () => add({ data: Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : Number(v)])
    ) as any }),
    onSuccess: () => { toast.success("Medida registrada"); setForm({ weight_kg: "", body_fat_pct: "", waist_cm: "", chest_cm: "", arm_cm: "", thigh_cm: "", hip_cm: "" }); qc.invalidateQueries({ queryKey: ["measurements"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const fields: [keyof typeof form, string][] = [
    ["weight_kg", "Peso (kg)"], ["body_fat_pct", "% gordura"], ["waist_cm", "Cintura (cm)"],
    ["chest_cm", "Peito (cm)"], ["arm_cm", "Braço (cm)"], ["thigh_cm", "Coxa (cm)"], ["hip_cm", "Quadril (cm)"],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-xl">Nova medida</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {fields.map(([k, l]) => (
            <label key={k} className="text-xs">
              <div className="mb-1 text-muted-foreground">{l}</div>
              <input type="number" step="0.1" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm" />
            </label>
          ))}
        </div>
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="mt-4 w-full rounded-lg bg-primary py-2 text-sm text-primary-foreground disabled:opacity-50">
          Salvar
        </button>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-xl">Histórico</h3>
        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {data?.length ? [...data].reverse().map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <span className="text-muted-foreground">{new Date(m.measured_at).toLocaleDateString("pt-BR")}</span>
              <span>{m.weight_kg ? `${m.weight_kg}kg` : "—"} · {m.waist_cm ? `cintura ${m.waist_cm}cm` : ""}</span>
            </div>
          )) : <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma medida ainda.</p>}
        </div>
      </div>
    </div>
  );
}

function LogsTab() {
  const list = useServerFn(listExerciseLogs);
  const { data } = useQuery({ queryKey: ["logs"], queryFn: () => list() });
  return (
    <div className="rounded-xl border border-border bg-card">
      {data?.length ? (
        <div className="divide-y divide-border">
          {data.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div>
                <div className="font-medium">{l.exercise_name}</div>
                <div className="text-xs text-muted-foreground">{new Date(l.performed_at).toLocaleString("pt-BR")}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {l.sets ?? "?"} × {l.reps ?? "?"} @ {l.weight_kg ?? "?"}kg
              </div>
            </div>
          ))}
        </div>
      ) : <p className="py-16 text-center text-sm text-muted-foreground">Registre cargas na tela de Treino para ver seu histórico aqui.</p>}
    </div>
  );
}
