import { createClient } from '@supabase/supabase-js';

// Chave pública (anon): pode ficar no navegador. Quem protege os dados são as regras de acesso do banco.
export const SUPABASE_URL = 'https://hadbqjgfqfokutltiqra.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'girocheque-auth',
  },
});
