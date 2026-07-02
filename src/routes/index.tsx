import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Printer,
  CheckCircle2,
  Rocket,
  TrendingUp,
  BarChart3,
  Package,
  Users,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UprintMe — Gestão para gráficas rápidas" },
      {
        name: "description",
        content:
          "Controle pedidos, clientes, financeiro e loja virtual da sua gráfica em um só lugar.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <HeroSplit />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border/60 bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <Printer className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">UprintMe</span>
        </Link>
        <Link to="/auth">
          <Button size="sm" variant="ghost">Acessar sistema</Button>
        </Link>
      </div>
    </header>
  );
}

const highlights = [
  { icon: CheckCircle2, title: "Simples", desc: "Fácil de entender e usar" },
  { icon: Rocket, title: "Completo", desc: "Tudo que você precisa em um só lugar" },
  { icon: TrendingUp, title: "Eficiente", desc: "Mais controle, mais tempo para produzir" },
  { icon: BarChart3, title: "Mais vendas", desc: "Acompanhe resultados em tempo real" },
  { icon: Package, title: "Pedidos sob controle", desc: "Do orçamento à entrega, sem planilhas" },
  { icon: Users, title: "Gestão completa", desc: "Centralize processos e toda sua operação" },
];

function HeroSplit() {
  return (
    <section
      className="relative"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:px-8 lg:py-24">
        {/* Left: pitch + features */}
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Controle sua gráfica,{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              pedidos e crescimento
            </span>{" "}
            em um só lugar.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Sistema completo e inteligente para você produzir mais, organizar
            seu negócio e tomar decisões com confiança.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {highlights.map((h) => (
              <div key={h.title} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <h.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-semibold">{h.title}</div>
                <div className="mt-1 text-xs leading-snug text-muted-foreground">
                  {h.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: auth card */}
        <div className="lg:pl-4">
          <AuthCard />
        </div>
      </div>
    </section>
  );
}

function AuthCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)] sm:p-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight">UprintMe</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesse o painel da sua gráfica
        </p>
      </div>

      <Tabs defaultValue="signin">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Entrar</TabsTrigger>
          <TabsTrigger value="signup">Criar conta</TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="mt-6">
          <QuickSignIn />
        </TabsContent>
        <TabsContent value="signup" className="mt-6">
          <QuickSignUpCta />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuickSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="home-email">E-mail</Label>
        <Input
          id="home-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="home-password">Senha</Label>
        <Input
          id="home-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Entrar
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={loading}
        onClick={handleGoogle}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        Continuar com Google
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/auth" search={{ mode: "signin" }} className="hover:text-foreground">
          Esqueceu a senha?
        </Link>
      </p>
    </form>
  );
}

function QuickSignUpCta() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        Cadastre sua gráfica em menos de um minuto. Sem cartão de crédito.
      </p>
      <Link to="/auth" search={{ mode: "signup" }} className="block">
        <Button className="w-full">Criar conta grátis</Button>
      </Link>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-foreground">Termos de Uso</a>
          <a href="#" className="hover:text-foreground">Privacidade</a>
          <a href="#" className="hover:text-foreground">Suporte</a>
        </div>
        <p>© {new Date().getFullYear()} UprintMe. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
