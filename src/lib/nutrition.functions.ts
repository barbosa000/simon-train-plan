import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const getNutritionLogs = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: { session }, error: authErr } = await supabase.auth.getSession();
    if (authErr || !session) throw new Error("Unauthorized");

    const { data, error } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", session.user.id)
      .order("date", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  });

export const logNutrition = createServerFn({ method: "POST" })
  .validator((d: { calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null; notes?: string }) => d)
  .handler(async ({ data }) => {
    const { data: { session }, error: authErr } = await supabase.auth.getSession();
    if (authErr || !session) throw new Error("Unauthorized");

    const { error } = await supabase.from("nutrition_logs").insert({
      user_id: session.user.id,
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
