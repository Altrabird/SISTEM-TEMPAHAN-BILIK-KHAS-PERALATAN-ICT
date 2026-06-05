/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ADMIN_ID?: string;
  readonly VITE_ADMIN_PASSWORD?: string;
  /** Public Telegram link surfaced as an opt-in CTA in scan results,
   *  loans view, and settings. Recommended: group invite link
   *  (https://t.me/+xxxxx). Falls back to a bot DM (https://t.me/TempahSKBT_bot)
   *  so the CTA always has a destination. Set to empty string to hide
   *  the CTA entirely. */
  readonly VITE_TELEGRAM_INVITE_URL?: string;
  /** Friendly label shown next to the Telegram CTA. Override per-deploy
   *  if your group has a different public name. */
  readonly VITE_TELEGRAM_GROUP_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
