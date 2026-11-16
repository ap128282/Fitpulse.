// FitPulse : moteur de progression et de génération de séance (déterministe, sans appel réseau).
// Gemini (lib/gemini.ts) propose la structure de la séance ; les charges viennent toujours d'ici.

import { canDo, EXERCISE_BY_SLUG, EXERCISES } from './exercises';
import { capabilitiesFor, ownedIds, weightsFor } from './equipment';
import { GOAL_LABEL, MUSCLE_LABEL } from './profile';
import type {
  AIPlan,
  Capability,
  Exercise,
  Focus,
  Goal,
  GearType,
  HistorySession,
  Level,
  LoggedSet,
  Mechanic,
  Muscle,
  PlannedExercise,
  PlannedSet,
  PlannedWorkout,
  SensitiveArea,
  Sport,
  Technique,
  UserProfile,
} from './types';

export * from './types';
export { EXERCISES, EXERCISE_BY_SLUG, exerciseImages, GEAR_LABEL, canDo } from './exercises';
export { DURATIONS, DURATION_MAX, DURATION_MIN, durationLabel, GOAL_LABEL, MUSCLE_LABEL } from './profile';

export const FOCUS_LABEL: Record<Focus, string> = {
  push: 'Push (pecs, épaules, triceps)',
  pull: 'Pull (dos, biceps)',
  legs: 'Jambes',
  upper: 'Haut du corps',
  lower: 'Bas du corps',
  full: 'Full body',
};

export const FOCUS_SHORT: Record<Focus, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Jambes',
  upper: 'Haut du corps',
  lower: 'Bas du corps',
  full: 'Full body',
};

export const TECHNIQUE_LABEL: Record<Technique, string> = {
  excentrique: 'Excentrique',
  concentrique: 'Concentrique',
  isometrique: 'Isométrique',
  proprioception: 'Proprioception',
};

export const TECHNIQUE_HELP: Record<Technique, string> = {
  excentrique: 'Phase de descente lente et contrôlée : elle renforce les tendons et protège dans les descentes.',
  concentrique: 'Phase de montée puissante : elle développe la force et l\'explosivité.',
  isometrique: 'Maintien sans bouger : il renforce aux angles précis et améliore l\'endurance de position.',
  proprioception: 'Équilibre et contrôle articulaire : ils stabilisent chevilles, genoux et hanches.',
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

export function roundStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Number((Math.round(value / step) * step).toFixed(2));
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** 1RM théorique (Epley) en tenant compte des reps en réserve : reps réelles = reps + RIR. */
export function epley1RM(weight: number, reps: number, rir = 0): number {
  if (weight <= 0 || reps <= 0) return 0;
  const effective = reps + Math.max(0, rir);
  if (effective <= 1) return weight;
  return Number((weight * (1 + effective / 30)).toFixed(1));
}

export function repRangeFor(goal: Goal, mechanic: Mechanic): [number, number] {
  const poly = mechanic === 'polyarticulaire';
  if (goal === 'masse') return poly ? [6, 10] : [10, 15];
  if (goal === 'affinement') return poly ? [8, 12] : [12, 15];
  if (goal === 'performance') return poly ? [5, 8] : [8, 12];
  if (goal === 'pompiers') return poly ? [12, 20] : [15, 25];
  return poly ? [10, 15] : [12, 20];
}

/** Fourchette adaptée à l'exercice (les maintiens sont exprimés en secondes). */
export function repRangeForExercise(e: Pick<Exercise, 'unit' | 'technique' | 'mechanic'>, goal: Goal): [number, number] {
  if (e.unit === 'sec') {
    if (goal === 'pompiers') return [40, 75];
    if (e.technique === 'proprioception') return [20, 40];
    return [20, 45];
  }
  return repRangeFor(goal, e.mechanic);
}

export function setsFor(goal: Goal, mechanic: Mechanic): number {
  if (goal === 'masse' && mechanic === 'polyarticulaire') return 4;
  return 3;
}

export function ownedCapabilities(profile: UserProfile): Capability[] {
  return capabilitiesFor(ownedIds(profile));
}

/** Exercices réalisables avec le matériel du lieu choisi. */
export function availableExercises(profile: UserProfile): Exercise[] {
  const caps = ownedCapabilities(profile);
  return EXERCISES.filter((e) => canDo(e, caps));
}

/** Poids réellement disponibles à la maison (vide = pas de contrainte : salle, machines, poulies). */
export function availableWeightsFor(gear: GearType, profile: UserProfile): number[] {
  if (profile.place !== 'maison') return [];
  if (gear === 'halteres') return weightsFor(profile, 'dumbbell');
  if (gear === 'kettlebell') return weightsFor(profile, 'kettlebell');
  return [];
}

const AREA_RISK: Record<SensitiveArea, string[]> = {
  genoux: ['saut-sur-box', 'squat-saute', 'fentes-marchees', 'fentes-statiques-halteres', 'fentes-arriere-halteres', 'squat-unipodal-box', 'burpees', 'hack-squat', 'montee-sur-banc'],
  dos: ['souleve-de-terre', 'souleve-de-terre-roumain', 'souleve-de-terre-trap-bar', 'rowing-barre', 'good-morning-elastique', 'squat-barre', 'squat-tempo-barre', 'burpees'],
  epaules: ['developpe-militaire-barre', 'developpe-epaules-halteres', 'developpe-epaules-machine', 'dips-sur-banc', 'pompes-pieds-sureleves', 'developpe-incline-barre'],
  poignets: ['pompes', 'pompes-pieds-sureleves', 'pompes-prise-serree', 'curl-barre', 'burpees', 'mountain-climbers', 'planche'],
  chevilles: ['saut-sur-box', 'squat-saute', 'burpees', 'mollets-excentriques-unipodal', 'fentes-laterales'],
  hanches: ['fentes-laterales', 'squat-barre', 'souleve-de-terre-trap-bar', 'fente-isometrique'],
  coudes: ['barre-au-front', 'dips-sur-banc', 'extension-triceps-haltere', 'curl-barre', 'pompes-prise-serree', 'developpe-couche-serre'],
};

function riskySlugs(profile: UserProfile): Set<string> {
  return new Set(profile.sensitiveAreas.flatMap((a) => AREA_RISK[a]));
}

// ---------------------------------------------------------------------------
// 1. Surcharge progressive pilotée par le RIR
// ---------------------------------------------------------------------------

export interface NextTarget {
  weight: number;
  reps: number;
  reason: string;
}

export interface NextOptions {
  /** Pas de progression en répétitions (5 pour un maintien en secondes). */
  repStep?: number;
  /** Maintien isométrique : on allonge la durée plutôt que d'ajouter du poids. */
  hold?: boolean;
}

/**
 * RIR 0  : échec -> on consolide (même charge, mêmes reps). Sous le bas de fourchette : -5 %.
 * RIR 1-2: zone optimale -> +1 rep ; en haut de fourchette -> +charge et retour au bas de fourchette.
 * RIR 3+ : trop facile -> +5 % (RIR 3) ou +10 % (RIR 4+), au moins un incrément.
 */
export function computeNextTarget(prev: LoggedSet, step: number, repRange: [number, number], opts: NextOptions = {}): NextTarget {
  const [min, max] = repRange;
  const repStep = opts.repStep ?? 1;
  const { weight, reps } = prev;
  const rir = Math.max(0, prev.rir);
  const bodyweight = weight <= 0;
  const bump = (pct: number) => Math.max(step, roundStep(weight * pct, step));

  if (rir === 0) {
    if (reps < min) {
      const w = bodyweight ? 0 : roundStep(weight * 0.95, step);
      return { weight: w, reps: min, reason: 'Échec sous la fourchette : charge réduite de 5 %' };
    }
    return { weight, reps, reason: 'Échec atteint : on consolide la même charge' };
  }

  if (rir <= 2) {
    if (reps >= max) {
      if (opts.hold) return { weight: 0, reps: reps + repStep, reason: 'Haut de fourchette atteint : maintien prolongé' };
      return {
        weight: bodyweight ? step : Number((weight + bump(0.025)).toFixed(2)),
        reps: min,
        reason: 'Haut de fourchette atteint avec RIR optimal : on augmente la charge',
      };
    }
    return { weight, reps: reps + repStep, reason: opts.hold ? 'RIR optimal : +5 secondes' : 'RIR optimal : +1 répétition' };
  }

  if (bodyweight) return { weight: 0, reps: reps + 2 * repStep, reason: opts.hold ? 'Trop facile : +10 secondes' : 'Trop facile : +2 répétitions' };
  const pct = rir >= 4 ? 0.1 : 0.05;
  return {
    weight: Number((weight + bump(pct)).toFixed(2)),
    reps: Math.min(Math.max(reps, min), max),
    reason: rir >= 4 ? 'Beaucoup trop facile : +10 % de charge' : 'Trop facile : +5 % de charge',
  };
}

function nearest(target: number, sorted: number[]): number {
  return sorted.reduce((best, w) => (Math.abs(w - target) < Math.abs(best - target) ? w : best), sorted[0]);
}

/** Ramène la cible sur les poids réellement possédés (haltères / kettlebells à la maison). */
export function applyAvailability(target: NextTarget, prev: { weight: number; reps: number }, available: number[]): NextTarget {
  if (available.length === 0 || target.weight <= 0) return target;
  const sorted = [...available].sort((a, b) => a - b);
  let w = nearest(target.weight, sorted);

  if (target.weight > prev.weight && w <= prev.weight) {
    const up = sorted.find((x) => x > prev.weight);
    if (up && up <= prev.weight * 1.25) w = up;
    else return { weight: prev.weight, reps: prev.reps + 1, reason: 'Pas de charge supérieure disponible : +1 répétition' };
  }
  if (target.weight < prev.weight && w >= prev.weight) {
    const down = [...sorted].reverse().find((x) => x < prev.weight);
    w = down ?? prev.weight;
  }
  return { ...target, weight: w };
}

interface ExerciseLike {
  step: number;
  repRange: [number, number];
  gear: GearType;
  unit?: 'sec';
}

/** Cible de la prochaine séance, en tenant compte du matériel disponible. */
export function suggestNext(prev: LoggedSet, ex: ExerciseLike, profile?: UserProfile): NextTarget {
  const base = computeNextTarget(prev, ex.step, ex.repRange, { repStep: ex.unit === 'sec' ? 5 : 1, hold: ex.unit === 'sec' });
  return profile ? applyAvailability(base, prev, availableWeightsFor(ex.gear, profile)) : base;
}

// ---------------------------------------------------------------------------
// 1 bis. Ajustement en temps réel pendant la séance (autorégulation par le 1RM estimé)
// ---------------------------------------------------------------------------

export interface Adjustment {
  weight: number;
  reps: number;
  message: string;
}

const fmtKg = (n: number) => String(Number(n.toFixed(2)));

/**
 * Compare la série réalisée à l'objectif et ajuste les séries suivantes :
 * - trop bas (ex : 2 reps au lieu de 10, proche de l'échec) : la charge est recalculée pour retrouver
 *   le nombre de répétitions visé avec 2 reps en réserve (1RM estimé, limité à -20 %) ;
 * - trop facile (RIR 3 ou plus) : la charge monte (limitée à +10 %) ;
 * - dans la zone : aucun changement.
 */
export function autoregulate(done: LoggedSet, target: PlannedSet, ex: ExerciseLike, profile: UserProfile): Adjustment | null {
  const hold = ex.unit === 'sec';
  const repStep = hold ? 5 : 1;
  const unit = hold ? 's' : 'reps';
  const missed = done.reps < target.reps - (hold ? 5 : 1) && done.rir <= 1;
  const tooEasy = done.reps >= target.reps && done.rir >= 3;
  if (!missed && !tooEasy) return null;

  // Poids du corps et maintiens : on ajuste le nombre de répétitions (ou de secondes).
  if (done.weight <= 0) {
    if (missed) {
      const next = hold ? Math.max(10, Math.round(done.reps / 5) * 5) : Math.max(1, done.reps + (done.rir === 0 ? 0 : 1));
      if (next >= target.reps) return null;
      return {
        weight: 0,
        reps: next,
        message: `${done.reps} ${unit} au lieu de ${target.reps} : objectif des prochaines séries ramené à ${next} ${unit}.`,
      };
    }
    const next = target.reps + 2 * repStep;
    return { weight: 0, reps: next, message: `RIR ${done.rir} : trop facile, objectif relevé à ${next} ${unit}.` };
  }

  // Charges : 1RM estimé -> charge permettant l'objectif avec 2 reps en réserve.
  const e1rm = epley1RM(done.weight, done.reps, done.rir);
  let w = e1rm / (1 + (target.reps + 2) / 30);
  w = clamp(w, done.weight * 0.8, done.weight * 1.1);
  w = roundStep(w, ex.step);
  const available = availableWeightsFor(ex.gear, profile);
  if (available.length > 0) w = nearest(w, [...available].sort((a, b) => a - b));

  if (missed) {
    if (w < done.weight) {
      return {
        weight: w,
        reps: target.reps,
        message: `${done.reps} reps au lieu de ${target.reps} : charge ajustée de ${fmtKg(done.weight)} à ${fmtKg(w)} kg pour les prochaines séries.`,
      };
    }
    const next = Math.max(1, Math.min(target.reps, done.reps + 1));
    return {
      weight: done.weight,
      reps: next,
      message: `${done.reps} reps au lieu de ${target.reps} : objectif des prochaines séries ramené à ${next} reps.`,
    };
  }

  if (w > done.weight) {
    return {
      weight: w,
      reps: target.reps,
      message: `RIR ${done.rir} : série trop facile, charge relevée de ${fmtKg(done.weight)} à ${fmtKg(w)} kg.`,
    };
  }
  const next = target.reps + 2;
  return { weight: done.weight, reps: next, message: `RIR ${done.rir} : série trop facile, objectif relevé à ${next} reps.` };
}

// ---------------------------------------------------------------------------
// 2. Minuteur de repos dynamique
// ---------------------------------------------------------------------------

export function restSeconds(mechanic: Mechanic, rir: number | null, goal: Goal): number {
  let base = mechanic === 'polyarticulaire' ? 150 : 75;
  const r = rir ?? 2;
  if (r <= 0) base *= 1.4;
  else if (r >= 3) base *= 0.7;
  if (goal === 'tonification') base *= 0.85;
  if (goal === 'affinement') base *= 0.9;
  if (goal === 'pompiers') base *= 0.5;
  const min = goal === 'pompiers' ? 30 : 45;
  return Math.min(300, Math.max(min, Math.round(base / 5) * 5));
}

/** Repos après une série d'échauffement. */
export const WARMUP_REST_SECONDS = 30;

// ---------------------------------------------------------------------------
// 3. Calculateur de plaques
// ---------------------------------------------------------------------------

export const BAR_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const DUMBBELL_PLATES = [10, 5, 2.5, 1.25, 0.5];

export interface PlateResult {
  valid: boolean;
  perSide: number;
  plates: number[];
  remainder: number;
}

export function plateBreakdown(total: number, bar: number, available: number[] = BAR_PLATES): PlateResult {
  if (total < bar) return { valid: false, perSide: 0, plates: [], remainder: 0 };
  let perSide = (total - bar) / 2;
  const target = perSide;
  const plates: number[] = [];
  for (const p of [...available].sort((a, b) => b - a)) {
    while (perSide + 1e-9 >= p) {
      plates.push(p);
      perSide -= p;
    }
  }
  return { valid: true, perSide: target, plates, remainder: Number((perSide * 2).toFixed(2)) };
}

// ---------------------------------------------------------------------------
// 4. Échauffement et construction d'un exercice planifié
// ---------------------------------------------------------------------------

const LEVEL_FACTOR: Record<Level, number> = { debutant: 0.75, intermediaire: 1, avance: 1.2 };
const BODYWEIGHT_REPS: Record<Level, number> = { debutant: 8, intermediaire: 12, avance: 15 };

/**
 * Échauffement spécifique à l'exercice : séries progressives (50 % puis 70 % de la charge de travail sur les
 * polyarticulaires, 50 % sur l'isolation), séries légères au poids du corps, demi-durée pour les maintiens.
 */
export function buildWarmups(e: Pick<Exercise, 'unit' | 'mechanic' | 'step' | 'gear'>, work: PlannedSet, profile: UserProfile): PlannedSet[] {
  if (e.unit === 'sec') return [{ weight: 0, reps: Math.max(10, Math.round((work.reps * 0.5) / 5) * 5) }];
  if (work.weight <= 0) return [{ weight: 0, reps: Math.max(3, Math.round(work.reps * 0.5)) }];

  const available = availableWeightsFor(e.gear, profile);
  const sorted = [...available].sort((a, b) => a - b);
  const at = (fraction: number) => {
    let w = roundStep(work.weight * fraction, e.step);
    if (sorted.length > 0) w = nearest(w, sorted);
    return w;
  };

  const wanted: PlannedSet[] =
    e.mechanic === 'polyarticulaire'
      ? [{ weight: at(0.5), reps: 8 }, { weight: at(0.7), reps: 4 }]
      : [{ weight: at(0.5), reps: 10 }];

  const out: PlannedSet[] = [];
  for (const s of wanted) {
    if (s.weight <= 0 || s.weight >= work.weight) continue;
    if (out.length > 0 && out[out.length - 1].weight === s.weight) continue;
    out.push(s);
  }
  if (out.length === 0) out.push({ weight: work.weight, reps: Math.max(5, Math.round(work.reps * 0.5)) });
  return out;
}

export interface BuildCtx {
  goal: Goal;
  history: HistorySession[];
  profile: UserProfile;
}

export interface BuildOverrides {
  sets?: number;
  repRange?: [number, number];
  restSeconds?: number;
  note?: string;
  tempo?: string;
}

function findLastSets(history: HistorySession[], slug: string): LoggedSet[] | null {
  for (const s of history) {
    const found = s.exercises.find((e) => e.slug === slug);
    if (found && found.sets.length > 0) return found.sets;
  }
  return null;
}

export function buildPlannedExercise(e: Exercise, ctx: BuildCtx, over: BuildOverrides = {}): PlannedExercise {
  const { goal, history, profile } = ctx;
  const range = over.repRange ?? repRangeForExercise(e, goal);
  const nSets = over.sets ?? setsFor(goal, e.mechanic);
  const available = availableWeightsFor(e.gear, profile);
  const hold = e.unit === 'sec';
  const opts: NextOptions = { repStep: hold ? 5 : 1, hold };
  const lastSets = findLastSets(history, e.slug);
  const sets: PlannedSet[] = [];
  let reason: string;

  if (lastSets) {
    let firstReason = '';
    for (let i = 0; i < nSets; i++) {
      const prev = lastSets[Math.min(i, lastSets.length - 1)];
      const t = applyAvailability(computeNextTarget(prev, e.step, range, opts), prev, available);
      if (i === 0) firstReason = t.reason;
      sets.push({ weight: t.weight, reps: t.reps });
    }
    reason = firstReason;
  } else {
    const bwRatio = clamp(profile.weightKg / 75, 0.6, 1.5);
    let weight = e.startKg === 0 ? 0 : Math.max(e.step, roundStep(e.startKg * bwRatio * LEVEL_FACTOR[profile.level], e.step));
    if (weight > 0 && available.length > 0) weight = nearest(weight, [...available].sort((a, b) => a - b));
    const reps = hold
      ? range[0]
      : e.startKg === 0
      ? clamp(BODYWEIGHT_REPS[profile.level], range[0], range[1])
      : Math.min(range[1], range[0] + (profile.level === 'debutant' ? 0 : 1));
    for (let i = 0; i < nSets; i++) sets.push({ weight, reps });
    reason = hold ? 'Première fois : vise une durée tenable avec 2 secondes de marge' : 'Première fois : charge de départ estimée, vise un RIR de 2';
  }

  return {
    slug: e.slug,
    name: e.name,
    muscle: e.muscle,
    gear: e.gear,
    mechanic: e.mechanic,
    step: e.step,
    repRange: range,
    warmups: buildWarmups(e, sets[0], profile),
    sets,
    reason,
    restSeconds: over.restSeconds ?? (e.unit === 'sec' ? 45 : restSeconds(e.mechanic, 2, goal)),
    imageId: e.imageId,
    cue: e.cue,
    unit: e.unit,
    technique: e.technique,
    tempo: over.tempo ?? e.tempo,
    note: over.note,
  };
}

export function estimateMinutes(exercises: PlannedExercise[]): number {
  const seconds = exercises.reduce(
    (acc, e) => acc + e.sets.length * (40 + e.restSeconds) + e.warmups.length * (25 + WARMUP_REST_SECONDS) + 45,
    0
  );
  return Math.round((seconds + 120) / 60);
}

// ---------------------------------------------------------------------------
// 5. Génération locale de séance
// ---------------------------------------------------------------------------

const FOCUS_SLOTS: Record<Focus, Muscle[]> = {
  push: ['pectoraux', 'epaules', 'pectoraux', 'triceps', 'epaules', 'triceps'],
  pull: ['dos', 'dos', 'biceps', 'epaules', 'biceps', 'abdos'],
  legs: ['quadriceps', 'ischios', 'fessiers', 'quadriceps', 'mollets', 'ischios', 'abdos'],
  lower: ['quadriceps', 'ischios', 'fessiers', 'quadriceps', 'mollets', 'ischios', 'abdos'],
  upper: ['pectoraux', 'dos', 'epaules', 'biceps', 'triceps', 'pectoraux', 'dos'],
  full: ['quadriceps', 'pectoraux', 'dos', 'epaules', 'ischios', 'abdos', 'biceps', 'triceps'],
};

/** Muscles complémentaires travaillés pour garder l'équilibre quand un seul muscle est ciblé. */
const BALANCE: Record<Muscle, Muscle[]> = {
  pectoraux: ['dos', 'epaules', 'triceps'],
  dos: ['pectoraux', 'biceps', 'epaules'],
  epaules: ['dos', 'triceps', 'pectoraux'],
  biceps: ['triceps', 'dos'],
  triceps: ['biceps', 'pectoraux'],
  quadriceps: ['ischios', 'fessiers', 'mollets'],
  ischios: ['quadriceps', 'fessiers', 'mollets'],
  fessiers: ['ischios', 'quadriceps', 'mollets'],
  mollets: ['quadriceps', 'ischios', 'fessiers'],
  abdos: ['dos', 'fessiers', 'epaules'],
};

const MUSCLE_FOCUS: Record<Muscle, Focus> = {
  pectoraux: 'push', epaules: 'push', triceps: 'push',
  dos: 'pull', biceps: 'pull',
  quadriceps: 'legs', ischios: 'legs', fessiers: 'legs', mollets: 'legs',
  abdos: 'full',
};

const LOWER_BODY: Muscle[] = ['quadriceps', 'ischios', 'fessiers', 'mollets'];
const SMALL_MUSCLES: Muscle[] = ['biceps', 'triceps', 'mollets', 'abdos'];
const LEG_SPORTS: Sport[] = ['trail', 'running', 'cyclisme', 'football', 'rugby'];

export const FOCUS_ROTATION: Focus[] = ['push', 'pull', 'legs'];

export function nextFocus(last?: Focus): Focus {
  if (!last) return 'push';
  const i = FOCUS_ROTATION.indexOf(last);
  if (i === -1) return 'push';
  return FOCUS_ROTATION[(i + 1) % FOCUS_ROTATION.length];
}

/** Focus conseillé : full body pour les pompiers, alternance jambes / haut / full pour un sport d'endurance. */
export function suggestedFocus(profile: UserProfile, history: HistorySession[]): Focus {
  if (profile.goal === 'pompiers') return 'full';
  if (profile.goal === 'performance' && LEG_SPORTS.includes(profile.sport)) {
    const order: Focus[] = ['legs', 'upper', 'full'];
    const last = history[0]?.focus;
    const i = last ? order.indexOf(last) : -1;
    return order[(i + 1) % order.length];
  }
  return nextFocus(history[0]?.focus);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function exerciseSeconds(e: Exercise, goal: Goal): number {
  const sets = setsFor(goal, e.mechanic);
  const rest = e.unit === 'sec' ? 45 : restSeconds(e.mechanic, 2, goal);
  const warm = e.mechanic === 'polyarticulaire' && e.startKg > 0 ? 2 : 1;
  return sets * (40 + rest) + warm * (25 + WARMUP_REST_SECONDS) + 45;
}

export interface GenerateOptions {
  focus: Focus;
  /** Durée exacte de la séance en minutes (libre). */
  duration: number;
  goal: Goal;
  profile: UserProfile;
  /** Cible un seul muscle : séance centrée dessus, complétée par les muscles antagonistes ou stabilisateurs. */
  targetMuscle?: Muscle;
  /** Historique, séance la plus récente en premier. */
  history?: HistorySession[];
  seed?: number;
}

export function generateWorkout(opts: GenerateOptions): PlannedWorkout {
  const { duration, goal, profile, targetMuscle } = opts;
  const history = opts.history ?? [];
  const rand = mulberry32(opts.seed ?? Date.now());
  const caps = ownedCapabilities(profile);
  const risky = riskySlugs(profile);
  const focus = targetMuscle ? MUSCLE_FOCUS[targetMuscle] : opts.focus;

  const recency = new Map<string, number>();
  history.slice(0, 3).forEach((s, idx) => {
    const penalty = idx === 0 ? 3 : idx === 1 ? 1.5 : 0.8;
    s.exercises.forEach((e) => recency.set(e.slug, Math.max(recency.get(e.slug) ?? 0, penalty)));
  });
  const lastGearByMuscle = new Map<Muscle, GearType>();
  for (const s of history.slice(0, 2)) {
    for (const e of s.exercises) {
      const meta = EXERCISE_BY_SLUG[e.slug];
      if (meta && !lastGearByMuscle.has(meta.muscle)) lastGearByMuscle.set(meta.muscle, meta.gear);
    }
  }

  // Créneaux : soit les muscles du focus, soit un muscle ciblé avec ses muscles d'équilibre.
  let slots: Muscle[];
  if (targetMuscle) {
    // ~65 % des créneaux sur le muscle ciblé, le reste sur les muscles complémentaires, entrelacés
    // pour que l'équilibre soit garanti même si la séance est courte.
    const total = clamp(Math.round((duration * 60 - 150) / 480), 3, 9);
    const targetCount = Math.max(2, Math.round(total * 0.65));
    const balance = BALANCE[targetMuscle];
    const bList: Muscle[] = [];
    for (let i = 0; i < Math.max(1, total - targetCount); i++) bList.push(balance[i % balance.length]);
    if (targetMuscle !== 'abdos' && total >= 6) bList.push('abdos');
    slots = [];
    let bi = 0;
    for (let k = 0; k < targetCount; k++) {
      slots.push(targetMuscle);
      if (k % 2 === 0 && bi < bList.length) slots.push(bList[bi++]);
    }
    while (bi < bList.length) slots.push(bList[bi++]);
  } else {
    const base = FOCUS_SLOTS[focus];
    const priority = profile.priorityMuscles.filter((m) => base.includes(m));
    slots = [...base, ...priority].sort((a, b) => Number(priority.includes(b)) - Number(priority.includes(a)));
  }

  const budget = duration * 60 - 150;
  const chosen: Exercise[] = [];
  let used = 0;
  const chosenCount = (m: Muscle) => chosen.filter((c) => c.muscle === m).length;

  const score = (e: Exercise, wantPoly: boolean): number => {
    let s = rand();
    s -= recency.get(e.slug) ?? 0;
    if (lastGearByMuscle.get(e.muscle) === e.gear) s -= 0.8;
    s -= chosen.filter((c) => c.gear === e.gear).length * 0.5;
    s += (e.mechanic === 'polyarticulaire') === wantPoly ? 2 : 0;
    if (goal === 'pompiers' && e.conditioning) s += 1.5;
    if (e.sports?.includes(profile.sport)) s += 2;
    if (risky.has(e.slug)) s -= 3;
    return s;
  };

  const tryAdd = (muscle: Muscle): boolean => {
    // Muscle ciblé : 2 polyarticulaires puis de l'isolation. Muscles d'équilibre : isolation pour les petits muscles.
    const wantPoly = targetMuscle === muscle ? chosenCount(muscle) < 2 : chosenCount(muscle) === 0 && !(targetMuscle && SMALL_MUSCLES.includes(muscle));
    const fitting = EXERCISES.filter((e) => e.muscle === muscle && !chosen.includes(e) && canDo(e, caps))
      .map((e) => ({ e, score: score(e, wantPoly), cost: exerciseSeconds(e, goal) }))
      .filter((c) => used + c.cost <= budget)
      .sort((a, b) => b.score - a.score);
    if (fitting.length === 0) return false;
    chosen.push(fitting[0].e);
    used += fitting[0].cost;
    return true;
  };

  for (const muscle of slots) tryAdd(muscle);

  // Deuxième passage : matériel limité ou séance longue, on complète tant qu'il reste du temps.
  if (used < budget * 0.75) {
    for (const muscle of slots) {
      if (used >= budget * 0.9) break;
      tryAdd(muscle);
    }
  }

  // Sports d'endurance : séance jambes = au moins un travail excentrique, isométrique et de proprioception.
  const legSession = focus === 'legs' || focus === 'lower' || focus === 'full' || (targetMuscle ? LOWER_BODY.includes(targetMuscle) : false);
  if (legSession && LEG_SPORTS.includes(profile.sport) && goal !== 'pompiers') {
    const wanted: Technique[] = profile.sport === 'trail' || profile.sport === 'running' ? ['excentrique', 'isometrique', 'proprioception'] : ['proprioception'];
    for (const technique of wanted) {
      if (chosen.some((c) => c.technique === technique)) continue;
      const options = EXERCISES.filter(
        (e) => e.technique === technique && e.sports?.includes(profile.sport) && !chosen.includes(e) && canDo(e, caps) && !risky.has(e.slug)
      )
        .map((e) => ({ e, cost: exerciseSeconds(e, goal), r: rand() }))
        .filter((c) => used + c.cost <= budget * 1.12)
        .sort((a, b) => a.r - b.r);
      if (options.length > 0) {
        chosen.push(options[0].e);
        used += options[0].cost;
      }
    }
  }

  if (chosen.length < 2) {
    for (const e of EXERCISES) {
      if (canDo(e, caps) && !chosen.includes(e)) chosen.push(e);
      if (chosen.length >= 3) break;
    }
  }

  const ctx: BuildCtx = { goal, history, profile };
  const exercises = chosen.map((e) => buildPlannedExercise(e, ctx));
  const label = targetMuscle ? MUSCLE_LABEL[targetMuscle] : FOCUS_SHORT[focus];
  return {
    name: `${label} · ${GOAL_LABEL[goal]}`,
    focus,
    goal,
    duration,
    estimatedMin: estimateMinutes(exercises),
    exercises,
  };
}

/** Alternatives classées pour un exercice : même muscle, mécanique proche, matériel disponible, pas déjà dans la séance. */
export function alternativesFor(
  current: { slug: string; muscle: Muscle; mechanic: Mechanic; technique?: Technique },
  inWorkout: string[],
  profile: UserProfile,
  limit = 5,
  seed = Date.now()
): Exercise[] {
  const caps = ownedCapabilities(profile);
  const risky = riskySlugs(profile);
  const rand = mulberry32(seed);
  return EXERCISES.filter((e) => e.muscle === current.muscle && e.slug !== current.slug && !inWorkout.includes(e.slug) && canDo(e, caps))
    .map((e) => {
      let s = rand();
      if (e.mechanic === current.mechanic) s += 2;
      if (current.technique && e.technique === current.technique) s += 1;
      if (e.sports?.includes(profile.sport)) s += 0.5;
      if (risky.has(e.slug)) s -= 3;
      return { e, s };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.e);
}

export function pickAlternative(
  current: { slug: string; muscle: Muscle; mechanic: Mechanic; technique?: Technique },
  inWorkout: string[],
  profile: UserProfile,
  seed = Date.now()
): Exercise | null {
  return alternativesFor(current, inWorkout, profile, 1, seed)[0] ?? null;
}

// ---------------------------------------------------------------------------
// 6. Séance construite à partir d'un plan proposé par Gemini
// ---------------------------------------------------------------------------

export function buildWorkoutFromPlan(
  plan: AIPlan,
  opts: { goal: Goal; duration: number; profile: UserProfile; history: HistorySession[] }
): PlannedWorkout | null {
  const caps = ownedCapabilities(opts.profile);
  const ctx: BuildCtx = { goal: opts.goal, history: opts.history, profile: opts.profile };
  const seen = new Set<string>();
  const exercises: PlannedExercise[] = [];

  for (const item of plan.exercises) {
    const e = EXERCISE_BY_SLUG[item.slug];
    if (!e || seen.has(e.slug) || !canDo(e, caps)) continue;
    seen.add(e.slug);
    const hold = e.unit === 'sec';
    const min = clamp(Math.round(item.repMin), hold ? 10 : 3, hold ? 180 : 40);
    const max = clamp(Math.round(item.repMax), min, hold ? 180 : 40);
    exercises.push(
      buildPlannedExercise(e, ctx, {
        sets: clamp(Math.round(item.sets), 2, 6),
        repRange: [min, max],
        restSeconds: item.restSeconds ? clamp(Math.round(item.restSeconds), 20, 300) : undefined,
        note: item.note,
        tempo: item.tempo,
      })
    );
  }
  if (exercises.length < 2) return null;

  return {
    name: plan.name.slice(0, 60) || `${FOCUS_SHORT[plan.focus]} · ${GOAL_LABEL[opts.goal]}`,
    focus: plan.focus,
    goal: opts.goal,
    duration: opts.duration,
    estimatedMin: estimateMinutes(exercises),
    exercises,
  };
}

// ---------------------------------------------------------------------------
// 7. Lecture d'une demande en langage naturel (coach hors-ligne)
// ---------------------------------------------------------------------------

export interface CoachIntent {
  /** Durée exacte demandée, en minutes. */
  duration?: number;
  goal?: Goal;
  focus?: Focus;
  /** Un seul muscle ciblé (« que les biceps »). */
  muscle?: Muscle;
}

const MUSCLE_WORDS: [RegExp, Muscle][] = [
  [/pec|poitrine/, 'pectoraux'],
  [/\bdos\b|dorsaux/, 'dos'],
  [/épaule|epaule|deltoïde|deltoide/, 'epaules'],
  [/biceps/, 'biceps'],
  [/triceps/, 'triceps'],
  [/quadri|cuisses/, 'quadriceps'],
  [/ischio/, 'ischios'],
  [/fessier/, 'fessiers'],
  [/mollet/, 'mollets'],
  [/abdo|gainage/, 'abdos'],
];

export function parseCoachRequest(text: string): CoachIntent {
  const t = text.toLowerCase();
  const out: CoachIntent = {};

  let minutes: number | undefined;
  const hm = t.match(/(\d+)\s*h\s*(\d+)?/);
  if (hm) minutes = parseInt(hm[1], 10) * 60 + (hm[2] ? parseInt(hm[2], 10) : 0);
  else {
    const m = t.match(/(\d+)\s*(min|mn|minutes)/);
    if (m) minutes = parseInt(m[1], 10);
    else if (/demi[- ]heure/.test(t)) minutes = 30;
    else if (/une heure|1 heure/.test(t)) minutes = 60;
  }
  if (minutes) out.duration = clamp(minutes, 15, 150);

  if (/pompier|bspp|sapeur/.test(t)) out.goal = 'pompiers';
  else if (/trail|performance|sport/.test(t)) out.goal = 'performance';
  else if (/affin|sèche|seche|perte|définition|definition|minceur|gras/.test(t)) out.goal = 'affinement';
  else if (/tonif|toni|ferme/.test(t)) out.goal = 'tonification';
  else if (/mass|prise|volume|muscle|gros|hypertrophie/.test(t)) out.goal = 'masse';

  const single = /(que|uniquement|seulement|juste|focus|spécial|special|cibl)/.test(t);
  const hits = MUSCLE_WORDS.filter(([re]) => re.test(t)).map(([, m]) => m);
  if (hits.length === 1 && (single || !/haut|bas|full|complet|jambe|push|pull/.test(t))) out.muscle = hits[0];

  if (/haut du corps|upper/.test(t)) out.focus = 'upper';
  else if (/bas du corps|lower/.test(t)) out.focus = 'lower';
  else if (/full|complet|corps entier/.test(t)) out.focus = 'full';
  else if (/jambe|legs|squat/.test(t)) out.focus = 'legs';
  else if (/pull|tirage/.test(t)) out.focus = 'pull';
  else if (/push|pouss/.test(t)) out.focus = 'push';
  else if (/bras/.test(t)) out.focus = 'upper';
  else if (hits.length > 0 && !out.muscle) out.focus = hits.some((m) => LOWER_BODY.includes(m)) ? 'legs' : hits.includes('dos') || hits.includes('biceps') ? 'pull' : 'push';

  return out;
}
