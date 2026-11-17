'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/** E-mail du compte connecté : undefined = chargement, null = non connecté. */
export function useAuthEmail(): string | null | undefined {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) {
      setEmail(null);
      return;
    }
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setEmail(session?.user?.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return email;
}
