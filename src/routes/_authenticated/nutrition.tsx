import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNutritionLogs, logNutrition } from "@/lib/nutrition.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Apple, Loader2, Plus, Utensils } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nutrition")({
  component: NutritionPage,
});

function NutritionPage() {
  const getLogs = useServerFn(getNutritionLogs);
  const { data: logs, isLoading } = useQuery({ queryKey: ["nutrition-logs"], queryFn: () => getLogs() });
  
  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 text-gold">
          <Utensils className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl">Nutrição</h1>
          <p className="text-muted-foreground text-sm">Registre suas calorias e acompanhe seus macros diários.</p>
        </div>
      </div>

      <NutritionLogger />

      <div className="mt-10 space-y-4">
        <h2 className="font-display text-xl mb-4">Histórico Recente</h2>
        {logs?.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhum registro encontrado. Comece a anotar sua alimentação!
          </div>
        )}
        {logs?.map((log: any) => (
          <div key={log.id} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm text-muted-foreground">{new Date(log.date).toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="rounded-lg bg-background p-3">
                <div className="text-2xl font-display text-gold">{log.calories || 0}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Calorias</div>
              </div>
              <div className="rounded-lg bg-background p-3">
                <div className="text-xl font-display">{log.protein || 0}g</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Proteína</div>
              </div>
              <div className="rounded-lg bg-background p-3">
                <div className="text-xl font-display">{log.carbs || 0}g</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Carbo</div>
              </div>
              <div className="rounded-lg bg-background p-3">
                <div className="text-xl font-display">{log.fat || 0}g</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Gordura</div>
              </div>
            </div>
            {log.notes && (
              <p className="mt-4 text-sm text-muted-foreground border-t border-border pt-3">
                <span className="font-medium">Notas:</span> {log.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NutritionLogger() {
  const qc = useQueryClient();
  const logFn = useServerFn(logNutrition);
  
  const [calories, setCalories] = useState<string>("");
  const [protein, setProtein] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [fat, setFat] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const mut = useMutation({
    mutationFn: () => logFn({ data: {
      calories: calories ? Number(calories) : null,
      protein: protein ? Number(protein) : null,
      carbs: carbs ? Number(carbs) : null,
      fat: fat ? Number(fat) : null,
      notes: notes || undefined
    }}),
    onSuccess: () => {
      toast.success("Registro adicionado com sucesso!");
      setCalories(""); setProtein(""); setCarbs(""); setFat(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["nutrition-logs"] });
    },
    onError: (e) => toast.error(e.message)
  });

  return (
    <div className="rounded-2xl border border-gold/40 bg-card p-6 shadow-soft relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Apple className="w-32 h-32" />
      </div>
      <h3 className="font-display text-lg mb-4">Novo Registro</h3>
      
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Calorias (kcal)</label>
          <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-gold outline-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Proteína (g)</label>
          <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-gold outline-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Carbo (g)</label>
          <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-gold outline-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Gordura (g)</label>
          <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-gold outline-none" />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-1 block">Anotações (Refeição, Sentimento, etc)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-gold outline-none" />
      </div>

      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending || (!calories && !protein && !carbs && !fat && !notes)}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-gold-foreground transition-all hover:brightness-110 disabled:opacity-50"
      >
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Salvar Refeição
      </button>
    </div>
  );
}
