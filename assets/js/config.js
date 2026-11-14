// build.js gera este módulo em dist com as variáveis fornecidas ao build.
export const SUPABASE_URL = "";
export const SUPABASE_PUBLISHABLE_KEY = "";

export const hasSupabaseConfig = () => Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
