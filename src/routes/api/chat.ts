import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGateway } from "@/lib/ai-gateway.server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

const SYSTEM = `Você é o Coach IA do SimonMuscle. Especialista em musculação, hipertrofia, força, emagrecimento, biomecânica, nutrição esportiva e periodização.

Regras:
- Responda sempre em português brasileiro, direto e prático.
- Seja específico com séries, repetições, cargas relativas (% 1RM), tempo de descanso e RPE.
- Sugira progressões e regressões conforme necessário.
- Use markdown (títulos curtos, listas) quando ajudar a leitura.
- Se o aluno relatar dor ou lesão, oriente a procurar um profissional presencial.
- Nunca prescreva medicamentos ou suplementos com dosagem clínica.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, threadId } = (await request.json()) as { messages: UIMessage[]; threadId: string };
        if (!Array.isArray(messages) || !threadId) return new Response("Bad request", { status: 400 });

        const auth = request.headers.get("authorization");
        const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        // Verify thread ownership
        const { data: thread } = await supabase.from("chat_threads").select("id, title")
          .eq("id", threadId).eq("user_id", userId).maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        // Persist last user message (the incoming array contains the whole history)
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          await supabase.from("chat_messages").insert({
            thread_id: threadId, user_id: userId, role: "user", parts: lastUser.parts as any,
          });
          // set title from first user message if still default
          if (thread.title === "Nova conversa") {
            const txt = lastUser.parts.map((p: any) => p.type === "text" ? p.text : "").join("").slice(0, 60);
            if (txt) await supabase.from("chat_threads").update({ title: txt }).eq("id", threadId);
          }
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const gateway = createLovableAiGateway(key);
        const model = gateway("google/gemini-2.5-flash");

        const result = streamText({
          model,
          system: SYSTEM,
          messages: convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            const assistant = finalMessages.at(-1);
            if (assistant && assistant.role === "assistant") {
              await supabase.from("chat_messages").insert({
                thread_id: threadId, user_id: userId, role: "assistant", parts: assistant.parts as any,
              });
              await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
            }
          },
        });
      },
    },
  },
});
