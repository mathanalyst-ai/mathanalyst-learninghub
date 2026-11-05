const SUPABASE_URL = "https://mivydwoarizuogvozjsf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_peACzBVMgfNyPYLcXE_NqQ_AekGMF1m";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
console.log("Supabase client:", supabaseClient);