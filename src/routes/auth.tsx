import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Printer, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "reset"]).optional(),
  invite: z.string().uuid().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Entrar — UprintMe" },
      { name: "description", content: "Acesse sua conta UprintMe ou crie uma nova gráfica em 30 segundos." },
    ],
  }),
  component: AuthPage,
});

type Invite = { id: string; email: string; role: string; company_id: string; companies?: { name: string } | null };

function AuthPage() {
  const { mode, invite } = Route.useSearch();
  const navigate = useNavigate();
  const [inviteData, setInviteData] = useState<Invite | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (!invite) return;
    (supabase as unknown as { from: (t: string) => any })
      .from("invitations")
      .select("id, email, role, company_id, companies(name)")
      .eq("token", invite)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()
      .then(({ data, error }: { data: Invite | null; error: { message: string } | null }) => {
        if (error || !data) {
          setInviteError("Convite inválido, já utilizado ou expirado.");
          return;
        }
        setInviteData(data);
      });
  }, [invite]);

  const initialTab = invite || mode === "signup" ? "signup" : "signin";

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <Printer className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">UprintMe</span>
        </Link>

        {invite && inviteData && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
            <MailCheck className="mt-0.5 h-4 w-4 flex-none text-primary" />
            <div>
              Você foi convidado para <strong>{inviteData.companies?.name ?? "uma empresa"}</strong> como{" "}
              <strong>{inviteData.role}</strong>. Crie sua conta para aceitar.
            </div>
          </div>
        )}
        {invite && inviteError && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {inviteError}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)] sm:p-8">
          <Tabs defaultValue={initialTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignUpForm invite={inviteData} inviteToken={invite ?? null} />
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Voltar para a home</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleButton({ loading }: { loading: boolean }) {
  const [busy, setBusy] = useState(false);
  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      onClick={handleGoogle}
      disabled={loading || busy}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
      )}
      Continuar com Google
    </Button>
  );
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">ou</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

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

  const handleReset = async () => {
    if (!email) {
      toast.error("Informe seu email primeiro.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Enviamos um link de recuperação para seu email.");
  };

  if (showReset) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Recuperar senha</h3>
          <p className="text-xs text-muted-foreground">Enviaremos um link para seu email.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button onClick={handleReset} disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar link
        </Button>
        <button type="button" onClick={() => setShowReset(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">
          ← Voltar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <GoogleButton loading={loading} />
      <Divider />
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input id="signin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Senha</Label>
          <button type="button" onClick={() => setShowReset(true)} className="text-xs text-primary hover:underline">
            Esqueceu?
          </button>
        </div>
        <Input id="signin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

function SignUpForm({ invite, inviteToken }: { invite: Invite | null; inviteToken: string | null }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: invite?.email ?? "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (invite?.email) setForm((f) => ({ ...f, email: invite.email }));
  }, [invite?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const meta: Record<string, string> = { full_name: form.full_name };
    if (invite && inviteToken) meta.invitation_token = inviteToken;

    const redirectTo = invite ? "/pedidos" : "/onboarding";
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}${redirectTo}`,
        data: meta,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      invite ? "Conta criada! Você já faz parte da empresa." : "Conta criada! Vamos configurar sua empresa.",
    );
    navigate({ to: redirectTo, replace: true });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <GoogleButton loading={loading} />
      <Divider />
      <div className="space-y-2">
        <Label htmlFor="su-name">Seu nome</Label>
        <Input id="su-name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input
          id="su-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          disabled={!!invite}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">Senha</Label>
        <Input id="su-password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {invite ? "Aceitar convite e entrar" : "Criar conta grátis"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Ao criar sua conta você concorda com nossos termos de uso.
      </p>
    </form>
  );
}
