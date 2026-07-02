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

type AdminClient = {
  from: (t: string) => {
    insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    update: (v: Record<string, unknown>) => {
      eq: (c: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
    upsert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    select: (c: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{
          data: { company_id: string | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => onboardingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { supabaseAdmin: rawAdmin } = await import("@/integrations/supabase/client.server");
    const admin = rawAdmin as unknown as AdminClient;

    // 1. Check if user already onboarded
    const { data: existing, error: profErr } = await admin
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (existing?.company_id) {
      return { company_id: existing.company_id, already: true };
    }

    const name =
      data.doc_type === "pj" && data.legal_name ? data.legal_name : data.trade_name;
    const companyId = crypto.randomUUID();

    // 2. Create company (service_role bypasses RLS)
    const { error: cErr } = await admin.from("companies").insert({
      id: companyId,
      name,
      doc_type: data.doc_type,
      doc_number: data.doc_number,
      legal_name: data.doc_type === "pj" ? data.legal_name ?? null : null,
      trade_name: data.trade_name,
    });
    if (cErr) throw new Error(cErr.message);

    // 3. Ensure profile exists and is linked to company BEFORE inserting role
    const { error: pErr } = await admin.from("profiles").upsert({
      id: userId,
      full_name: data.full_name,
      company_id: companyId,
    });
    if (pErr) throw new Error(pErr.message);

    // 4. Now create user_roles entry (order matters: company + profile first)
    const { error: rErr } = await admin.from("user_roles").insert({
      user_id: userId,
      company_id: companyId,
      role: "owner",
    });
    if (rErr) throw new Error(rErr.message);

    return { company_id: companyId, already: false };
  });
