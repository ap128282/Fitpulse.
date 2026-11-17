'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dumbbell } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup' | 'forgot' | 'recovery';

const TITLE: Record<Mode, string> = {
  login: 'Connexion',
  signup: 'Créer un compte',
  forgot: 'Mot de passe oublié',
  recovery: 'Nouveau mot de passe',
};

function frenchError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Un compte existe déjà avec cet e-mail. Connecte-toi.';
  if (m.includes('email not confirmed')) return "Ton e-mail n'est pas encore confirmé : clique sur le lien reçu par mail.";
  if (m.includes('rate limit') || m.includes('too many')) return "Trop de tentatives ou d'e-mails envoyés : réessaie dans quelques minutes.";
  if (m.includes('password') && m.includes('characters')) return 'Le mot de passe est trop court.';
  if (m.includes('weak')) return 'Ce mot de passe est trop simple : ajoute des chiffres ou des symboles.';
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('mode');
    if (wanted === 'signup') setMode('signup');
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setInfo('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!supabase) {
      setError(
        process.env.NODE_ENV === 'production'
          ? "La connexion n'est pas disponible pour le moment. Tu peux utiliser FitPulse sans compte."
          : 'Supabase n\'est pas configuré : renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      );
      return;
    }
    if ((mode === 'signup' || mode === 'recovery') && password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/login` } });
        if (err) throw err;
        // Supabase renvoie une liste d'identités vide quand l'e-mail existe déjà (protection contre l'énumération).
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError('Un compte existe déjà avec cet e-mail. Connecte-toi.');
        } else if (data.session) router.push('/dashboard');
        else setInfo('Compte créé. Ouvre le mail de confirmation que tu viens de recevoir (pense aux courriers indésirables), puis reviens te connecter.');
      } else if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push('/dashboard');
      } else if (mode === 'forgot') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
        if (err) throw err;
        setInfo('Si un compte existe avec cet e-mail, tu vas recevoir un lien pour choisir un nouveau mot de passe.');
      } else {
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) throw err;
        router.push('/dashboard');
      }
    } catch (err) {
      setError(frenchError(err instanceof Error ? err.message : 'Une erreur est survenue.'));
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-line-cream bg-white px-3 py-3 text-ink placeholder:text-muted-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/30';

  return (
    <div className="flex min-h-[80vh] flex-col justify-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-royal">
          <Dumbbell size={34} strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-6xl font-extrabold uppercase leading-none">FitPulse</h1>
        <div className="tricolor mx-auto mt-3 h-1 w-24 rounded-full" />
        <p className="mt-3 text-sm text-muted">Ta progression, pilotée par le RIR.</p>
      </div>

      {!isSupabaseConfigured && (
        <p role="status" className="mb-4 rounded-2xl border border-line bg-panel p-3 text-sm text-muted">
          Les comptes ne sont pas encore activés sur ce site. Tu peux utiliser FitPulse sans compte : tout est enregistré sur ton appareil.
        </p>
      )}

      <form onSubmit={submit} className="card-cream space-y-3 p-5">
        {(mode === 'login' || mode === 'signup') && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 ring-1 ring-line-cream" role="tablist">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`rounded-lg py-2 text-sm font-bold transition ${mode === m ? 'bg-royal text-white' : 'text-muted-ink'}`}
              >
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>
        )}

        {(mode === 'forgot' || mode === 'recovery') && <h2 className="font-display text-2xl font-bold uppercase">{TITLE[mode]}</h2>}

        {mode !== 'recovery' && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-ink">E-mail</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} placeholder="toi@exemple.fr" />
          </label>
        )}

        {mode !== 'forgot' && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-ink">{mode === 'recovery' ? 'Nouveau mot de passe' : 'Mot de passe'}</span>
            <input
              type="password"
              required
              minLength={mode === 'login' ? 1 : 8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
              placeholder={mode === 'login' ? 'Ton mot de passe' : '8 caractères minimum'}
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm font-semibold text-ember">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="text-sm font-semibold text-royal">
            {info}
          </p>
        )}

        <button type="submit" className="btn-royal w-full" disabled={loading}>
          {loading ? 'Patiente…' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : mode === 'forgot' ? 'Envoyer le lien' : 'Enregistrer le mot de passe'}
        </button>

        {mode === 'login' && (
          <button type="button" onClick={() => switchMode('forgot')} className="w-full text-center text-sm font-semibold text-royal underline">
            Mot de passe oublié ?
          </button>
        )}
        {mode === 'forgot' && (
          <button type="button" onClick={() => switchMode('login')} className="w-full text-center text-sm font-semibold text-royal underline">
            Retour à la connexion
          </button>
        )}
        {mode === 'signup' && (
          <p className="text-xs text-muted-ink">
            En créant un compte, ton profil (objectifs, matériel, poids, allergies) est sauvegardé en ligne pour être retrouvé sur tes autres appareils.
          </p>
        )}
      </form>

      <Link href="/dashboard" className="mt-5 text-center text-sm font-semibold text-royal-light">
        Continuer sans compte
      </Link>
    </div>
  );
}
