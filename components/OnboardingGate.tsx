'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useHydrated, useStore } from '@/lib/store';

/** Envoie vers le questionnaire de départ tant que le profil n'est pas complété. */
export default function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const onboarded = useStore((s) => s.profile.onboarded);

  useEffect(() => {
    if (hydrated && !onboarded && pathname !== '/onboarding' && !pathname.startsWith('/login')) {
      router.replace('/onboarding');
    }
  }, [hydrated, onboarded, pathname, router]);

  return null;
}
