import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Store,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/loja")({
  component: LojaPage,
});

type Company = { id: string; name: string; slug: string | null };
type Product = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  active: boolean;
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

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
            Configure a vitrine pública e gerencie o catálogo de produtos.
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

          {company ? (
            <ProductsSection companyId={company.id} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
              Configure sua empresa para começar a cadastrar produtos.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductsSection({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products", companyId],
    queryFn: async () => {
      const { data, error } = await db
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setOpen(true);
  };

  const remove = async (p: Product) => {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    const { error } = await db.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Produto excluído");
    qc.invalidateQueries({ queryKey: ["products", companyId] });
  };

  const toggleActive = async (p: Product) => {
    const { error } = await db
      .from("products")
      .update({ active: !p.active })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["products", companyId] });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Catálogo de produtos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Produtos ativos aparecem na sua vitrine pública.
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum produto cadastrado ainda.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-4 py-3">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{p.name}</p>
                    {!p.active && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        inativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{brl(p.price_cents)}</p>
                </div>
                <Switch
                  checked={p.active}
                  onCheckedChange={() => toggleActive(p)}
                  aria-label="Ativo"
                />
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(p)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProductDialog
        open={open}
        onOpenChange={setOpen}
        companyId={companyId}
        product={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["products", companyId] })}
      />
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  companyId,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  product: Product | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setDescription(product?.description ?? "");
      setPrice(product ? (product.price_cents / 100).toFixed(2) : "");
      setImageUrl(product?.image_url ?? "");
      setActive(product?.active ?? true);
    }
  }, [open, product]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe o nome");
    const cents = Math.round(parseFloat(price.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0)
      return toast.error("Preço inválido");

    setSaving(true);
    const payload = {
      company_id: companyId,
      name: name.trim(),
      description: description.trim() || null,
      price_cents: cents,
      image_url: imageUrl.trim() || null,
      active,
    };
    const { error } = product
      ? await db.from("products").update(payload).eq("id", product.id)
      : await db.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(product ? "Produto atualizado" : "Produto criado");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Nome</Label>
            <Input
              id="p-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea
              id="p-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Preço (R$)</Label>
              <Input
                id="p-price"
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-img">URL da imagem</Label>
              <Input
                id="p-img"
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Ativo na vitrine</p>
              <p className="text-xs text-muted-foreground">
                Se desligado, o produto fica oculto para clientes.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
