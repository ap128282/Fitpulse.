'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Flame,
  Flag,
  History as HistoryIcon,
  Minus,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import ExerciseDemo from './ExerciseDemo';
import { buildSummary, FinishSummary, lastPerformance, recentSlugs, useHydrated, useStore } from '@/lib/store';
import {
  alternativesFor,
  BAR_PLATES,
  DUMBBELL_PLATES,
  epley1RM,
  EXERCISE_BY_SLUG,
  GEAR_LABEL,
  GearType,
  plateBreakdown,
  suggestNext,
  TECHNIQUE_HELP,
  TECHNIQUE_LABEL,
} from '@/lib/ai-engine';
import { MUSCLE_LABEL } from '@/lib/profile';
import type { SwapResponse, SwapSuggestion } from '@/lib/types';

const fmt = (n: number) => String(Number(n.toFixed(2)));

// ---------------------------------------------------------------------------
// Chrono de séance
// ---------------------------------------------------------------------------

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return <span className="tabular-nums">{h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`}</span>;
}

// ---------------------------------------------------------------------------
// Minuteur de repos (popup + alerte sonore / vibration)
// ---------------------------------------------------------------------------

function alertRestOver() {
  try {
    navigator.vibrate?.([200, 100, 200, 100, 300]);
  } catch {
    /* ignore */
  }
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.15);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* ignore */
  }
}

function RestTimer() {
  const restEndsAt = useStore((s) => s.restEndsAt);
  const restTotal = useStore((s) => s.restTotal);
  const restLabel = useStore((s) => s.restLabel);
  const adjustRest = useStore((s) => s.adjustRest);
  const stopRest = useStore((s) => s.stopRest);

  const [now, setNow] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const alertedFor = useRef<number | null>(null);

  useEffect(() => {
    setFinished(false);
    if (!restEndsAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  const remainingMs = restEndsAt ? restEndsAt - now : 0;
  const remaining = Math.max(0, Math.ceil(remainingMs / 1000));

  useEffect(() => {
    if (restEndsAt && remainingMs <= 0 && alertedFor.current !== restEndsAt) {
      alertedFor.current = restEndsAt;
      setFinished(true);
      alertRestOver();
    }
  }, [restEndsAt, remainingMs]);

  if (!restEndsAt) return null;

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = restTotal > 0 ? Math.min(1, Math.max(0, remaining / restTotal)) : 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed inset-x-3 bottom-[84px] z-50 mx-auto max-w-md rounded-2xl border p-3 shadow-2xl ${
        finished ? 'animate-pulse border-white bg-royal' : 'border-line bg-panel'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r={radius} fill="none" stroke={finished ? 'rgba(255,255,255,0.3)' : '#2E3A47'} strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke={finished ? '#FFFFFF' : '#6C97F5'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold tabular-nums">
            {mm}:{ss}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Timer size={15} />
            {finished ? 'Repos terminé : série suivante !' : 'Repos'}
          </p>
          <p className={`truncate text-xs ${finished ? 'text-white/80' : 'text-muted'}`}>{restLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {!finished && (
            <>
              <button onClick={() => adjustRest(-15)} className="btn-outline !px-2.5 !py-2 text-xs" aria-label="Retirer 15 secondes">
                -15s
              </button>
              <button onClick={() => adjustRest(15)} className="btn-outline !px-2.5 !py-2 text-xs" aria-label="Ajouter 15 secondes">
                +15s
              </button>
            </>
          )}
          <button onClick={stopRest} className={`${finished ? 'btn-white' : 'btn-outline'} !px-3 !py-2 text-xs`}>
            {finished ? 'Go' : 'Passer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calculateur de plaques
// ---------------------------------------------------------------------------

const PLATE_COLOR: Record<number, string> = {
  25: '#E11D48',
  20: '#1A56DB',
  15: '#F59E0B',
  10: '#16A34A',
  5: '#FFFFFF',
  2.5: '#6B7280',
  1.25: '#B6BFCB',
  0.5: '#6C97F5',
};

function PlateVisual({ plates }: { plates: number[] }) {
  return (
    <>
      {plates.map((p, i) => (
        <div
          key={`${p}-${i}`}
          title={`${p} kg`}
          className="rounded-[3px] border border-black/20"
          style={{ height: 36 + p * 3.2, width: p >= 10 ? 14 : p >= 2.5 ? 10 : 7, background: PLATE_COLOR[p] ?? '#6B7280' }}
        />
      ))}
    </>
  );
}

function PlateCalculator({ initialWeight, gear, onClose }: { initialWeight: number; gear: GearType; onClose: () => void }) {
  const isDumbbell = gear === 'halteres';
  const [total, setTotal] = useState(initialWeight);
  const [bar, setBar] = useState(isDumbbell ? 2.5 : 20);
  const available = isDumbbell ? DUMBBELL_PLATES : BAR_PLATES;
  const bars = isDumbbell
    ? [
        { v: 2.5, l: 'Poignée 2,5 kg' },
        { v: 3.5, l: 'Poignée 3,5 kg' },
        { v: 5, l: 'Poignée 5 kg' },
      ]
    : [
        { v: 20, l: 'Barre 20 kg' },
        { v: 15, l: 'Barre 15 kg' },
        { v: 10, l: 'Barre EZ 10 kg' },
      ];
  const res = plateBreakdown(total, bar, available);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Calculateur de plaques" className="card-cream w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
            <Scale size={20} className="text-royal" />
            Calculateur de plaques
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted-ink">
            <X size={20} />
          </button>
        </div>

        <p className="mb-2 text-xs text-muted-ink">{isDumbbell ? 'Charge par haltère réglable (plaques de chaque côté).' : 'Charge totale sur la barre.'}</p>

        <div className="mb-3 flex items-center gap-2">
          <button className="btn-outline-cream !px-3" onClick={() => setTotal((t) => Math.max(0, Number((t - 2.5).toFixed(2))))} aria-label="Moins 2,5 kg">
            <Minus size={16} />
          </button>
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-line-cream bg-white px-3 py-3 text-center text-2xl font-extrabold tabular-nums text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/30"
              aria-label="Charge totale en kilos"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-ink">kg</span>
          </div>
          <button className="btn-outline-cream !px-3" onClick={() => setTotal((t) => Number((t + 2.5).toFixed(2)))} aria-label="Plus 2,5 kg">
            <Plus size={16} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {bars.map((b) => (
            <button
              key={b.v}
              onClick={() => setBar(b.v)}
              aria-pressed={bar === b.v}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${bar === b.v ? 'border-royal bg-royal text-white' : 'border-line-cream bg-white text-ink'}`}
            >
              {b.l}
            </button>
          ))}
        </div>

        <div className="mb-3 flex h-36 items-center justify-center gap-0.5 overflow-hidden rounded-xl bg-ink px-2">
          {res.valid ? (
            <>
              <PlateVisual plates={[...res.plates].reverse()} />
              <div className="h-3 w-16 rounded bg-muted" />
              <PlateVisual plates={res.plates} />
            </>
          ) : (
            <p className="text-sm text-muted">La charge est inférieure au poids de la barre.</p>
          )}
        </div>

        {res.valid && (
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-ink">Par côté : </span>
              <span className="font-bold">{res.plates.length > 0 ? res.plates.map((p) => fmt(p)).join(' + ') + ' kg' : 'aucune plaque'}</span>
            </p>
            {res.remainder > 0 && <p className="font-semibold text-ember">Charge exacte impossible avec ces plaques : il manque {fmt(res.remainder)} kg.</p>}
          </div>
        )}

        <button onClick={onClose} className="btn-royal mt-4 w-full">
          Fermer
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Remplacement d'un exercice en un clic (suggestions du coach IA + alternatives locales)
// ---------------------------------------------------------------------------

const SWAP_REASONS = ['Machine occupée', 'Trop difficile', 'Trop facile', 'Gêne ou douleur'];

function SwapSheet({ ei, onClose }: { ei: number; onClose: () => void }) {
  const active = useStore((s) => s.active);
  const profile = useStore((s) => s.profile);
  const history = useStore((s) => s.history);
  const swapExerciseTo = useStore((s) => s.swapExerciseTo);
  const current = active?.exercises[ei];

  const [reason, setReason] = useState('Ne convient pas');
  const [ai, setAi] = useState<SwapSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'gemini' | 'local' | null>(null);

  const inWorkout = active?.exercises.map((e) => e.slug) ?? [];
  const local = current ? alternativesFor(current, inWorkout, profile, 6, ei * 1000 + 7) : [];

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'swap', exerciseSlug: current.slug, reason, inWorkout, profile, recentSlugs: recentSlugs(history) }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<SwapResponse>) : null))
      .then((data) => {
        if (cancelled) return;
        setAi(data?.suggestions ?? []);
        setSource(data?.source ?? 'local');
      })
      .catch(() => {
        if (!cancelled) {
          setAi([]);
          setSource('local');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reason, current?.slug]);

  if (!current) return null;

  const pick = (slug: string) => {
    if (swapExerciseTo(ei, slug)) onClose();
  };

  const aiExercises = ai.map((s) => ({ s, e: EXERCISE_BY_SLUG[s.slug] })).filter((x) => x.e);
  const aiSlugs = new Set(aiExercises.map((x) => x.s.slug));
  const rest = local.filter((e) => !aiSlugs.has(e.slug));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Remplacer ${current.name}`}
        className="card-cream max-h-[85vh] w-full max-w-md overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-2xl font-bold uppercase leading-tight">Remplacer l&apos;exercice</h3>
            <p className="text-xs text-muted-ink">{current.name}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted-ink">
            <X size={20} />
          </button>
        </div>

        <div className="my-3 flex flex-wrap gap-2">
          {SWAP_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              aria-pressed={reason === r}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${reason === r ? 'border-royal bg-royal text-white' : 'border-line-cream bg-white text-ink'}`}
            >
              {r}
            </button>
          ))}
        </div>

        {loading && (
          <p className="mb-3 flex items-center gap-2 text-xs text-muted-ink" role="status">
            <Sparkles size={14} className="animate-pulse text-royal" />
            Le coach cherche les meilleures alternatives…
          </p>
        )}

        {aiExercises.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-royal">Recommandé par le coach</p>
            <ul className="space-y-2">
              {aiExercises.map(({ s, e }) => (
                <li key={s.slug}>
                  <button onClick={() => pick(s.slug)} className="flex w-full items-center gap-3 rounded-xl border border-royal bg-white p-2 text-left">
                    <ExerciseDemo imageId={e.imageId} name={e.name} variant="thumb" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{e.name}</span>
                      <span className="block text-xs text-muted-ink">{GEAR_LABEL[e.gear]}</span>
                      {s.why && <span className="block text-xs text-royal">{s.why}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-ink">
          {aiExercises.length > 0 ? 'Autres alternatives' : source === 'local' ? 'Alternatives avec ton matériel' : 'Alternatives'}
        </p>
        {rest.length === 0 && aiExercises.length === 0 && !loading && (
          <p className="rounded-xl bg-white p-3 text-sm text-muted-ink ring-1 ring-line-cream">Aucun exercice équivalent avec ton matériel actuel.</p>
        )}
        <ul className="space-y-2">
          {rest.map((e) => (
            <li key={e.slug}>
              <button onClick={() => pick(e.slug)} className="flex w-full items-center gap-3 rounded-xl border border-line-cream bg-white p-2 text-left">
                <ExerciseDemo imageId={e.imageId} name={e.name} variant="thumb" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{e.name}</span>
                  <span className="block text-xs text-muted-ink">
                    {GEAR_LABEL[e.gear]} · {e.mechanic === 'polyarticulaire' ? 'Polyarticulaire' : 'Isolation'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de fin de séance
// ---------------------------------------------------------------------------

function FinishModal({ summary, onConfirm, onClose }: { summary: FinishSummary; onConfirm: () => void; onClose: () => void }) {
  const { session, prs } = summary;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Fin de séance" className="card-cream w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="tricolor h-1.5" />
        <div className="p-5">
          <h3 className="flex items-center gap-2 font-display text-3xl font-extrabold uppercase">
            <Flag size={22} className="text-royal" />
            Séance terminée
          </h3>
          <p className="mb-4 text-sm text-muted-ink">{session.name}</p>

          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white p-3 ring-1 ring-line-cream">
              <p className="font-display text-3xl font-bold tabular-nums">{session.durationMin}</p>
              <p className="text-xs text-muted-ink">minutes</p>
            </div>
            <div className="rounded-xl bg-royal p-3 text-white">
              <p className="font-display text-3xl font-bold tabular-nums">{session.volume.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-white/80">kg de volume</p>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-line-cream">
              <p className="font-display text-3xl font-bold tabular-nums">{session.sets}</p>
              <p className="text-xs text-muted-ink">séries</p>
            </div>
          </div>

          <div className="mb-5">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Trophy size={16} className="text-ember" />
              Records battus ({prs.length})
            </p>
            {prs.length === 0 ? (
              <p className="text-sm text-muted-ink">Pas de record cette fois : la régularité paie aussi.</p>
            ) : (
              <ul className="space-y-1.5">
                {prs.map((p) => (
                  <li key={p.name} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line-cream">
                    <span className="font-semibold">{p.name}</span>
                    <span className="tabular-nums font-bold text-ember">
                      1RM {fmt(p.previous)} → {fmt(p.e1rm)} kg
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline-cream flex-1">
              Continuer
            </button>
            <button onClick={onConfirm} className="btn-royal flex-[2]">
              Enregistrer la séance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

const GRID = 'grid grid-cols-[1.75rem_1fr_4.25rem_3.75rem_3.25rem_2.5rem] items-center gap-2';

export default function WorkoutLogger() {
  const router = useRouter();
  const hydrated = useHydrated();

  const active = useStore((s) => s.active);
  const history = useStore((s) => s.history);
  const profile = useStore((s) => s.profile);
  const updateSet = useStore((s) => s.updateSet);
  const updateWarmup = useStore((s) => s.updateWarmup);
  const toggleSet = useStore((s) => s.toggleSet);
  const toggleWarmup = useStore((s) => s.toggleWarmup);
  const addSet = useStore((s) => s.addSet);
  const removeSet = useStore((s) => s.removeSet);
  const finishWorkout = useStore((s) => s.finishWorkout);
  const cancelWorkout = useStore((s) => s.cancelWorkout);
  const planWorkout = useStore((s) => s.planWorkout);
  const startWorkout = useStore((s) => s.startWorkout);

  const [plate, setPlate] = useState<{ weight: number; gear: GearType } | null>(null);
  const [summary, setSummary] = useState<FinishSummary | null>(null);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  if (!hydrated) return <div className="panel h-40 animate-pulse" aria-busy="true" />;

  if (!active) {
    return (
      <div className="card-cream p-6 text-center">
        <h1 className="mb-2 font-display text-4xl font-extrabold uppercase">Aucune séance en cours</h1>
        <p className="mb-5 text-sm text-muted-ink">Lance la séance suggérée par FitPulse ou demande une séance sur mesure au coach.</p>
        <div className="flex flex-col gap-2">
          <button className="btn-royal" onClick={() => startWorkout(planWorkout())}>
            <Sparkles size={18} />
            Lancer la séance suggérée
          </button>
          <Link href="/coach" className="btn-outline-cream">
            Parler au Coach IA
          </Link>
        </div>
      </div>
    );
  }

  const totalSets = active.exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  const onFinishClick = () => {
    const s = buildSummary(active, history);
    if (s.session.sets === 0) {
      setError('Valide au moins une série de travail avant de terminer la séance.');
      return;
    }
    setError('');
    setSummary(s);
  };

  const onConfirmFinish = () => {
    finishWorkout();
    setSummary(null);
    router.push('/dashboard');
  };

  const onCancel = () => {
    if (window.confirm('Abandonner la séance en cours ? Les séries saisies seront perdues.')) cancelWorkout();
  };

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line bg-ink/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold uppercase leading-tight">{active.name}</h1>
            <p className="text-xs text-muted">
              <Elapsed since={active.startedAt} /> · {doneSets}/{totalSets} séries de travail
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="rounded-full p-2 text-muted" aria-label="Abandonner la séance">
              <X size={20} />
            </button>
            <button onClick={onFinishClick} className="btn-royal !px-4 !py-2 text-sm">
              <Flag size={16} />
              Terminer
            </button>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-royal transition-all" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-ember">
            {error}
          </p>
        )}
      </div>

      <div className="space-y-5">
        {active.exercises.map((ex, ei) => {
          const last = lastPerformance(history, ex.slug);
          const hold = ex.unit === 'sec';
          const done = ex.sets.filter((s) => s.done);
          const bestDone = done.length
            ? done.reduce((a, b) => (epley1RM(b.weight, b.reps, b.rir ?? 2) > epley1RM(a.weight, a.reps, a.rir ?? 2) ? b : a))
            : null;
          const next = bestDone ? suggestNext({ weight: bestDone.weight, reps: bestDone.reps, rir: bestDone.rir ?? 2 }, ex, profile) : null;
          const canPlate = ex.gear === 'barre' || ex.gear === 'halteres';
          const canSwap = !ex.sets.some((s) => s.done);
          const hasLoad = ex.sets.some((s) => s.weight > 0);

          return (
            <section key={ex.slug + ei} className="card-cream overflow-hidden" aria-label={ex.name}>
              <ExerciseDemo imageId={ex.imageId} name={ex.name} />

              <div className="p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl font-bold uppercase leading-tight">{ex.name}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-ink">
                      <span className="rounded-full bg-ink px-2 py-0.5 font-semibold text-white">{MUSCLE_LABEL[ex.muscle]}</span>
                      <span>{GEAR_LABEL[ex.gear]}</span>
                      <span>·</span>
                      <span>{ex.mechanic === 'polyarticulaire' ? 'Polyarticulaire' : 'Isolation'}</span>
                      <span>·</span>
                      <span>{hold ? `${ex.repRange[0]}–${ex.repRange[1]} s` : `${ex.repRange[0]}–${ex.repRange[1]} reps`}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {canSwap && (
                      <button
                        onClick={() => setSwapIndex(ei)}
                        className="btn-outline-cream !px-2.5 !py-2 text-xs"
                        aria-label={`Remplacer ${ex.name} par un exercice équivalent`}
                      >
                        <RefreshCw size={15} />
                      </button>
                    )}
                    {canPlate && hasLoad && (
                      <button
                        onClick={() => setPlate({ weight: ex.sets.find((s) => !s.done)?.weight ?? ex.sets[0]?.weight ?? 0, gear: ex.gear })}
                        className="btn-outline-cream !px-2.5 !py-2 text-xs"
                        aria-label={`Calculateur de plaques pour ${ex.name}`}
                      >
                        <Scale size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {(ex.technique || ex.tempo) && (
                  <p className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
                    {ex.technique && (
                      <span className="rounded-full bg-royal px-2 py-0.5 font-bold text-white" title={TECHNIQUE_HELP[ex.technique]}>
                        {TECHNIQUE_LABEL[ex.technique]}
                      </span>
                    )}
                    {ex.tempo && (
                      <span className="rounded-full border border-line-cream bg-white px-2 py-0.5 font-bold tabular-nums">
                        Tempo {ex.tempo} (descente · pause · montée)
                      </span>
                    )}
                  </p>
                )}
                {ex.technique && <p className="mb-2 text-xs text-muted-ink">{TECHNIQUE_HELP[ex.technique]}</p>}

                <p className="mb-2 text-sm text-muted-ink">{ex.cue}</p>

                {ex.note && (
                  <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-royal/10 px-2.5 py-2 text-xs font-semibold text-royal">
                    <Sparkles size={13} className="mt-0.5 shrink-0" />
                    <span>Coach : {ex.note}</span>
                  </p>
                )}

                <p className="mb-3 text-xs text-muted-ink">{ex.reason}</p>

                {last && (
                  <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-white px-2.5 py-2 text-xs text-muted-ink ring-1 ring-line-cream">
                    <HistoryIcon size={13} className="mt-0.5 shrink-0" />
                    <span>
                      {new Date(last.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} :{' '}
                      {last.sets.map((s) => (hold ? `${s.reps} s` : `${fmt(s.weight)}×${s.reps}`)).join(' · ')}
                    </span>
                  </p>
                )}

                {/* Échauffement spécifique */}
                {ex.warmups.length > 0 && (
                  <div className="mb-3 rounded-xl bg-white p-2 ring-1 ring-line-cream">
                    <p className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-royal">
                      <Flame size={12} />
                      Échauffement
                    </p>
                    <div className="space-y-1">
                      {ex.warmups.map((w, wi) => (
                        <div key={w.id} className={`${GRID} rounded-lg px-1 py-0.5 ${w.done ? 'bg-royal/10' : ''}`}>
                          <span className="text-xs font-extrabold text-royal">É{wi + 1}</span>
                          <span className="truncate text-[11px] text-muted-ink">{hold ? 'Moitié de durée' : w.weight > 0 ? 'Charge légère' : 'Léger'}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0"
                            value={w.weight}
                            onChange={(e) => updateWarmup(ei, wi, { weight: Number(e.target.value) || 0 })}
                            aria-label={`Charge échauffement ${wi + 1}`}
                            className="field-cream !px-1 !py-1.5"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="0"
                            value={w.reps}
                            onChange={(e) => updateWarmup(ei, wi, { reps: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                            aria-label={`${hold ? 'Secondes' : 'Répétitions'} échauffement ${wi + 1}`}
                            className="field-cream !px-1 !py-1.5"
                          />
                          <span className="text-center text-xs text-muted-ink">—</span>
                          <button
                            onClick={() => toggleWarmup(ei, wi)}
                            aria-pressed={w.done}
                            aria-label={w.done ? `Échauffement ${wi + 1} validé` : `Valider l'échauffement ${wi + 1}`}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition active:scale-90 ${
                              w.done ? 'border-royal bg-royal text-white' : 'border-line-cream bg-white text-muted-ink'
                            }`}
                          >
                            <Check size={17} strokeWidth={3} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`mb-1 ${GRID} px-1 text-[11px] font-bold uppercase tracking-wide text-muted-ink`}>
                  <span>#</span>
                  <span>Précédent</span>
                  <span className="text-center">kg</span>
                  <span className="text-center">{hold ? 'Sec' : 'Reps'}</span>
                  <span className="text-center">RIR</span>
                  <span />
                </div>

                <div className="space-y-1.5">
                  {ex.sets.map((s, si) => {
                    const prev = last?.sets[si];
                    return (
                      <div key={s.id} className={`${GRID} rounded-xl px-1 py-1 ${s.done ? 'bg-royal/10' : ''}`}>
                        <button
                          onClick={() => removeSet(ei, si)}
                          className="group relative text-sm font-bold text-muted-ink"
                          aria-label={`Supprimer la série ${si + 1}`}
                          disabled={ex.sets.length <= 1}
                        >
                          <span className="group-hover:invisible">{si + 1}</span>
                          <Trash2 size={13} className="invisible absolute inset-0 m-auto group-hover:visible" />
                        </button>
                        <span className="truncate text-xs tabular-nums text-muted-ink">
                          {prev ? (hold ? `${prev.reps} s` : `${fmt(prev.weight)}×${prev.reps}`) : '—'}
                          {s.isPR && (
                            <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-ember px-1 py-0.5 text-[10px] font-extrabold text-white">
                              <Trophy size={10} />
                              PR
                            </span>
                          )}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          value={s.weight}
                          onChange={(e) => updateSet(ei, si, { weight: Number(e.target.value) || 0 })}
                          aria-label={`Charge série ${si + 1}`}
                          className="field-cream !px-1"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="0"
                          value={s.reps}
                          onChange={(e) => updateSet(ei, si, { reps: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                          aria-label={`${hold ? 'Secondes' : 'Répétitions'} série ${si + 1}`}
                          className="field-cream !px-1"
                        />
                        <select
                          value={s.rir === null ? '' : String(s.rir)}
                          onChange={(e) => updateSet(ei, si, { rir: e.target.value === '' ? null : Number(e.target.value) })}
                          aria-label={`RIR série ${si + 1}`}
                          className={`w-full rounded-lg border border-line-cream bg-white px-0.5 py-2 text-center text-sm font-bold focus:border-royal focus:outline-none ${
                            s.rir === 0 ? 'text-ember' : s.rir !== null && s.rir <= 2 ? 'text-royal' : 'text-ink'
                          }`}
                        >
                          <option value="">—</option>
                          <option value="0">0</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4+</option>
                        </select>
                        <button
                          onClick={() => toggleSet(ei, si)}
                          aria-pressed={s.done}
                          aria-label={s.done ? `Série ${si + 1} validée` : `Valider la série ${si + 1}`}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition active:scale-90 ${
                            s.done ? 'border-royal bg-royal text-white' : 'border-line-cream bg-white text-muted-ink'
                          }`}
                        >
                          <Check size={20} strokeWidth={3} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {ex.adjustNote && (
                  <p role="status" className="mt-3 flex items-start gap-1.5 rounded-lg bg-royal px-3 py-2 text-xs font-semibold text-white">
                    <Sparkles size={13} className="mt-0.5 shrink-0" />
                    <span>Ajustement du coach : {ex.adjustNote}</span>
                  </p>
                )}

                <button onClick={() => addSet(ei)} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-royal">
                  <Plus size={16} />
                  Ajouter une série
                </button>

                {next && (
                  <p className="mt-3 rounded-lg bg-ink px-3 py-2 text-xs text-white">
                    <span className="font-bold">
                      Prochaine séance : {hold ? `${next.reps} s` : `${fmt(next.weight)} kg × ${next.reps}`}
                    </span>
                    <span className="text-muted"> · {next.reason}</span>
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <RestTimer />
      {plate && <PlateCalculator initialWeight={plate.weight} gear={plate.gear} onClose={() => setPlate(null)} />}
      {swapIndex !== null && <SwapSheet ei={swapIndex} onClose={() => setSwapIndex(null)} />}
      {summary && <FinishModal summary={summary} onConfirm={onConfirmFinish} onClose={() => setSummary(null)} />}
    </div>
  );
}
