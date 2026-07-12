import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listThreads, createThread, deleteThread, loadThreadMessages } from "@/lib/chat.functions";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Plus, Trash2, Send, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({ component: ChatPage });

function ChatPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const loadFn = useServerFn(loadThreadMessages);

  const threadsQ = useQuery({ queryKey: ["threads"], queryFn: () => listFn() });
  const msgsQ = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => loadFn({ data: { threadId } }),
  });

  const createMut = useMutation({
    mutationFn: () => createFn(),
    onSuccess: (t) => { qc.invalidateQueries({ queryKey: ["threads"] }); navigate({ to: "/chat/$threadId", params: { threadId: t.id } }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id }}),
    onSuccess: async () => {
      const remaining = (await qc.fetchQuery({ queryKey: ["threads"], queryFn: () => listFn() })) as any[];
      qc.invalidateQueries({ queryKey: ["threads"] });
      if (remaining.length) navigate({ to: "/chat/$threadId", params: { threadId: remaining[0].id }});
      else createMut.mutate();
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-xl border border-border bg-card p-3">
        <button onClick={() => createMut.mutate()} disabled={createMut.isPending}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          <Plus className="h-4 w-4" /> Nova conversa
        </button>
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {threadsQ.data?.map((t) => (
            <div key={t.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors ${
              t.id === threadId ? "bg-accent" : "hover:bg-accent/50"
            }`}>
              <Link to="/chat/$threadId" params={{ threadId: t.id }} className="min-w-0 flex-1 truncate">
                {t.title}
              </Link>
              <button onClick={() => deleteMut.mutate(t.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <ChatWindow
        key={threadId}
        threadId={threadId}
        initial={msgsQ.data as UIMessage[] | undefined}
        onFirstUserMessage={() => qc.invalidateQueries({ queryKey: ["threads"] })}
      />
    </div>
  );
}

function ChatWindow({ threadId, initial, onFirstUserMessage }: { threadId: string; initial?: UIMessage[]; onFirstUserMessage: () => void }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: async ({ messages }) => {
      const { data } = await supabase.auth.getSession();
      return {
        body: { messages, threadId },
        headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {},
      };
    },
  }), [threadId]);

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initial ?? [],
    transport,
    onError: (e) => toast.error(e.message || "Erro no chat"),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);
  useEffect(() => { inputRef.current?.focus(); }, [threadId, status]);

  const isLoading = status === "submitted" || status === "streaming";
  const empty = messages.length === 0;

  async function submit() {
    if (!input.trim() || isLoading) return;
    const first = empty;
    await sendMessage({ text: input.trim() });
    setInput("");
    if (first) onFirstUserMessage();
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl">Coach IA</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Tire dúvidas de execução, ajuste de carga, dieta e periodização. O Coach conhece treinamento resistido.
            </p>
          </div>
        ) : messages.map((m) => <Bubble key={m.id} message={m} />)}
        {isLoading && messages.at(-1)?.role === "user" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> pensando...
          </div>
        )}
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }}}
            rows={1} placeholder="Pergunte ao Coach..."
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={submit} disabled={isLoading || !input.trim()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  if (isUser) {
    return (
      <div className="mb-4 flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="mb-4">
      <div className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-p:my-2 prose-strong:text-foreground">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  );
}
