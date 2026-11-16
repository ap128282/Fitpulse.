'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, Building2, Clock, Dumbbell, Flame, Home, Play, Trophy, Zap } from 'lucide-react';
import ExerciseDemo from '@/components/ExerciseDemo';
import { dayKey, useHydrated, useStore } from '@/lib/store';
import { FOCUS_SHORT, suggestedFocus } from '@/lib/ai-engine';
import DurationPicker from '@/components/DurationPicker';
import { computeTargets } from '@/lib/nutrition';
import { GOAL_LABEL, SPORT_LABEL, durationLabel } from '@/lib/profile';

const WEEKS = 18;
const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function cellColor(volume: number): string {
  if (volume <= 0) return '#0B0C10';
  if (volume < 3000) return 'rgba(26,86,219,0.45)';
  if (volume < 6000) return 'rgba(26,86,219,0.75)';
  if (volume < 9000) return '#1A56DB';
  return '#FFFFFF';
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function DashboardPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const history = useStore((s) => s.history);
  const profile = useStore((s) => s.profile);
  const active = useStore((s) => s.active);
  const planWorkout = useStore((s) => s.planWorkout);
  const startWorkout = useStore((s) => s.startWorkout);
  const setProfile = useStore((s) => s.setProfile);
  const setPlace = useStore((s) => s.setPlace);
  const meals = useStore((s) => s.meals);

  const stats = useMemo(() => {
    const volumeByDay = new Map<string, number>();
    history.forEach((s) => {
      const k = dayKey(new Date(s.date));
      volumeByDay.set(k, (volumeByDay.get(k) ?? 0) + s.volume);
    });

    const now = new Date();
    const weekStart = mondayOf(now).getTime();
    const monthAgo = Date.now() - 30 * 86400000;
    const thisWeek = history.filter((s) => new Date(s.date).getTime() >= weekStart);
    const last7 = history.filter((s) => new Date(s.date).getTime() >= Date.now() - 7 * 86400000);
    const prs30 = history.filter((s) => new Date(s.date).getTime() >= monthAgo).reduce((n, s) => n + s.prs, 0);

    const weeksWithSession = new Set(history.map((s) => dayKey(mondayOf(new Date(s.date)))));
    let streak = 0;
    const cursor = mondayOf(now);
    if (!weeksWithSession.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 7);
    while (weeksWithSession.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    }

    const start = mondayOf(now);
    start.setDate(start.getDate() - (WEEKS - 1) * 7);
    const columns = Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        return { key: dayKey(date), volume: volumeByDay.get(dayKey(date)) ?? 0, future: date.getTime() > now.getTime(), date };
      })
    );

    return {
      columns,
      weekSessions: thisWeek.length,
      volume7: last7.reduce((n, s) => n + s.volume, 0),
      prs30,
      streak,
    };
  }, [history]);

  // Séance du jour : fixe pour la journée (pas de changement à chaque affichage), recalculée si l'historique ou le profil change.
  const today = hydrated ? dayKey(new Date()) : '';
  const plan = useMemo(() => {
    if (!hydrated) return null;
    return planWorkout({ focus: suggestedFocus(profile, history), seed: hashString(`${today}-${profile.duration}-${profile.place}-${profile.goal}`) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, today, history, profile, planWorkout]);

  if (!hydrated || !plan) return <div className="panel h-40 animate-pulse" aria-busy="true" />;

  const target = profile.sessionsPerWeek;
  const targets = computeTargets(profile);
  const todayKcal = meals.filter((m) => m.date === dayKey(new Date())).reduce((n, m) => n + m.kcal, 0);
  const segments = Math.max(target, stats.weekSessions);

  const tiles = [
    { label: 'Séances (7 j)', value: String(history.filter((s) => new Date(s.date).getTime() >= Date.now() - 7 * 86400000).length), Icon: Dumbbell, tint: 'text-royal-light' },
    { label: 'Volume (7 j)', value: `${Math.round(stats.volume7 / 100) / 10} t`, Icon: Zap, tint: 'text-white' },
    { label: 'Semaines d\'affilée', value: String(stats.streak), Icon: Flame, tint: 'text-ember' },
    { label: 'Records (30 j)', value: String(stats.prs30), Icon: Trophy, tint: 'text-ember' },
  ];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">{GOAL_LABEL[profile.goal]}{profile.sport !== 'aucun' ? ` · ${SPORT_LABEL[profile.sport]}` : ''}</p>
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none">
          {profile.name ? `Salut ${profile.name}` : 'Salut'}
        </h1>
      </header>

      {/* Lieu */}
      <div role="group" aria-label="Lieu d'entraînement" className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-panel p-1">
        {(
          [
            { id: 'maison', label: 'Maison', Icon: Home },
            { id: 'salle', label: 'Salle', Icon: Building2 },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-pressed={profile.place === id}
            onClick={() => setPlace(id)}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
              profile.place === id ? 'bg-royal text-white' : 'text-muted'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Semaine */}
      <section className="panel p-4" aria-label="Objectif de la semaine">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold uppercase">Cette semaine</h2>
          <p className="text-sm font-semibold tabular-nums">
            <span className={stats.weekSessions >= target ? 'text-white' : 'text-royal-light'}>{stats.weekSessions}</span>
            <span className="text-muted"> / {target} séances</span>
          </p>
        </div>
        <div className="flex gap-1.5" role="img" aria-label={`${stats.weekSessions} séances sur ${target} cette semaine`}>
          {Array.from({ length: segments }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-full ${
                i < stats.weekSessions ? (i >= target ? 'bg-ember' : 'bg-royal') : 'bg-ink ring-1 ring-line'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Séance du jour */}
      {active ? (
        <Link href="/workout" className="card-cream flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ember">Séance en cours</p>
            <p className="font-display text-3xl font-bold uppercase leading-tight">{active.name}</p>
          </div>
          <span className="btn-royal !px-4 !py-2 text-sm">
            <Play size={16} />
            Reprendre
          </span>
        </Link>
      ) : (
        <section className="card-cream overflow-hidden" aria-label="Séance du jour">
          <div className="tricolor h-1.5" />
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-royal">Séance du jour</p>
            <h2 className="font-display text-4xl font-extrabold uppercase leading-none">{FOCUS_SHORT[plan.focus]}</h2>
            <p className="mt-1 text-sm text-muted-ink">
              {plan.exercises.length} exercices · environ {plan.estimatedMin} min
            </p>

            <ul className="mt-3 space-y-2">
              {plan.exercises.slice(0, 4).map((e) => (
                <li key={e.slug} className="flex items-center gap-3">
                  <ExerciseDemo imageId={e.imageId} name={e.name} variant="thumb" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{e.name}</p>
                    <p className="text-xs tabular-nums text-muted-ink">
                      {e.sets.length} × {e.repRange[0]}–{e.repRange[1]}
                    </p>
                  </div>
                </li>
              ))}
              {plan.exercises.length > 4 && <li className="pl-[68px] text-xs text-muted-ink">+ {plan.exercises.length - 4} autres exercices</li>}
            </ul>

            <details className="mt-4 rounded-xl bg-white ring-1 ring-line-cream">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-bold">
                <span>
                  <Clock size={14} className="mr-1.5 inline text-royal" />
                  Durée : {durationLabel(profile.duration)}
                </span>
                <span className="text-xs font-semibold text-royal">Modifier</span>
              </summary>
              <div className="m-2 rounded-xl bg-ink p-3 text-white">
                <DurationPicker value={profile.duration} onChange={(duration) => setProfile({ duration })} />
              </div>
            </details>

            <button
              className="btn-royal mt-4 w-full text-lg"
              onClick={() => {
                startWorkout(plan);
                router.push('/workout');
              }}
            >
              <Play size={18} />
              Commencer la séance
            </button>
            <Link href="/coach" className="btn-outline-cream mt-2 w-full text-sm">
              <Bot size={16} />
              Demander autre chose au Coach IA
            </Link>
          </div>
        </section>
      )}

      {/* Nutrition du jour */}
      <Link href="/nutrition" className="panel flex items-center justify-between p-4" aria-label="Ouvrir la nutrition">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Nutrition du jour</p>
          <p className="font-display text-3xl font-bold tabular-nums">
            {todayKcal} <span className="text-base font-semibold text-muted">/ {targets.kcal} kcal</span>
          </p>
        </div>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-ink" aria-hidden="true">
          <div className="h-full rounded-full bg-royal" style={{ width: `${Math.min(100, (todayKcal / Math.max(1, targets.kcal)) * 100)}%` }} />
        </div>
      </Link>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3" aria-label="Résumé">
        {tiles.map(({ label, value, Icon, tint }) => (
          <div key={label} className="panel p-4">
            <Icon size={18} className={tint} />
            <p className="mt-2 font-display text-5xl font-bold leading-none tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted">{label}</p>
          </div>
        ))}
      </section>

      {/* Heatmap */}
      <section className="panel p-4" aria-label="Assiduité">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold uppercase">Assiduité</h2>
          <p className="text-xs text-muted">{WEEKS} dernières semaines</p>
        </div>
        <div className="flex gap-1.5">
          <div className="flex flex-col justify-between py-0.5 text-[9px] text-muted">
            {DAY_LABELS.map((l, i) => (
              <span key={i} className="h-[14px] leading-[14px]">
                {i % 2 === 0 ? l : ''}
              </span>
            ))}
          </div>
          <div className="flex flex-1 justify-between gap-[3px] overflow-x-auto">
            {stats.columns.map((col, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {col.map((c) => (
                  <div
                    key={c.key}
                    title={c.future ? '' : `${c.date.toLocaleDateString('fr-FR')} : ${c.volume} kg`}
                    className="h-[14px] w-[14px] rounded-[3px] ring-1 ring-inset ring-line/60"
                    style={{ background: c.future ? 'transparent' : cellColor(c.volume) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted">
          Moins
          {[0, 1000, 4000, 7000, 10000].map((v) => (
            <span key={v} className="h-3 w-3 rounded-[3px] ring-1 ring-inset ring-line/60" style={{ background: cellColor(v) }} />
          ))}
          Plus
        </div>
      </section>

      <Link href="/analytics" className="btn-outline w-full text-sm">
        Voir ma progression
      </Link>

      {/* Historique */}
      <section aria-label="Dernières séances">
        <h2 className="mb-2 font-display text-2xl font-bold uppercase">Dernières séances</h2>
        {history.length === 0 ? (
          <div className="panel p-5 text-center text-sm text-muted">
            Aucune séance enregistrée. Lance ta première séance pour remplir ton historique.
          </div>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 5).map((s) => (
              <li key={s.id} className="panel flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{s.name}</p>
                  <p className="text-xs text-muted">
                    {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                    {s.durationMin} min · {s.sets} séries
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold tabular-nums">{s.volume.toLocaleString('fr-FR')} kg</p>
                  {s.prs > 0 && (
                    <p className="flex items-center justify-end gap-1 text-xs font-semibold text-ember">
                      <Trophy size={12} />
                      {s.prs} PR
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
