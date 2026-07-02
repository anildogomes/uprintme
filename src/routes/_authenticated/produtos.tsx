import { createFileRoute } from "@tanstack/react-router";
import { Package2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/produtos")({
  component: ProdutosPage,
});

function ProdutosPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Package2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Catálogo de produtos da sua gráfica.</p>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Em breve — cadastro e gestão de produtos.
      </div>
    </div>
  );
}
