'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut } from 'lucide-react';
import ProfileSettings from '@/components/ProfileSettings';
import { useHydrated, useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const history = useStore((s) => s.history);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (!hydrated) return <div className="panel h-40 animate-pulse" aria-busy="true" />;

  const logout = async () => {
    await supabase?.auth.signOut();
    setEmail(null);
    router.push('/login');
  };

  const totalVolume = history.reduce((n, s) => n + s.volume, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none">Profil</h1>
        <p className="mt-1 text-sm text-muted">{email ?? 'Mode local : données enregistrées sur cet appareil'}</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="panel p-4">
          <p className="font-display text-5xl font-bold leading-none tabular-nums text-royal-light">{history.length}</p>
          <p className="mt-1 text-xs text-muted">séances terminées</p>
        </div>
        <div className="panel p-4">
          <p className="font-display text-5xl font-bold leading-none tabular-nums">{Math.round(totalVolume / 1000)} t</p>
          <p className="mt-1 text-xs text-muted">soulevées au total</p>
        </div>
      </section>

      <ProfileSettings />

      {email ? (
        <button onClick={logout} className="btn-outline w-full">
          <LogOut size={18} />
          Se déconnecter
        </button>
      ) : (
        <Link href="/login" className="btn-royal w-full">
          <LogIn size={18} />
          Se connecter pour synchroniser
        </Link>
      )}

      <p className="pb-2 text-center text-[11px] text-muted">
        Images d&apos;exercices : free-exercise-db (domaine public).
      </p>
    </div>
  );
}
