import {
  defaultWeightsFor,
  EQUIPMENT_BY_ID,
  EQUIPMENT_CATALOG,
  LEGACY_EQUIPMENT,
  WEIGHT_CHOICES,
} from './equipment';
import type {
  Allergy,
  CoachingStyle,
  Diet,
  EquipmentSetup,
  Goal,
  Level,
  Measurements,
  Muscle,
  Place,
  SensitiveArea,
  Sex,
  Sport,
  UserProfile,
} from './types';

export const LEVEL_LABEL: Record<Level, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};

export const LEVEL_DESC: Record<Level, string> = {
  debutant: "Moins d'un an de pratique régulière.",
  intermediaire: 'Entre 1 et 3 ans, tu maîtrises les mouvements de base.',
  avance: "Plus de 3 ans, tu connais ton corps et tes charges.",
};

export const GOAL_LABEL: Record<Goal, string> = {
  masse: 'Développement musculaire',
  affinement: 'Affinement',
  tonification: 'Tonification',
  performance: 'Performance sportive',
  pompiers: 'Prépa Sapeurs-Pompiers',
};

export const GOAL_DESC: Record<Goal, string> = {
  masse: 'Charges lourdes, 6 à 15 répétitions, récupération complète.',
  affinement: 'Volume modéré et repos plus courts pour garder du muscle.',
  tonification: 'Répétitions élevées, charges modérées, rythme soutenu.',
  performance: 'Force et robustesse au service de ton sport : excentrique, isométrique, proprioception.',
  pompiers: 'Endurance musculaire intense : séries longues, repos courts, gainage et cardio-force.',
};

export const STYLE_LABEL: Record<CoachingStyle, string> = {
  bienveillant: 'Bienveillant',
  motivant: 'Motivant',
  direct: 'Direct',
};

export const STYLE_DESC: Record<CoachingStyle, string> = {
  bienveillant: 'Encourageant et patient, il valorise chaque progrès.',
  motivant: 'Énergique, il te pousse à te dépasser.',
  direct: 'Concis et factuel : consignes claires, sans fioritures.',
};

export const STYLE_SAMPLE: Record<CoachingStyle, string> = {
  bienveillant: 'Belle série, on garde ce rythme tranquillement.',
  motivant: 'Allez, encore une rep, tu peux le faire !',
  direct: 'Charge +2 kg. Même nombre de reps.',
};

export const SPORT_LABEL: Record<Sport, string> = {
  aucun: 'Aucun sport en particulier',
  trail: 'Trail / course en montagne',
  running: 'Course à pied (route)',
  cyclisme: 'Cyclisme',
  football: 'Football',
  rugby: 'Rugby',
  combat: 'Sports de combat',
  natation: 'Natation',
  escalade: 'Escalade',
  pompiers: 'Concours pompiers',
  autre: 'Autre sport',
};

export const DIET_LABEL: Record<Diet, string> = {
  omnivore: 'Omnivore',
  vegetarien: 'Végétarien',
  pescetarien: 'Pescétarien',
  vegan: 'Végétalien',
};

export const ALLERGY_LABEL: Record<Allergy, string> = {
  gluten: 'Gluten',
  lactose: 'Lactose',
  oeufs: 'Œufs',
  'fruits-a-coque': 'Fruits à coque',
  poisson: 'Poisson',
  soja: 'Soja',
  sesame: 'Sésame',
};

export const AREA_LABEL: Record<SensitiveArea, string> = {
  genoux: 'Genoux',
  dos: 'Dos',
  epaules: 'Épaules',
  poignets: 'Poignets',
  chevilles: 'Chevilles',
  hanches: 'Hanches',
  coudes: 'Coudes',
};

export const MUSCLE_LABEL: Record<Muscle, string> = {
  pectoraux: 'Pectoraux',
  dos: 'Dos',
  epaules: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Quadriceps',
  ischios: 'Ischio-jambiers',
  fessiers: 'Fessiers',
  mollets: 'Mollets',
  abdos: 'Abdos',
};

export const ALL_MUSCLES = Object.keys(MUSCLE_LABEL) as Muscle[];
export const ALL_ALLERGIES = Object.keys(ALLERGY_LABEL) as Allergy[];
export const ALL_AREAS = Object.keys(AREA_LABEL) as SensitiveArea[];
export const ALL_SPORTS = Object.keys(SPORT_LABEL) as Sport[];
export const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const DURATION_MIN = 15;
export const DURATION_MAX = 150;
/** Raccourcis proposés ; la durée reste libre à la minute près. */
export const DURATIONS = [30, 45, 60, 75, 90] as const;

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

const HOME_DEFAULT = ['halteres-fixes', 'banc-plat', 'tapis-sol'];
const GYM_DEFAULT = EQUIPMENT_CATALOG.filter((e) => e.category !== 'accessoires').map((e) => e.id);

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  onboarded: false,
  level: 'intermediaire',
  experienceYears: 1,
  goal: 'masse',
  sport: 'aucun',
  sportGoal: '',
  sex: 'homme',
  age: 25,
  sessionsPerWeek: 4,
  availableDays: [0, 2, 4, 6],
  duration: 45,
  priorityMuscles: [],
  sensitiveAreas: [],
  coachingStyle: 'motivant',
  place: 'salle',
  equipment: {
    home: HOME_DEFAULT,
    gym: GYM_DEFAULT,
    weights: defaultWeightsFor([...HOME_DEFAULT, ...GYM_DEFAULT]),
  },
  weightKg: 75,
  heightCm: 175,
  measurements: {},
  diet: 'omnivore',
  allergies: [],
  calorieTarget: undefined,
};

// ---------------------------------------------------------------------------
// Nettoyage : le profil arrive du navigateur (donc non fiable) avant d'aller dans le prompt de l'IA.
// ---------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function optNum(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

function subset<T extends string>(value: unknown, allowed: readonly T[], max = 99): T[] {
  if (!Array.isArray(value)) return [];
  return allowed.filter((x) => value.includes(x)).slice(0, max);
}

function cleanIds(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const out = new Set<string>();
  for (const v of value) {
    if (typeof v !== 'string') continue;
    if (EQUIPMENT_BY_ID[v]) out.add(v);
    else if (LEGACY_EQUIPMENT[v]) LEGACY_EQUIPMENT[v].forEach((x) => out.add(x));
  }
  return Array.from(out);
}

function cleanWeights(eq: Record<string, unknown>, ids: string[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};

  if (isObj(eq.weights)) {
    for (const [id, list] of Object.entries(eq.weights)) {
      const kind = EQUIPMENT_BY_ID[id]?.weightKind;
      if (!kind || !Array.isArray(list)) continue;
      out[id] = WEIGHT_CHOICES[kind].filter((w) => list.includes(w));
    }
  }

  // Ancien format : listes globales d'haltères / de kettlebells.
  if (Array.isArray(eq.dumbbellWeights) && !out['halteres-fixes']) {
    out['halteres-fixes'] = WEIGHT_CHOICES.dumbbell.filter((w) => (eq.dumbbellWeights as unknown[]).includes(w));
  }
  if (Array.isArray(eq.kettlebellWeights) && !out['kettlebell-fonte']) {
    out['kettlebell-fonte'] = WEIGHT_CHOICES.kettlebell.filter((w) => (eq.kettlebellWeights as unknown[]).includes(w));
  }

  // Valeurs par défaut pour les équipements à poids sans choix enregistré.
  const defaults = defaultWeightsFor(ids);
  for (const id of ids) if (defaults[id] && !out[id]) out[id] = defaults[id];
  return out;
}

export function sanitizeProfile(raw: unknown): UserProfile {
  const d = DEFAULT_PROFILE;
  if (!isObj(raw)) {
    return { ...d, equipment: { ...d.equipment, home: [...d.equipment.home], gym: [...d.equipment.gym] }, measurements: {} };
  }

  const eq = isObj(raw.equipment) ? raw.equipment : {};
  const home = cleanIds(eq.home, d.equipment.home);
  const gym = cleanIds(eq.gym, d.equipment.gym);
  const equipment: EquipmentSetup = { home, gym, weights: cleanWeights(eq, [...home, ...gym]) };

  const m = isObj(raw.measurements) ? raw.measurements : {};
  const measurements: Measurements = {
    chestCm: optNum(m.chestCm, 40, 250),
    waistCm: optNum(m.waistCm, 40, 250),
    hipsCm: optNum(m.hipsCm, 40, 250),
    armCm: optNum(m.armCm, 15, 80),
    thighCm: optNum(m.thighCm, 25, 120),
  };

  const days = Array.isArray(raw.availableDays)
    ? Array.from(new Set(raw.availableDays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))).sort()
    : d.availableDays;

  const clean = (v: unknown, max: number) =>
    typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';

  return {
    name: clean(raw.name, 40),
    onboarded: raw.onboarded === true,
    level: pick<Level>(raw.level, ['debutant', 'intermediaire', 'avance'], d.level),
    experienceYears: Math.round(num(raw.experienceYears, 0, 40, d.experienceYears)),
    goal: pick<Goal>(raw.goal, ['masse', 'affinement', 'tonification', 'performance', 'pompiers'], d.goal),
    sport: pick<Sport>(raw.sport, ALL_SPORTS, d.sport),
    sportGoal: clean(raw.sportGoal, 120),
    sex: pick<Sex>(raw.sex, ['homme', 'femme'], d.sex),
    age: Math.round(num(raw.age, 14, 90, d.age)),
    sessionsPerWeek: Math.round(num(raw.sessionsPerWeek, 1, 7, d.sessionsPerWeek)),
    availableDays: days.length > 0 ? days : d.availableDays,
    duration: Math.round(num(raw.duration, DURATION_MIN, DURATION_MAX, d.duration)),
    priorityMuscles: subset<Muscle>(raw.priorityMuscles, ALL_MUSCLES, 3),
    sensitiveAreas: subset<SensitiveArea>(raw.sensitiveAreas, ALL_AREAS),
    coachingStyle: pick<CoachingStyle>(raw.coachingStyle, ['bienveillant', 'motivant', 'direct'], d.coachingStyle),
    place: pick<Place>(raw.place, ['maison', 'salle'], d.place),
    equipment,
    weightKg: num(raw.weightKg, 30, 300, d.weightKg),
    heightCm: num(raw.heightCm, 120, 230, d.heightCm),
    measurements,
    diet: pick<Diet>(raw.diet, ['omnivore', 'vegetarien', 'pescetarien', 'vegan'], d.diet),
    allergies: subset<Allergy>(raw.allergies, ALL_ALLERGIES),
    calorieTarget: optNum(raw.calorieTarget, 1200, 5000),
  };
}
