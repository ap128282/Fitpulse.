'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { pullProfile, pushProfile } from '@/lib/sync';
import { sanitizeProfile } from '@/lib/profile';
import { useHydrated, useStore } from '@/lib/store';

/**
 * Relie le profil au compte :
 * - à la connexion, le profil du compte est chargé (on saute le questionnaire de départ) ;
 * - sans profil sur le compte, le profil de cet appareil est envoyé ;
 * - ensuite, chaque modification est sauvegardée.
 */
export default function AuthSync() {
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const userId = useRef<string | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    if (!supabase || !hydrated) return;
    let active = true;

    const handle = async (uid: string | null) => {
      if (uid === userId.current) return;
      userId.current = uid;
      ready.current = false;
      if (!uid) return;
      const remote = await pullProfile();
      if (!active || userId.current !== uid) return;
      if (remote && typeof remote === 'object') {
        useStore.setState({ profile: sanitizeProfile({ ...(remote as object), onboarded: true }) });
      } else if (useStore.getState().profile.onboarded) {
        await pushProfile(useStore.getState().profile);
      }
      ready.current = true;
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        void handle(session?.user?.id ?? null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrated]);

  useEffect(() => {
    if (!supabase || !ready.current || !userId.current || !profile.onboarded) return;
    const id = setTimeout(() => void pushProfile(profile), 1500);
    return () => clearTimeout(id);
  }, [profile]);

  return null;
}
