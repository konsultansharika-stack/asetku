/* =====================================================================
 * ASSET MANAGEMENT PRO — Edge Function: send-reminders
 * Cron harian (mis. 07:00): kirim notifikasi
 *  - peminjaman terlambat / jatuh tempo besok
 *  - jadwal pemeliharaan jatuh tempo / terlambat
 *  - aset menunggu verifikasi
 *  - pengajuan menunggu persetujuan
 * Berjalan di backend dengan SERVICE ROLE — bukan saat browser terbuka.
 *
 * Deploy: supabase functions deploy send-reminders
 * ===================================================================== */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  let sent = 0;

  try {
    const { data: loans } = await sb
      .from("loan_requests").select("id, organization_id, loan_number, borrower_id, planned_return_date, status")
      .in("status", ["Dipinjam", "Disetujui", "Siap Diambil"]);

    for (const l of loans ?? []) {
      if (!l.planned_return_date) continue;
      let title: string | null = null;
      if (l.planned_return_date < today) title = `Peminjaman terlambat: ${l.loan_number}`;
      else if (l.planned_return_date === tomorrow) title = `Pengembalian jatuh tempo besok: ${l.loan_number}`;
      if (!title) continue;
      const { error } = await sb.from("notifications").insert({
        user_id: l.borrower_id, title,
        message: `Kembalikan barang dari peminjaman ${l.loan_number} (rencana ${l.planned_return_date}).`,
        notification_type: "loan_overdue", related_table: "loan_requests", related_id: l.id, is_read: false,
      });
      if (!error) sent++;
    }

    const { data: schedules } = await sb
      .from("maintenance_schedules").select("id, organization_id, asset_id, schedule_date, maintenance_type, responsible_user_id, status")
      .neq("status", "Selesai");

    for (const s of schedules ?? []) {
      if (!s.schedule_date || s.schedule_date > tomorrow) continue;
      const late = s.schedule_date < today;
      await sb.from("notifications").insert({
        user_id: s.responsible_user_id,
        title: `${late ? "Jadwal terlambat" : "Jadwal besok"}: ${s.maintenance_type}`,
        message: `Pemeliharaan ${s.maintenance_type} terjadwal ${s.schedule_date}.`,
        notification_type: "schedule_due", related_table: "maintenance_schedules", related_id: s.id, is_read: false,
      });
      sent++;
    }

    // Aset menunggu verifikasi (untuk pengelola/admin per organisasi)
    const { data: pending } = await sb
      .from("assets").select("id, organization_id").eq("asset_status", "Menunggu Verifikasi");
    const orgCounts: Record<string, number> = {};
    (pending ?? []).forEach((a) => { orgCounts[a.organization_id] = (orgCounts[a.organization_id] || 0) + 1; });
    for (const [org, n] of Object.entries(orgCounts)) {
      const { data: staff } = await sb.from("profiles").select("id").eq("organization_id", org).eq("is_active", true);
      for (const p of staff ?? []) {
        await sb.from("notifications").insert({
          user_id: p.id, title: "Aset belum diverifikasi",
          message: `${n} aset menunggu verifikasi data inventaris.`,
          notification_type: "asset_unverified", is_read: false,
        });
        sent++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), sent }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
