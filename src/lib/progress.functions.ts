import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const createMediaUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      filename: z.string().min(1).max(200),
      contentType: z.string().min(1).max(120),
      category: z.enum(["progresso", "execucao"]),
      mediaType: z.enum(["image", "video"]),
      caption: z.string().max(300).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ext = data.filename.split(".").pop() || "bin";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { data: signed, error } = await supabase.storage
      .from("progress-media")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const registerMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      path: z.string(),
      mediaType: z.enum(["image", "video"]),
      category: z.enum(["progresso", "execucao"]),
      caption: z.string().max(300).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("progress_media").insert({
      user_id: context.userId,
      storage_path: data.path,
      media_type: data.mediaType,
      category: data.category,
      caption: data.caption ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMediaWithUrls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("progress_media").select("*")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(60);
    if (error) throw new Error(error.message);
    const withUrls = await Promise.all(
      (data ?? []).map(async (m) => {
        const { data: sig } = await supabase.storage
          .from("progress-media").createSignedUrl(m.storage_path, 3600);
        return { ...m, url: sig?.signedUrl ?? null };
      }),
    );
    return withUrls;
  });

export const logExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      exercise_name: z.string().min(1).max(120),
      weight_kg: z.number().min(0).max(1000).optional().nullable(),
      reps: z.number().int().min(1).max(200).optional().nullable(),
      sets: z.number().int().min(1).max(20).optional().nullable(),
      notes: z.string().max(300).optional().nullable(),
      day_key: z.string().max(80).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("exercise_logs").insert({
      ...data, user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listExerciseLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exercise_logs").select("*")
      .eq("user_id", context.userId).order("performed_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addMeasurement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      weight_kg: z.number().min(0).max(500).optional().nullable(),
      body_fat_pct: z.number().min(0).max(80).optional().nullable(),
      chest_cm: z.number().min(0).max(300).optional().nullable(),
      waist_cm: z.number().min(0).max(300).optional().nullable(),
      hip_cm: z.number().min(0).max(300).optional().nullable(),
      arm_cm: z.number().min(0).max(150).optional().nullable(),
      thigh_cm: z.number().min(0).max(200).optional().nullable(),
      notes: z.string().max(300).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("body_measurements").insert({
      ...data, user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMeasurements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("body_measurements").select("*")
      .eq("user_id", context.userId).order("measured_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
