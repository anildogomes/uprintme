import { createFileRoute } from "@tanstack/react-router";
import { Package, Users, Wallet, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const stats = [
  { label: "Pedidos abertos", value: "0", icon: Package, hint: "em atendimento" },
  { label: "Clientes", value: "0", icon: Users, hint: "cadastrados" },
  { label: "A receber", value: "R$ 0", icon: Wallet, hint: "saldos pendentes" },
  { label: "Faturado no mês", value: "R$ 0", icon: TrendingUp, hint: "receita bruta" },
];

function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral da sua gráfica.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {s.label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
        <h2 className="text-lg font-semibold">Bem-vindo ao UprintMe!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Sua gráfica está pronta. Nas próximas fases vamos habilitar clientes, pedidos,
          financeiro, comissões e loja virtual.
        </p>
      </section>
    </div>
  );
}
