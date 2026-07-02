import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Package,
  Wallet,
  Users,
  Store,
  BarChart3,
  Check,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <Printer className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">UprintMe</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#recursos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Recursos</a>
          <a href="#planos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Planos</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="sm" className="shadow-[var(--shadow-soft)]">Criar conta</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "var(--gradient-soft)" }}
      />
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Feito para gráficas rápidas
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Gerencie sua gráfica sem{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              planilhas
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Pedidos, arte do cliente, financeiro, comissão de atendentes e loja virtual —
            tudo em uma única plataforma clean e simples de usar.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="gap-2 shadow-[var(--shadow-elegant)]">
                Começar grátis <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#recursos">
              <Button size="lg" variant="outline">Ver recursos</Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sem cartão de crédito · Cadastro em 30 segundos
          </p>
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: Package, title: "Gestão de pedidos", desc: "Cartões, folders, panfletos, cartazes e brindes. Kanban por status." },
  { icon: Users, title: "Clientes centralizados", desc: "Cadastro completo, histórico e contato — tudo à mão." },
  { icon: Wallet, title: "Financeiro sem dor", desc: "Sinal, saldo, fluxo de caixa e relatórios por período." },
  { icon: BarChart3, title: "Comissão de atendentes", desc: "Percentual configurável e ranking automático." },
  { icon: Store, title: "Loja virtual inclusa", desc: "Página pública com catálogo e pedido online para seus clientes." },
  { icon: Printer, title: "Arte no lugar certo", desc: "Upload dos arquivos do cliente vinculado a cada pedido." },
];

function Features() {
  return (
    <section id="recursos" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tudo o que sua gráfica precisa</h2>
          <p className="mt-4 text-muted-foreground">
            Substitua Excel, WhatsApp e caderninho por um sistema pensado para o dia a dia da impressão.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const plans = [
  {
    name: "Starter",
    price: "R$ 79",
    period: "/mês",
    desc: "Para gráficas começando a organizar.",
    features: ["Até 100 pedidos/mês", "1 atendente", "Loja virtual básica", "Suporte por email"],
  },
  {
    name: "Profissional",
    price: "R$ 179",
    period: "/mês",
    desc: "Para operações em crescimento.",
    features: ["Pedidos ilimitados", "Até 5 atendentes", "Comissões automáticas", "Loja virtual completa", "Suporte prioritário"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    desc: "Múltiplas unidades, integrações.",
    features: ["Multi-unidade", "Atendentes ilimitados", "Relatórios avançados", "Onboarding dedicado"],
  },
];

function Pricing() {
  return (
    <section id="planos" className="border-t border-border/60 bg-secondary/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planos simples e transparentes</h2>
          <p className="mt-4 text-muted-foreground">Comece grátis. Escolha o plano quando fizer sentido.</p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border bg-card p-8 transition-all ${
                p.highlight
                  ? "border-primary shadow-[var(--shadow-elegant)] md:-translate-y-2"
                  : "border-border"
              }`}
            >
              {p.highlight && (
                <span className="mb-4 inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Mais popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth" search={{ mode: "signup" }} className="mt-8 block">
                <Button className="w-full" variant={p.highlight ? "default" : "outline"}>
                  Começar agora
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          className="overflow-hidden rounded-3xl px-8 py-16 text-center shadow-[var(--shadow-elegant)] sm:px-16"
          style={{ background: "var(--gradient-primary)" }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Pronto para organizar sua gráfica?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
            Cadastre-se em menos de um minuto. Sem cartão, sem enrolação.
          </p>
          <Link to="/auth" search={{ mode: "signup" }} className="mt-8 inline-block">
            <Button size="lg" variant="secondary" className="gap-2">
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Printer className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">UprintMe</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} UprintMe. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
