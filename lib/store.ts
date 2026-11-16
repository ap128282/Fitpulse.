'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AIPlan,
  autoregulate,
  buildPlannedExercise,
  buildWorkoutFromPlan,
  epley1RM,
  EXERCISE_BY_SLUG,
  Focus,
  generateWorkout,
  Goal,
  HistorySession,
  Muscle,
  PlannedExercise,
  PlannedWorkout,
  restSeconds,
  suggestedFocus,
  UserProfile,
  WARMUP_REST_SECONDS,
} from './ai-engine';
import { DEFAULT_PROFILE, sanitizeProfile } from './profile';
import type { MealEntry, MealPlan, Place } from './types';
import { syncBodyWeight, syncSession } from './sync';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActiveSet {
  id: string;
  targetWeight: number;
  targetReps: number;
  weight: number;
  reps: number;
  rir: number | null;
  done: boolean;
  isPR: boolean;
}

export interface ActiveExercise extends Omit<PlannedExercise, 'sets' | 'warmups'> {
  warmups: ActiveSet[];
  sets: ActiveSet[];
  /** Dernier ajustement automatique des charges, affiché dans la séance. */
  adjustNote?: string;
}

export interface ActiveWorkout {
  id: string;
  name: string;
  focus: Focus;
  goal: Goal;
  startedAt: number;
  exercises: ActiveExercise[];
}

export interface BodyMetric {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

export interface FinishSummary {
  session: HistorySession;
  prs: { name: string; e1rm: number; previous: number }[];
}

export interface PlanOptions {
  focus?: Focus;
  duration?: number;
  goal?: Goal;
  /** Un seul muscle ciblé. */
  muscle?: Muscle;
  seed?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Meilleur 1RM théorique jamais réalisé sur un exercice. */
export function bestE1RM(history: HistorySession[], slug: string): number {
  let best = 0;
  for (const s of history) {
    for (const e of s.exercises) {
      if (e.slug !== slug) continue;
      for (const set of e.sets) best = Math.max(best, epley1RM(set.weight, set.reps, set.rir));
    }
  }
  return best;
}

/** Dernière performance enregistrée pour un exercice (séance la plus récente d'abord). */
export function lastPerformance(history: HistorySession[], slug: string) {
  for (const s of history) {
    const e = s.exercises.find((x) => x.slug === slug);
    if (e) return { date: s.date, sets: e.sets };
  }
  return null;
}

/** Exercices faits lors des dernières séances (pour demander de la variété au coach). */
export function recentSlugs(history: HistorySession[], sessions = 3): string[] {
  return Array.from(new Set(history.slice(0, sessions).flatMap((s) => s.exercises.map((e) => e.slug))));
}

/** Résumé d'une séance : seules les séries de travail validées comptent (pas les échauffements). */
export function buildSummary(active: ActiveWorkout, history: HistorySession[]): FinishSummary {
  const exercises: HistorySession['exercises'] = [];
  const prs: FinishSummary['prs'] = [];
  let volume = 0;
  let totalSets = 0;

  for (const ex of active.exercises) {
    const done = ex.sets.filter((s) => s.done);
    if (done.length === 0) continue;
    const logged = done.map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir ?? 2 }));
    exercises.push({ slug: ex.slug, name: ex.name, muscle: ex.muscle as Muscle, sets: logged });
    totalSets += logged.length;
    // Le volume des maintiens (secondes) n'est pas une charge soulevée : on ne le compte pas.
    if (ex.unit !== 'sec') volume += logged.reduce((acc, s) => acc + s.weight * s.reps, 0);

    const best = Math.max(...logged.map((s) => epley1RM(s.weight, s.reps, s.rir)));
    const previous = bestE1RM(history, ex.slug);
    if (previous > 0 && best > previous + 0.01) prs.push({ name: ex.name, e1rm: best, previous });
  }

  const session: HistorySession = {
    id: active.id,
    name: active.name,
    date: new Date().toISOString(),
    durationMin: Math.max(1, Math.round((Date.now() - active.startedAt) / 60000)),
    volume: Math.round(volume),
    sets: totalSets,
    prs: prs.length,
    focus: active.focus,
    goal: active.goal,
    exercises,
  };
  return { session, prs };
}

const toActiveSet = (s: { weight: number; reps: number }): ActiveSet => ({
  id: uid(),
  targetWeight: s.weight,
  targetReps: s.reps,
  weight: s.weight,
  reps: s.reps,
  rir: null,
  done: false,
  isPR: false,
});

function toActive(e: PlannedExercise): ActiveExercise {
  return { ...e, warmups: e.warmups.map(toActiveSet), sets: e.sets.map(toActiveSet) };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface State {
  history: HistorySession[]; // plus récente en premier
  bodyMetrics: BodyMetric[];
  profile: UserProfile;
  active: ActiveWorkout | null;
  restEndsAt: number | null;
  restTotal: number;
  restLabel: string;
  meals: MealEntry[];
  plan: MealPlan | null;
  shoppingChecked: Record<string, boolean>;

  setProfile: (patch: Partial<UserProfile>) => void;
  setPlace: (place: Place) => void;
  completeOnboarding: (patch: Partial<UserProfile>) => void;
  planWorkout: (opts?: PlanOptions) => PlannedWorkout;
  planFromAI: (plan: AIPlan, opts?: { goal?: Goal; duration?: number }) => PlannedWorkout | null;
  startWorkout: (plan: PlannedWorkout) => void;
  updateSet: (ei: number, si: number, patch: Partial<Pick<ActiveSet, 'weight' | 'reps' | 'rir'>>) => void;
  updateWarmup: (ei: number, wi: number, patch: Partial<Pick<ActiveSet, 'weight' | 'reps'>>) => void;
  toggleSet: (ei: number, si: number) => void;
  toggleWarmup: (ei: number, wi: number) => void;
  addSet: (ei: number) => void;
  removeSet: (ei: number, si: number) => void;
  swapExerciseTo: (ei: number, slug: string) => boolean;
  startRest: (seconds: number, label: string) => void;
  adjustRest: (deltaSeconds: number) => void;
  stopRest: () => void;
  finishWorkout: () => FinishSummary | null;
  cancelWorkout: () => void;
  addBodyWeight: (weightKg: number, date?: string) => void;
  addMeal: (entry: Omit<MealEntry, 'id'>) => void;
  removeMeal: (id: string) => void;
  setPlan: (plan: MealPlan | null) => void;
  toggleShopping: (key: string) => void;
  resetShopping: () => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      history: [],
      bodyMetrics: [],
      profile: DEFAULT_PROFILE,
      active: null,
      restEndsAt: null,
      restTotal: 0,
      restLabel: '',
      meals: [],
      plan: null,
      shoppingChecked: {},

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      setPlace: (place) => set((s) => ({ profile: { ...s.profile, place } })),

      completeOnboarding: (patch) => set((s) => ({ profile: { ...s.profile, ...patch, onboarded: true } })),

      planWorkout: (opts = {}) => {
        const { history, profile } = get();
        return generateWorkout({
          focus: opts.focus ?? suggestedFocus(profile, history),
          duration: opts.duration ?? profile.duration,
          goal: opts.goal ?? profile.goal,
          targetMuscle: opts.muscle,
          profile,
          history,
          seed: opts.seed,
        });
      },

      planFromAI: (plan, opts = {}) => {
        const { history, profile } = get();
        return buildWorkoutFromPlan(plan, {
          goal: opts.goal ?? profile.goal,
          duration: opts.duration ?? profile.duration,
          profile,
          history,
        });
      },

      startWorkout: (plan) => {
        set({
          active: {
            id: uid(),
            name: plan.name,
            focus: plan.focus,
            goal: plan.goal,
            startedAt: Date.now(),
            exercises: plan.exercises.map(toActive),
          },
          restEndsAt: null,
        });
      },

      updateSet: (ei, si, patch) => {
        const { active } = get();
        if (!active) return;
        set({
          active: {
            ...active,
            exercises: active.exercises.map((ex, i) =>
              i !== ei ? ex : { ...ex, sets: ex.sets.map((s, j) => (j !== si ? s : { ...s, ...patch })) }
            ),
          },
        });
      },

      updateWarmup: (ei, wi, patch) => {
        const { active } = get();
        if (!active) return;
        set({
          active: {
            ...active,
            exercises: active.exercises.map((ex, i) =>
              i !== ei ? ex : { ...ex, warmups: ex.warmups.map((s, j) => (j !== wi ? s : { ...s, ...patch })) }
            ),
          },
        });
      },

      toggleWarmup: (ei, wi) => {
        const { active } = get();
        if (!active) return;
        const exercise = active.exercises[ei];
        const target = exercise?.warmups[wi];
        if (!exercise || !target) return;
        const becomingDone = !target.done;
        set({
          active: {
            ...active,
            exercises: active.exercises.map((ex, i) =>
              i !== ei ? ex : { ...ex, warmups: ex.warmups.map((s, j) => (j !== wi ? s : { ...s, done: becomingDone })) }
            ),
          },
        });
        if (becomingDone) get().startRest(WARMUP_REST_SECONDS, `Échauffement · ${exercise.name}`);
        else get().stopRest();
      },

      toggleSet: (ei, si) => {
        const { active, history, profile } = get();
        if (!active) return;
        const exercise = active.exercises[ei];
        const target = exercise?.sets[si];
        if (!exercise || !target) return;

        const becomingDone = !target.done;
        const rir = target.rir ?? 2;
        let isPR = false;

        if (becomingDone) {
          const previous = bestE1RM(history, exercise.slug);
          const inSession = Math.max(
            0,
            ...exercise.sets.filter((x, i) => i !== si && x.done).map((x) => epley1RM(x.weight, x.reps, x.rir ?? 2))
          );
          const current = epley1RM(target.weight, target.reps, rir);
          isPR = previous > 0 && current > Math.max(previous, inSession) + 0.01;
        }

        // Ajustement en temps réel des séries suivantes (séries non modifiées à la main).
        const adjustment = becomingDone
          ? autoregulate(
              { weight: target.weight, reps: target.reps, rir },
              { weight: target.targetWeight, reps: target.targetReps },
              exercise,
              profile
            )
          : null;

        const exercises = active.exercises.map((ex, i) => {
          if (i !== ei) return ex;
          const sets = ex.sets.map((s, j) => {
            if (j === si) return { ...s, done: becomingDone, rir: becomingDone ? rir : s.rir, isPR };
            const untouched = !s.done && s.weight === s.targetWeight && s.reps === s.targetReps;
            if (adjustment && j > si && untouched) {
              return { ...s, weight: adjustment.weight, reps: adjustment.reps, targetWeight: adjustment.weight, targetReps: adjustment.reps };
            }
            return s;
          });
          return { ...ex, sets, adjustNote: becomingDone ? adjustment?.message : ex.adjustNote };
        });
        set({ active: { ...active, exercises } });

        if (becomingDone) {
          const allDone = exercises.every((ex) => ex.sets.every((s) => s.done));
          if (!allDone) {
            const seconds = exercise.unit === 'sec' ? 45 : restSeconds(exercise.mechanic, rir, active.goal);
            get().startRest(seconds, exercise.name);
          } else get().stopRest();
        } else {
          get().stopRest();
        }
      },

      addSet: (ei) => {
        const { active } = get();
        if (!active) return;
        set({
          active: {
            ...active,
            exercises: active.exercises.map((ex, i) => {
              if (i !== ei) return ex;
              const last = ex.sets[ex.sets.length - 1];
              const added = toActiveSet({ weight: last?.weight ?? 0, reps: last?.reps ?? ex.repRange[0] });
              return { ...ex, sets: [...ex.sets, added] };
            }),
          },
        });
      },

      removeSet: (ei, si) => {
        const { active } = get();
        if (!active) return;
        set({
          active: {
            ...active,
            exercises: active.exercises.map((ex, i) =>
              i !== ei || ex.sets.length <= 1 ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== si) }
            ),
          },
        });
      },

      /** Remplace un exercice par une alternative choisie (aucune série de travail validée). */
      swapExerciseTo: (ei, slug) => {
        const { active, history, profile } = get();
        if (!active) return false;
        const current = active.exercises[ei];
        const alt = EXERCISE_BY_SLUG[slug];
        if (!current || !alt || current.sets.some((s) => s.done)) return false;

        const planned = buildPlannedExercise(alt, { goal: active.goal, history, profile }, { sets: current.sets.length });
        set({ active: { ...active, exercises: active.exercises.map((ex, i) => (i === ei ? toActive(planned) : ex)) } });
        return true;
      },

      startRest: (seconds, label) => set({ restEndsAt: Date.now() + seconds * 1000, restTotal: seconds, restLabel: label }),

      adjustRest: (delta) => {
        const { restEndsAt, restTotal } = get();
        if (!restEndsAt) return;
        set({ restEndsAt: restEndsAt + delta * 1000, restTotal: Math.max(5, restTotal + delta) });
      },

      stopRest: () => set({ restEndsAt: null }),

      finishWorkout: () => {
        const { active, history } = get();
        if (!active) return null;
        const summary = buildSummary(active, history);
        if (summary.session.sets === 0) return null;
        set({ history: [summary.session, ...history], active: null, restEndsAt: null });
        void syncSession(summary.session);
        return summary;
      },

      cancelWorkout: () => set({ active: null, restEndsAt: null }),

      addBodyWeight: (weightKg, date = dayKey(new Date())) => {
        set((s) => ({
          bodyMetrics: [...s.bodyMetrics.filter((m) => m.date !== date), { date, weightKg }].sort((a, b) => a.date.localeCompare(b.date)),
          profile: { ...s.profile, weightKg },
        }));
        void syncBodyWeight(date, weightKg);
      },

      addMeal: (entry) => set((s) => ({ meals: [...s.meals, { ...entry, id: uid() }].slice(-2000) })),

      removeMeal: (id) => set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),

      setPlan: (plan) => set({ plan, shoppingChecked: {} }),

      toggleShopping: (key) => set((s) => ({ shoppingChecked: { ...s.shoppingChecked, [key]: !s.shoppingChecked[key] } })),

      resetShopping: () => set({ shoppingChecked: {} }),
    }),
    {
      name: 'fitpulse-store-v1',
      version: 3,
      partialize: (s) => ({
        history: s.history,
        bodyMetrics: s.bodyMetrics,
        profile: s.profile,
        active: s.active,
        restEndsAt: s.restEndsAt,
        restTotal: s.restTotal,
        restLabel: s.restLabel,
        meals: s.meals,
        plan: s.plan,
        shoppingChecked: s.shoppingChecked,
      }),
      // Anciennes versions : "prefs" (v1) puis profil à 8 équipements (v2) deviennent le profil complet (historique conservé).
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          const prefs = (old.prefs ?? {}) as Record<string, unknown>;
          const { prefs: _unused, ...rest } = old;
          void _unused;
          return {
            ...rest,
            profile: sanitizeProfile({ name: prefs.name, goal: prefs.goal, duration: prefs.duration, weightKg: prefs.weightKg }),
          } as never;
        }
        return { ...old, profile: sanitizeProfile(old.profile) } as never;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        const active = p.active
          ? { ...p.active, exercises: p.active.exercises.map((ex) => ({ ...ex, warmups: ex.warmups ?? [] })) }
          : null;
        return { ...current, ...p, active, profile: sanitizeProfile(p.profile) };
      },
    }
  )
);

/** Évite les erreurs d'hydratation : false au premier rendu, true une fois monté côté client. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
