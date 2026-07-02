import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({ token: z.string().uuid() });

export type PublicInvitation = {
  id: string;
  email: string;
  role: string;
  company_id: string;
  company_name: string | null;
};

type AdminClient = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, val: string) => {
        is: (col: string, val: null) => {
          gt: (col: string, val: string) => {
            maybeSingle: () => Promise<{
              data:
                | {
                    id: string;
                    email: string;
                    role: string;
                    company_id: string;
                    companies: { name: string | null } | null;
                  }
                | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };
};

/**
 * Public endpoint (no auth) to look up a single invitation by token.
 * Uses service_role internally because the invitations table no longer has
 * a public SELECT policy (RLS tightened to prevent enumeration of pending
 * invites). Only returns non-sensitive fields.
 */
export const getInvitationByToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<PublicInvitation | null> => {
    const { supabaseAdmin: rawAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const admin = rawAdmin as unknown as AdminClient;

    const { data: row, error } = await admin
      .from("invitations")
      .select("id, email, role, company_id, companies(name)")
      .eq("token", data.token)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("[invitations] lookup failed", error);
      return null;
    }
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      company_id: row.company_id,
      company_name: row.companies?.name ?? null,
    };
  });
