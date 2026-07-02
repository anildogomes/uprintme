import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Store, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/l/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — UprintMe` },
      { name: "description", content: "Vitrine online — peça direto pela loja." },
    ],
  }),
  component: PublicStore,
});

type Company = { id: string; name: string; slug: string };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
};

const db = supabase as unknown as { from: (t: string) => any };

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PublicStore() {
  const { slug } = Route.useParams();

  const { data: company, isLoading } = useQuery<Company | null>({
    queryKey: ["public-store", slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("companies")
        .select("id, name, slug")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Company | null;
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["public-products", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("products")
        .select("id, name, description, price_cents, image_url")
        .eq("company_id", company!.id)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <Store className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Loja não encontrada</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          O endereço "/l/{slug}" não existe ou ainda não foi publicado.
        </p>
        <Link to="/">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">{company.name}</span>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Printer className="h-3.5 w-3.5" /> UprintMe
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confira o catálogo e entre em contato para fazer seu pedido.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Esta vitrine ainda não tem produtos publicados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <article
                key={p.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:shadow-lg"
              >
                <div className="aspect-square w-full overflow-hidden bg-secondary">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Package className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-semibold">{p.name}</h2>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-3 text-lg font-bold text-primary">
                    {brl(p.price_cents)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
