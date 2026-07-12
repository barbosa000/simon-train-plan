import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import hero from "@/assets/hero.jpg";
import { ArrowRight, Dumbbell, LineChart, MessagesSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/auth" className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Entrar</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground transition-transform hover:scale-[1.02]">
            Começar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-12 lg:grid-cols-2 lg:pt-24">
        <div className="animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-gold" /> Coach IA para musculação
          </div>
          <h1 className="text-balance font-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            Sua planilha,
            <br />
            <span className="italic text-gold">forjada em você.</span>
          </h1>
          <p className="mt-6 max-w-lg text-pretty text-lg text-muted-foreground">
            Peso, altura, objetivo, dias disponíveis. Em segundos, o SimonMuscle desenha o treino ideal — com vídeos, imagens e acompanhamento de cada progressão.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]">
              Criar meu treino <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="rounded-full border border-border px-6 py-3 text-sm hover:bg-accent">
              Já sou aluno
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-gradient-to-br from-gold/20 via-transparent to-transparent blur-2xl" />
          <div className="overflow-hidden rounded-3xl border border-border shadow-gold">
            <img src={hero} alt="Atleta em treino" width={1600} height={1200} className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 sm:grid-cols-3">
          {[
            { icon: Dumbbell, title: "Planilha por IA", desc: "Divisão, séries, repetições e cargas guiadas pelo seu objetivo e experiência." },
            { icon: LineChart, title: "Evolução visível", desc: "Registre cargas, medidas e fotos. Veja seu progresso mês a mês." },
            { icon: MessagesSquare, title: "Coach 24/7", desc: "Tire dúvidas de execução, dieta e ajustes em conversas com o Coach IA." },
          ].map((f) => (
            <div key={f.title} className="group">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-gold">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-2xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-muted-foreground">
          <Logo />
          <span>© {new Date().getFullYear()} SimonMuscle. Treine com intenção.</span>
        </div>
      </footer>
    </div>
  );
}
