import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const onboardingSchema = z.object({
  doc_type: z.enum(["pf", "pj"]),
  full_name: z.string().trim().min(2).max(120),
  doc_number: z.string().trim().min(11).max(20),
  legal_name: z.string().trim().max(160).optional().nullable(),
  trade_name: z.string().trim().min(2).max(120),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => onboardingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: profErr } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (existing?.company_id) {
      return { company_id: existing.company_id, already: true };
    }

    const name = data.doc_type === "pj" && data.legal_name ? data.legal_name : data.trade_name;
    const companyId = crypto.randomUUID();

    const { error: cErr } = await (supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from("companies")
      .insert({
        id: companyId,
        name,
        doc_type: data.doc_type,
        doc_number: data.doc_number,
        legal_name: data.doc_type === "pj" ? data.legal_name ?? null : null,
        trade_name: data.trade_name,
      });
    if (cErr) throw new Error(cErr.message);
    const company = { id: companyId };

    const { error: uErr } = await supabase
      .from("profiles")
      .update({ full_name: data.full_name, company_id: company.id })
      .eq("id", userId);
    if (uErr) throw new Error(uErr.message);

    const { error: rErr } = await (supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from("user_roles")
      .insert({ user_id: userId, company_id: company.id, role: "owner" });
    if (rErr) throw new Error(rErr.message);

    return { company_id: company.id, already: false };
  });
