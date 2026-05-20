/**
 * send-password-email — Supabase Edge Function
 *
 * Receives `{ loanId, mode? }`, looks up the loan + asset + borrower
 * server-side (service-role, bypasses RLS), then emails the asset's
 * Nota Akses to the borrower's profile email via Gmail SMTP.
 *
 * Required env vars (set via Supabase Dashboard → Edge Functions → Manage secrets):
 *   - GMAIL_USER          (e.g. tempah.skbt@gmail.com)
 *   - GMAIL_APP_PASSWORD  (16-char App Password from Google security)
 *
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected.
 *
 * Why server-side lookup (not pass note in payload):
 *   The frontend should NEVER hold an arbitrary asset's access_note in a
 *   request body that could be replayed against any loan id. By looking
 *   the note up here from the trusted loan record, a caller can only ever
 *   reach the password attached to the loan they reference — and we can
 *   double-check the borrower email belongs to the loan's user_id.
 */
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  loanId: string;
  /** "auto" = post-insert first-time send. "resend" = user clicked "Hantar Semula".
   *  Only used for telemetry / future rate-limiting. */
  mode?: "auto" | "resend";
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.loanId) {
      return jsonResponse(400, { error: "loanId required" });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
    const APP_URL = Deno.env.get("APP_URL") ?? "https://tempah.altrabird.click";

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return jsonResponse(500, {
        error:
          "Gmail credentials not configured. Set GMAIL_USER + GMAIL_APP_PASSWORD secrets.",
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // 1. Loan
    const { data: loan, error: loanError } = await supabase
      .from("bookings")
      .select(
        "id, resource_id, user_id, user_name, date, return_date, purpose, status, resource_type",
      )
      .eq("id", payload.loanId)
      .single();

    if (loanError || !loan) {
      return jsonResponse(404, { error: "Loan not found" });
    }
    if (loan.resource_type !== "equipment") {
      return jsonResponse(400, { error: "Not an equipment loan" });
    }

    // 2. Asset (must have access_note)
    const { data: asset } = await supabase
      .from("assets")
      .select("id, name, serial_number, access_note, resource_id")
      .eq("id", loan.resource_id)
      .single();

    if (!asset) {
      return jsonResponse(404, { error: "Asset not found" });
    }
    if (!asset.access_note || asset.access_note.trim().length === 0) {
      return jsonResponse(400, { error: "Asset has no access note" });
    }

    // 3. Borrower email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", loan.user_id)
      .single();

    if (!profile || !profile.email || profile.email.trim().length === 0) {
      return jsonResponse(400, {
        error: "Borrower has no email in profile",
        code: "no_email",
      });
    }

    // 4. Category name (best-effort)
    let categoryName = "";
    const { data: category } = await supabase
      .from("equipment")
      .select("name")
      .eq("id", asset.resource_id)
      .single();
    if (category?.name) categoryName = category.name;

    // 5. Compose
    const returnDate = loan.return_date ?? loan.date;
    const subject = `🔐 TEMPAH SKBT — Nota Akses ${asset.name}`;

    const html = `<!DOCTYPE html>
<html lang="ms"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${escapeHtml(
      subject,
    )}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; padding: 24px; margin: 0; color: #0f172a;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 28px 32px; color: white;">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.9;">TEMPAH · SK BANDAR TAWAU</div>
      <h1 style="font-size: 22px; font-weight: 800; margin: 8px 0 0 0; letter-spacing: -0.02em; line-height: 1.3;">🔐 Nota Akses Peralatan</h1>
    </div>
    <div style="padding: 28px 32px;">
      <p style="font-size: 15px; color: #334155; margin: 0 0 22px 0; line-height: 1.6;">
        Salam <strong>${escapeHtml(profile.name)}</strong>,<br/>
        Berikut maklumat akses untuk peralatan yang anda pinjam:
      </p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 16px;">
        <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">UNIT</div>
        <div style="font-size: 17px; font-weight: 700; color: #0f172a; line-height: 1.3;">${escapeHtml(
          asset.name,
        )}</div>
        ${
      categoryName
        ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${escapeHtml(
          categoryName,
        )}</div>`
        : ""
    }
        ${
      asset.serial_number
        ? `<div style="font-family: 'Courier New', 'Consolas', monospace; font-size: 12px; color: #2563eb; font-weight: 700; margin-top: 8px; letter-spacing: 0.05em;">${escapeHtml(
          asset.serial_number,
        )}</div>`
        : ""
    }
      </div>
      <div style="background: linear-gradient(180deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; padding: 18px 20px; margin-bottom: 18px;">
        <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #92400e; margin-bottom: 8px;">🔐 NOTA AKSES</div>
        <pre style="font-family: 'Courier New', 'Consolas', monospace; font-size: 14px; color: #1e293b; white-space: pre-wrap; word-break: break-word; margin: 0; line-height: 1.6; background: white; padding: 12px 14px; border-radius: 8px; border: 1px solid #fcd34d;">${escapeHtml(
      asset.access_note,
    )}</pre>
      </div>
      <div style="background: #f8fafc; border-radius: 12px; padding: 14px 18px; font-size: 13px; color: #475569; line-height: 1.7;">
        <strong>📅 Tempoh pinjaman:</strong> ${escapeHtml(loan.date)} → ${escapeHtml(
      returnDate,
    )}<br/>
        <strong>📝 Tujuan:</strong> ${escapeHtml(loan.purpose)}
      </div>
      <p style="font-size: 12px; color: #64748b; margin: 22px 0 0 0; line-height: 1.7;">
        ⚠️ <strong>Sila simpan email ini sebagai rujukan</strong> sepanjang tempoh pinjaman.
        Jangan kongsi maklumat akses ini dengan orang lain.
        Jika ada masalah, sila lapor kepada admin di TEMPAH.
      </p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${escapeHtml(
      APP_URL,
    )}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">Buka TEMPAH →</a>
      </div>
    </div>
    <div style="background: #f8fafc; padding: 14px 32px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; line-height: 1.6;">
      Email automatik dari TEMPAH · SK Bandar Tawau<br/>
      Sila jangan reply email ini — ia tidak dipantau.
    </div>
  </div>
</body></html>`;

    // 6. Send via Gmail SMTP (implicit TLS port 465)
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
      },
    });

    await client.send({
      from: `TEMPAH SKBT <${GMAIL_USER}>`,
      to: profile.email,
      subject,
      content: stripHtml(html),
      html,
    });

    await client.close();

    return jsonResponse(200, {
      ok: true,
      sentTo: profile.email,
      asset: asset.name,
      mode: payload.mode ?? "auto",
    });
  } catch (err: any) {
    console.error("send-password-email error:", err);
    return jsonResponse(500, {
      error: err?.message ?? String(err),
    });
  }
});
