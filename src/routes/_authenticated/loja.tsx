import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Store, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/loja")({
  component: LojaPage,
});

type Company = {
  id: string;
  name: string;
  slug: string | null;
};

const db = supabase as unknown as { from: (t: string) => any };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

function LojaPage() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const { data: company, isLoading } = useQuery<Company | null>({
    queryKey: ["company"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data: prof } = await db
        .from("profiles")
        .select("company_id")
        .eq("id", userRes.user?.id)
        .maybeSingle();
      if (!prof?.company_id) return null;
      const { data, error } = await db
        .from("companies")
        .select("id, name, slug")
        .eq("id", prof.company_id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Company | null;
    },
  });

  useEffect(() => {
    if (company) {
      setName(company.name ?? "");
      setSlug(company.slug ?? slugify(company.name ?? ""));
    }
  }, [company]);

  const publicUrl =
    typeof window !== "undefined" && slug
      ? `${window.location.origin}/l/${slug}`
      : "";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!name.trim()) return toast.error("Informe o nome da loja");
    if (!slug.trim()) return toast.error("Informe o endereço público");
    setSaving(true);
    const { error } = await db
      .from("companies")
      .update({ name: name.trim(), slug: slugify(slug) })
      .eq("id", company.id);
    setSaving(false);
    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique"))
        return toast.error("Este endereço já está em uso, escolha outro.");
      return toast.error(error.message);
    }
    toast.success("Loja atualizada");
    qc.invalidateQueries({ queryKey: ["company"] });
  };

  const copyUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loja virtual</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure a vitrine pública onde seus clientes fazem pedidos online.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Store className="h-6 w-6" />
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <form
            onSubmit={save}
            className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <h2 className="text-lg font-semibold">Identidade</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Como sua loja aparece para os clientes.
            </p>
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="l-name">Nome da loja</Label>
                <Input
                  id="l-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-slug">Endereço público</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {typeof window !== "undefined" ? window.location.origin : ""}/l/
                  </span>
                  <Input
                    id="l-slug"
                    required
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="sua-grafica"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas letras minúsculas, números e hífen.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>

          {slug && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Sua vitrine</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Compartilhe este link para receber pedidos.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                <span className="flex-1 truncate font-mono text-xs">{publicUrl}</span>
                <Button size="sm" variant="ghost" onClick={copyUrl} className="gap-1.5">
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </>
                  )}
                </Button>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </Button>
                </a>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6">
            <h2 className="text-base font-semibold">Catálogo de produtos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Em breve: cadastre produtos, preços, fotos e receba pedidos direto pela vitrine.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
