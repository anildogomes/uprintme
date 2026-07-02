import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  component: FornecedoresPage,
});

function FornecedoresPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Gestão de fornecedores e parceiros.</p>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Em breve — cadastro e gestão de fornecedores.
      </div>
    </div>
  );
}
