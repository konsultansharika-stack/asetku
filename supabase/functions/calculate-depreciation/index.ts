/* =====================================================================
 * ASSET MANAGEMENT PRO — Edge Function: calculate-depreciation
 * Cron bulanan: memposting penyusutan periode berjalan via RPC
 * post_depreciation_period() memakai SERVICE ROLE (backend saja).
 *
 * Deploy:
 *   supabase functions deploy calculate-depreciation
 * ===================================================================== */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // HANYA di backend
      { auth: { persistSession: false } }
    );

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const end = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data: orgs } = await sb.from("organizations").select("id");

    const results: unknown[] = [];
    for (const org of orgs ?? []) {
      let { data: period } = await sb
        .from("depreciation_periods")
        .select("id")
        .eq("organization_id", org.id)
        .eq("period_year", year)
        .eq("period_month", month)
        .maybeSingle();

      if (!period) {
        const ins = await sb
          .from("depreciation_periods")
          .insert({ organization_id: org.id, period_year: year, period_month: month, period_start: start, period_end: end, status: "Open" })
          .select("id")
          .single();
        period = ins.data;
      }

      const { data: posted, error } = await sb.rpc("post_depreciation_period", { p_period: period.id, p_posted_by: null });
      results.push({ org: org.id, period: period.id, posted: posted ?? 0, error: error?.message ?? null });

      const { data: staff } = await sb
        .from("profiles").select("id")
        .eq("organization_id", org.id).eq("is_active", true);
      if (staff?.length && (posted ?? 0) > 0) {
        await sb.from("notifications").insert(
          staff.map((s) => ({
            user_id: s.id,
            title: "Penyusutan otomatis diposting",
            message: `${posted} entri penyusutan periode ${year}-${String(month).padStart(2, "0")} diposting oleh scheduler.`,
            notification_type: "depreciation_period",
            is_read: false,
          }))
        );
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
