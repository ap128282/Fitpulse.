import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase remplace l'ancienne clé « anon » par la clé « publishable » (sb_publishable_...) : les deux fonctionnent.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

/** null si les variables d'environnement Supabase ne sont pas définies (mode local). */
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url as string, key as string) : null;
