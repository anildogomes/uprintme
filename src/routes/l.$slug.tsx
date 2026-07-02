import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Store, Loader2 } from "lucide-react";
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

const db = supabase as unknown as { from: (t: string) => any };

function PublicStore() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["public-store", slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("companies")
        .select("id, name, slug")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; slug: string } | null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
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
            <span className="text-lg font-bold tracking-tight">{data.name}</span>
          </div>
          <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Printer className="h-3.5 w-3.5" /> UprintMe
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16">
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Store className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Bem-vindo à {data.name}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Esta vitrice está sendo preparada. Em breve você poderá navegar pelo
            catálogo e fazer pedidos diretamente por aqui.
          </p>
        </div>
      </main>
    </div>
  );
}
