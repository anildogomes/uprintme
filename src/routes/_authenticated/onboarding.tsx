import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

function maskCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskCNPJ(v: string) {
  return v.replace(/\D/g, "").slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState<"pf" | "pj">("pf");
  const [fullName, setFullName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");

  const submit = useServerFn(completeOnboarding);
  type Payload = {
    doc_type: "pf" | "pj";
    full_name: string;
    doc_number: string;
    legal_name: string | null;
    trade_name: string;
  };
  const mutation = useMutation({
    mutationFn: (payload: Payload) => submit({ data: payload }),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Empresa criada com sucesso!");
      navigate({ to: "/pedidos", replace: true });
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao criar empresa"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = docNumber.replace(/\D/g, "");
    if (docType === "pf" && digits.length !== 11) return toast.error("CPF inválido");
    if (docType === "pj" && digits.length !== 14) return toast.error("CNPJ inválido");
    if (!fullName.trim()) return toast.error("Informe o nome completo");
    if (!tradeName.trim()) return toast.error("Informe o nome fantasia");
    if (docType === "pj" && !legalName.trim()) return toast.error("Informe a razão social");
    mutation.mutate({
      doc_type: docType,
      full_name: fullName.trim(),
      doc_number: digits,
      legal_name: docType === "pj" ? legalName.trim() : null,
      trade_name: tradeName.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-secondary/40">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Vamos começar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Conte um pouco sobre o seu negócio</p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 w-full space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label>Tipo de pessoa</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["pf", "pj"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDocType(t)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    docType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-background text-foreground hover:bg-accent",
                  )}
                >
                  {t === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ob-name">
              {docType === "pf" ? "Nome completo" : "Nome completo do sócio/proprietário"}
            </Label>
            <Input
              id="ob-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ob-doc">{docType === "pf" ? "CPF" : "CNPJ"}</Label>
            <Input
              id="ob-doc"
              value={docNumber}
              onChange={(e) =>
                setDocNumber(docType === "pf" ? maskCPF(e.target.value) : maskCNPJ(e.target.value))
              }
              placeholder={docType === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
              inputMode="numeric"
              required
            />
          </div>

          {docType === "pj" && (
            <div className="space-y-2">
              <Label htmlFor="ob-legal">Razão social</Label>
              <Input
                id="ob-legal"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ob-trade">Nome fantasia</Label>
            <Input
              id="ob-trade"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              placeholder="Ex: Auto Peças do João"
              required
            />
          </div>

          {mutation.isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Não foi possível concluir o cadastro.</p>
              <p className="mt-1 text-xs">
                {mutation.error instanceof Error ? mutation.error.message : "Erro desconhecido."}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Verifique os dados e tente novamente. Se o erro persistir, contate o suporte.
              </p>
            </div>
          )}

          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mutation.isError ? "Tentar novamente" : "Criar minha empresa"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Você poderá ajustar todos os detalhes depois.
          </p>
        </form>
      </div>
    </div>
  );
}
