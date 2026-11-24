const SUPABASE_URL = "https://mivydwoarizuogvozjsf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_peACzBVMgfNyPYLcXE_NqQ_AekGMF1m";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// Jadikan client boleh dicapai oleh app.js dan access.js
window.supabaseClient = supabaseClient;

console.log("Math Analyst Supabase connected.");
