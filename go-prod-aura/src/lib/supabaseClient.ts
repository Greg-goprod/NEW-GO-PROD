import { createClient } from "@supabase/supabase-js";

// Client Supabase centralisé pour éviter les instances multiples
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default supabase;



