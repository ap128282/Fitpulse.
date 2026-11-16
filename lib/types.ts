// FitPulse : types partagés (client + serveur). Aucun import ici pour rester utilisable partout.

// ---------------------------------------------------------------------------
// Profil sportif
// ---------------------------------------------------------------------------

export type Level = 'debutant' | 'intermediaire' | 'avance';

/**
 * masse = développement musculaire, performance = force utile à un sport (ex : trail),
 * pompiers = préparation Sapeurs-Pompiers (endurance musculaire).
 */
export type Goal = 'masse' | 'affinement' | 'tonification' | 'performance' | 'pompiers';

export type CoachingStyle = 'bienveillant' | 'motivant' | 'direct';

export type Place = 'maison' | 'salle';

export type Focus = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full';

export type Muscle =
  | 'pectoraux' | 'dos' | 'epaules' | 'biceps' | 'triceps'
  | 'quadriceps' | 'ischios' | 'fessiers' | 'mollets' | 'abdos';

export type Sport =
  | 'aucun' | 'trail' | 'running' | 'cyclisme' | 'football' | 'rugby'
  | 'combat' | 'natation' | 'escalade' | 'pompiers' | 'autre';

export type Sex = 'homme' | 'femme';

export type Diet = 'omnivore' | 'vegetarien' | 'pescetarien' | 'vegan';

export type Allergy = 'gluten' | 'lactose' | 'oeufs' | 'fruits-a-coque' | 'poisson' | 'soja' | 'sesame';

export type SensitiveArea = 'genoux' | 'dos' | 'epaules' | 'poignets' | 'chevilles' | 'hanches' | 'coudes';

// ---------------------------------------------------------------------------
// Matériel
// ---------------------------------------------------------------------------

/** Identifiant d'un équipement du catalogue (voir lib/equipment.ts). */
export type EquipmentId = string;

/** Alias demandé dans le cahier des charges. */
export type Equipment = EquipmentId;

/**
 * Capacité déduite du matériel coché. Les exercices demandent des capacités :
 * par exemple « halteres » est fournie par n'importe quel type d'haltères.
 */
export type Capability =
  | 'halteres' | 'kettlebells' | 'banc-droit' | 'banc-reglable' | 'barre-traction'
  | 'barre' | 'disques' | 'barre-disques' | 'poulies' | 'machines'
  | 'trap-bar' | 'rack' | 'box' | 'elastiques' | 'equilibre' | 'swiss-ball' | 'traineau';

export interface EquipmentSetup {
  home: EquipmentId[];
  gym: EquipmentId[];
  /** Poids choisis par équipement (kg), par exemple { "halteres-fixes": [8, 10, 12] }. */
  weights: Record<string, number[]>;
}

export interface Measurements {
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armCm?: number;
  thighCm?: number;
}

export interface UserProfile {
  name: string;
  onboarded: boolean;
  level: Level;
  experienceYears: number;
  goal: Goal;
  sport: Sport;
  /** Objectif sportif précis, texte libre (ex : « UTMB 50 km en juin »). */
  sportGoal: string;
  sex: Sex;
  age: number;
  sessionsPerWeek: number;
  /** Jours disponibles : 0 = lundi ... 6 = dimanche. */
  availableDays: number[];
  /** Durée exacte d'une séance, en minutes (libre, 15 à 150). */
  duration: number;
  priorityMuscles: Muscle[];
  sensitiveAreas: SensitiveArea[];
  coachingStyle: CoachingStyle;
  place: Place;
  equipment: EquipmentSetup;
  weightKg: number;
  heightCm: number;
  measurements: Measurements;
  diet: Diet;
  allergies: Allergy[];
  /** Objectif calorique choisi manuellement (sinon calculé). */
  calorieTarget?: number;
}

/** Orthographe française demandée dans le cahier des charges. */
export type UserProfil = UserProfile;

// ---------------------------------------------------------------------------
// Exercices
// ---------------------------------------------------------------------------

export type Mechanic = 'polyarticulaire' | 'isolation';

/** Type de charge utilisée par l'exercice. */
export type GearType = 'barre' | 'halteres' | 'kettlebell' | 'machine' | 'poulie' | 'poids-du-corps';

/** Technique de travail particulière. */
export type Technique = 'excentrique' | 'concentrique' | 'isometrique' | 'proprioception';

export interface Exercise {
  slug: string;
  name: string;
  muscle: Muscle;
  gear: GearType;
  mechanic: Mechanic;
  /** Charge de départ de référence (kg) pour un pratiquant de 75 kg. 0 = poids du corps. */
  startKg: number;
  /** Plus petit incrément de charge (kg). */
  step: number;
  /** Capacités de matériel nécessaires (toutes). Vide = aucun matériel. */
  needs: Capability[];
  /** Dossier de l'image dans free-exercise-db (domaine public). */
  imageId?: string;
  /** Conseil d'exécution court. */
  cue: string;
  /** Exercice d'endurance / conditionnement (favorisé pour la prépa pompiers). */
  conditioning?: boolean;
  /** « sec » = la valeur de la colonne « reps » est une durée de maintien en secondes. */
  unit?: 'sec';
  technique?: Technique;
  /** Tempo « descente-pause-montée » en secondes, par exemple 4-1-1. */
  tempo?: string;
  /** Sports pour lesquels l'exercice est particulièrement utile. */
  sports?: Sport[];
}

// ---------------------------------------------------------------------------
// Séances
// ---------------------------------------------------------------------------

export interface PlannedSet {
  weight: number;
  reps: number;
}

export interface PlannedExercise {
  slug: string;
  name: string;
  muscle: Muscle;
  gear: GearType;
  mechanic: Mechanic;
  step: number;
  repRange: [number, number];
  /** Séries d'échauffement spécifiques à l'exercice (non comptées dans le volume). */
  warmups: PlannedSet[];
  sets: PlannedSet[];
  reason: string;
  restSeconds: number;
  imageId?: string;
  cue: string;
  unit?: 'sec';
  technique?: Technique;
  tempo?: string;
  /** Remarque du coach IA pour cet exercice. */
  note?: string;
}

export interface PlannedWorkout {
  name: string;
  focus: Focus;
  goal: Goal;
  duration: number;
  estimatedMin: number;
  exercises: PlannedExercise[];
}

export interface LoggedSet {
  weight: number;
  reps: number;
  rir: number;
}

export type SetLog = LoggedSet;

export interface HistorySession {
  id: string;
  name: string;
  date: string; // ISO
  durationMin: number;
  volume: number;
  sets: number;
  prs: number;
  focus: Focus;
  goal: Goal;
  exercises: { slug: string; name: string; muscle: Muscle; sets: LoggedSet[] }[];
}

export type Workout = HistorySession;

// ---------------------------------------------------------------------------
// Coach IA (Gemini)
// ---------------------------------------------------------------------------

export interface AIPlanExercise {
  slug: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds?: number;
  tempo?: string;
  note?: string;
}

export interface AIPlan {
  name: string;
  focus: Focus;
  exercises: AIPlanExercise[];
}

export interface ChatTurn {
  role: 'user' | 'coach';
  text: string;
}

export type CoachMode = 'chat' | 'swap';

export interface CoachRequestBody {
  mode?: CoachMode;
  message: string;
  history: ChatTurn[];
  profile: UserProfile;
  /** Slugs des exercices faits lors des dernières séances (pour varier). */
  recentSlugs: string[];
}

export interface CoachResponse {
  reply: string | null;
  plan: AIPlan | null;
  source: 'gemini' | 'local';
  /** Présent quand le coach local a pris le relais. */
  reason?: 'no_key' | 'failed';
}

export interface SwapSuggestion {
  slug: string;
  why: string;
}

export interface SwapResponse {
  suggestions: SwapSuggestion[];
  source: 'gemini' | 'local';
}

// ---------------------------------------------------------------------------
// Nutrition
// ---------------------------------------------------------------------------

export type MealType = 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation';

export type MealSource = 'recette' | 'recherche' | 'scanner' | 'photo' | 'vocal' | 'manuel';

export interface MealEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  meal: MealType;
  name: string;
  grams?: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: MealSource;
}

export interface PlanMeal {
  meal: MealType;
  recipeId: string;
  /** Multiplicateur de portion. */
  portion: number;
}

export interface MealPlan {
  id: string;
  createdAt: string;
  kcalTarget: number;
  diet: Diet;
  days: PlanMeal[][];
}

export interface FoodItemEstimate {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}
