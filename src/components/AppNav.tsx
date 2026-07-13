import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

const nav = [
  { to: "/dashboard" as const, label: "Treino" },
  { to: "/progress" as const, label: "Evolução" },
  { to: "/chat" as const, label: "Coach IA" },
  { to: "/nutrition" as const, label: "Nutrição" },
];

export function AppNav() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/dashboard"><Logo /></Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </div>
      <div className="flex justify-center gap-1 border-t border-border/60 pb-2 pt-2 sm:hidden">
        {nav.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-full px-3 py-1 text-xs ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
