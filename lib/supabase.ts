import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Nettoie une valeur collée dans Vercel : espaces, guillemets et « / » final en trop. */
function clean(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']+|["']+$/g, '').replace(/\/+$/, '');
}

function validUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
// Supabase remplace l'ancienne clé « anon » par la clé « publishable » (sb_publishable_...) : les deux fonctionnent.
const key = clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function make(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!validUrl(url)) {
    console.warn("NEXT_PUBLIC_SUPABASE_URL n'est pas une adresse valide (attendu : https://xxxx.supabase.co) : comptes désactivés.");
    return null;
  }
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

/** null si Supabase n'est pas (ou mal) configuré : l'application fonctionne alors en mode local. */
export const supabase: SupabaseClient | null = make();

export const isSupabaseConfigured = supabase !== null;
