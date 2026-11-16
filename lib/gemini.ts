// FitPulse : coach IA basé sur l'API Gemini (offre gratuite de Google AI Studio).
// ATTENTION : ce fichier ne doit être importé que côté serveur (routes /api).
// La clé GEMINI_API_KEY ne doit jamais atteindre le navigateur.

import { GoogleGenAI } from '@google/genai';
import { availableExercises, FOCUS_LABEL } from './ai-engine';
import { EQUIPMENT_BY_ID, ownedIds, weightsFor } from './equipment';
import { GEAR_LABEL } from './exercises';
import {
  ALLERGY_LABEL,
  AREA_LABEL,
  DIET_LABEL,
  GOAL_LABEL,
  LEVEL_LABEL,
  MUSCLE_LABEL,
  SPORT_LABEL,
  durationLabel,
} from './profile';
import type {
  AIPlan,
  ChatTurn,
  CoachingStyle,
  Exercise,
  Focus,
  FoodItemEstimate,
  Goal,
  SwapSuggestion,
  UserProfile,
} from './types';

if (typeof window !== 'undefined') {
  throw new Error('lib/gemini.ts est réservé au serveur.');
}

/**
 * Modèles essayés dans l'ordre. Les anciens modèles (1.5 et 2.0) sont arrêtés par Google :
 * on peut forcer un modèle précis avec la variable GEMINI_MODEL.
 */
const MODEL_CHAIN = Array.from(
  new Set([process.env.GEMINI_MODEL, 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash'].filter(Boolean) as string[])
);

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const STYLE_PROMPT: Record<CoachingStyle, string> = {
  bienveillant:
    'Ton bienveillant, patient et rassurant : tu valorises chaque effort, tu dédramatises les échecs et tu proposes des options douces.',
  motivant: 'Ton énergique et motivant : tu encourages à se dépasser avec enthousiasme, sans exagérer.',
  direct: 'Ton direct et concis : phrases courtes, consignes précises, aucun bavardage.',
};

const GOAL_PROMPT: Record<Goal, string> = {
  masse:
    'Développement musculaire : 6 à 10 répétitions sur les polyarticulaires, 10 à 15 sur l\'isolation, 3 à 4 séries, repos 90 à 180 s, RIR visé 1 à 2 (RIR 0 uniquement sur la dernière série d\'isolation).',
  affinement:
    'Affinement : conserver le muscle en déficit calorique, 8 à 12 répétitions en polyarticulaire, 12 à 15 en isolation, 3 séries, repos 60 à 90 s, RIR 1 à 2.',
  tonification:
    'Tonification : 10 à 15 répétitions en polyarticulaire, 12 à 20 en isolation, 3 séries, repos 45 à 75 s, RIR 2.',
  performance:
    'Performance sportive : la musculation sert le sport pratiqué. Force utile (5 à 8 répétitions sur les polyarticulaires, 8 à 12 en isolation), robustesse articulaire et tendineuse, RIR 2 à 3 pour rester frais pour les séances de sport.',
  pompiers:
    'Préparation physique de type Sapeurs-Pompiers : endurance musculaire intense et force-endurance. 12 à 25 répétitions, 3 séries, repos courts de 30 à 60 s, séances plutôt full body, avec tractions, pompes, squats, fentes, swing kettlebell, abdos et exercices de conditionnement. Précise à l\'utilisateur de vérifier le détail officiel des épreuves de sélection (n\'invente jamais de barèmes ni de seuils) et rappelle que la course à pied se travaille en plus.',
};

const SPORT_PROMPT: Record<string, string> = {
  trail:
    "Traileur : priorité au renforcement spécifique des jambes et des chevilles. Planifie, selon la séance, (1) de l'excentrique (descente lente 3 à 4 s : descentes de marche, squats tempo, curl ischios avec retour lent) pour protéger quadriceps et tendons dans les descentes, (2) de l'isométrique (chaise murale, fentes et ponts en maintien de 20 à 45 s) pour l'endurance de position, (3) du concentrique puissant et unilatéral (montées sur box, fentes arrière, sauts mesurés) pour la poussée en montée, (4) de la proprioception (équilibre unipodal, plateau, soulevé de terre unipodal) pour la stabilité des chevilles et des genoux. Progression : tempo et amplitude d'abord, charge ensuite. Garde les jambes fraîches : pas d'échec musculaire sur les jambes la veille d'une sortie longue.",
  running:
    "Coureur : renforcement des jambes et de la chaîne postérieure, travail unilatéral, excentrique pour les tendons, gainage et proprioception de cheville. Évite l'épuisement des jambes avant les séances de course.",
  cyclisme: "Cycliste : force des cuisses et des fessiers, gainage, haut du corps léger pour le port de la position.",
  football: "Footballeur : force des jambes, ischio-jambiers (prévention), proprioception, explosivité mesurée, gainage.",
  rugby: "Rugbyman : force globale, poussées, explosivité, haut du corps, cou et gainage, prévention des blessures.",
  combat: "Sport de combat : force explosive, gainage, rotation du buste, endurance musculaire, tirage et pompes.",
  natation: "Nageur : tirage, épaules stables, gainage, mobilité thoracique, jambes en soutien.",
  escalade: "Grimpeur : tirage, doigts et avant-bras ménagés, gainage, épaules saines, jambes en soutien.",
  pompiers: "Concours pompiers : endurance musculaire, gainage, tractions, pompes, force des jambes, cardio-force.",
};

function equipmentSummary(profile: UserProfile): string {
  const ids = ownedIds(profile);
  const labels = ids.map((id) => EQUIPMENT_BY_ID[id]?.label).filter(Boolean) as string[];
  if (labels.length === 0) return 'aucun matériel (poids du corps uniquement)';
  const shown = labels.slice(0, 45).join(', ');
  return labels.length > 45 ? `${shown} et ${labels.length - 45} autres équipements` : shown;
}

function buildCoachPrompt(profile: UserProfile, recentSlugs: string[]): string {
  const catalog = availableExercises(profile)
    .map((e) => {
      const tags = [e.technique, e.unit === 'sec' ? 'durée en secondes' : '', e.tempo ? `tempo ${e.tempo}` : ''].filter(Boolean).join(' ');
      return `${e.slug} | ${e.name} | ${MUSCLE_LABEL[e.muscle]} | ${GEAR_LABEL[e.gear]} | ${e.mechanic}${tags ? ` | ${tags}` : ''}`;
    })
    .join('\n');

  const home = profile.place === 'maison';
  const dumbbells = weightsFor(profile, 'dumbbell');
  const kettlebells = weightsFor(profile, 'kettlebell');
  const weights = home
    ? `Haltères disponibles (kg) : ${dumbbells.join(', ') || 'non précisé'}. Kettlebells (kg) : ${kettlebells.join(', ') || 'non précisé'}.`
    : 'Salle de sport : charges libres selon le matériel coché.';

  const m = profile.measurements;
  const measures = [
    m.chestCm && `poitrine ${m.chestCm} cm`,
    m.waistCm && `taille ${m.waistCm} cm`,
    m.hipsCm && `hanches ${m.hipsCm} cm`,
    m.armCm && `bras ${m.armCm} cm`,
    m.thighCm && `cuisse ${m.thighCm} cm`,
  ].filter(Boolean);

  return [
    'Tu es FitPulse Coach, un coach sportif expert (musculation, préparation physique, récupération et nutrition sportive), prudent et précis. Tu réponds toujours en français.',
    STYLE_PROMPT[profile.coachingStyle],
    '',
    "## Profil de l'utilisateur",
    `- Prénom : ${profile.name || 'inconnu'} ; âge : ${profile.age} ans ; sexe : ${profile.sex} ; poids : ${profile.weightKg} kg ; taille : ${profile.heightCm} cm${measures.length ? ` ; mensurations : ${measures.join(', ')}` : ''}`,
    `- Niveau : ${LEVEL_LABEL[profile.level]} (${profile.experienceYears} an(s) de pratique)`,
    `- Objectif : ${GOAL_LABEL[profile.goal]}`,
    `- Sport pratiqué : ${SPORT_LABEL[profile.sport]}${profile.sportGoal ? ` ; objectif sportif : ${profile.sportGoal}` : ''}`,
    `- Séances par semaine : ${profile.sessionsPerWeek} ; durée habituelle : ${durationLabel(profile.duration)}`,
    `- Muscles prioritaires par défaut : ${profile.priorityMuscles.map((x) => MUSCLE_LABEL[x]).join(', ') || 'aucun'}`,
    `- Zones sensibles (éviter les exercices qui les sollicitent fortement) : ${profile.sensitiveAreas.map((a) => AREA_LABEL[a]).join(', ') || 'aucune'}`,
    `- Alimentation : ${DIET_LABEL[profile.diet]} ; allergies / intolérances : ${profile.allergies.map((a) => ALLERGY_LABEL[a]).join(', ') || 'aucune'}`,
    `- Lieu : ${home ? 'à la maison' : 'en salle de sport'}`,
    `- Matériel disponible : ${equipmentSummary(profile)}`,
    `- ${weights}`,
    '',
    '## Programmation selon l\'objectif',
    GOAL_PROMPT[profile.goal],
    SPORT_PROMPT[profile.sport] ? `\n## Spécificité du sport\n${SPORT_PROMPT[profile.sport]}` : '',
    '',
    '## Techniques de travail',
    '- Excentrique : descente lente et contrôlée (3 à 4 s). Renforce les tendons ; fatigue le muscle plus que la charge ne le laisse croire, donc charge modérée.',
    '- Isométrique : maintien sans bouger, 20 à 45 s (durée indiquée en secondes dans la colonne répétitions). À privilégier pour l\'endurance de position et la rééducation douce.',
    '- Concentrique : montée puissante, charge plus lourde ou explosivité mesurée.',
    '- Proprioception : équilibre et contrôle articulaire, en début de séance quand le système nerveux est frais, jamais à l\'échec.',
    '',
    '## Règles de génération de séance',
    '- Utilise UNIQUEMENT des exercices de la liste ci-dessous, avec leur "slug" exact. N\'en invente jamais. La liste ne contient que des exercices réalisables avec le matériel du lieu : n\'en propose jamais d\'autres.',
    '- La durée demandée par l\'utilisateur est la durée EXACTE disponible : adapte le nombre d\'exercices et de séries (environ 1 exercice pour 8 à 10 minutes en musculation classique). L\'application ajoute elle-même l\'échauffement de chaque exercice et calcule les charges : ne les ajoute pas.',
    '- L\'utilisateur est libre : les muscles prioritaires ne sont qu\'un réglage par défaut. S\'il demande une séance sur un autre groupe (par exemple haut du corps alors que ses jambes sont prioritaires), fais-la sans objection.',
    '- Si l\'utilisateur cible UN SEUL muscle, structure toute la séance pour optimiser ce muscle (environ 60 à 70 % du volume : angles et exercices variés, polyarticulaires puis isolation) et complète avec les muscles antagonistes ou stabilisateurs pour éviter un déséquilibre. Précise-le dans "reply".',
    '- Commence par les polyarticulaires, puis l\'isolation. Varie les exercices par rapport aux dernières séances.',
    '- Ne propose pas de charges en kg : l\'application les calcule à partir du RIR de la séance précédente puis les ajuste série après série selon les répétitions réellement faites.',
    '- Respecte les zones sensibles : évite les exercices qui les sollicitent fortement ou propose une variante plus douce.',
    '',
    '## Chat libre : sport, nutrition, récupération',
    '- Réponds précisément à toute question sur l\'entraînement, la technique, la récupération, le sommeil, l\'hydratation et la nutrition sportive (repères courants : 1,6 à 2,2 g de protéines par kg de poids de corps, déficit ou excédent modéré, glucides autour des séances).',
    '- Respecte le régime alimentaire et les allergies du profil.',
    '- Tu n\'es pas médecin ni diététicien. En cas de douleur persistante, blessure, malaise, pathologie, grossesse ou trouble du comportement alimentaire, recommande de consulter un professionnel de santé et ne propose pas de séance intense.',
    '- Si l\'utilisateur a moins de 18 ans : jamais de déficit calorique, jamais de charges maximales ni de supplément ; privilégie la technique et la progression douce.',
    '- Ne donne jamais de régime extrême, de conseil sur le dopage ou sur des produits dangereux.',
    '- Réponds brièvement (6 phrases maximum) dans "reply". Ne propose une séance ("workout") que si l\'utilisateur en demande une ou la souhaite clairement ; sinon "workout" vaut null.',
    '',
    '## Exercices autorisés (slug | nom | muscle | matériel | type | technique)',
    catalog,
    '',
    `## Exercices des dernières séances à éviter de répéter : ${recentSlugs.slice(0, 20).join(', ') || 'aucun'}`,
    '',
    '## Format de sortie : uniquement du JSON valide, sans texte autour',
    '{"reply": string, "workout": null | {"name": string, "focus": "push"|"pull"|"legs"|"upper"|"lower"|"full", "exercises": [{"slug": string, "sets": number, "repMin": number, "repMax": number, "restSeconds": number, "tempo": string, "note": string}]}}',
    '"note" est un conseil d\'exécution ou d\'intensité de 14 mots maximum (par exemple le RIR visé). "tempo" est facultatif (par exemple "4-0-1").',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Appel du modèle avec repli sur plusieurs modèles
// ---------------------------------------------------------------------------

interface Content {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}

async function generateJson(systemInstruction: string, contents: Content[]): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY manquante');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 25000 } });

  let lastError: unknown = null;
  for (const model of MODEL_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction, responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 4096 },
      });
      const text = response.text ?? '';
      if (text.trim()) return { text, model };
      lastError = new Error('Réponse vide');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Appel Gemini impossible');
}

// ---------------------------------------------------------------------------
// Lecture et validation des réponses
// ---------------------------------------------------------------------------

const FOCUSES: Focus[] = ['push', 'pull', 'legs', 'upper', 'lower', 'full'];

function parseJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const toNum = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function sanitizeChat(raw: unknown, allowed: Set<string>): { reply: string; plan: AIPlan | null } | null {
  if (!isObj(raw)) return null;
  const reply = typeof raw.reply === 'string' ? raw.reply.trim().slice(0, 1800) : '';

  let plan: AIPlan | null = null;
  const w = raw.workout;
  if (isObj(w) && Array.isArray(w.exercises)) {
    const seen = new Set<string>();
    const exercises: AIPlan['exercises'] = [];
    for (const item of w.exercises) {
      if (!isObj(item) || typeof item.slug !== 'string') continue;
      if (!allowed.has(item.slug) || seen.has(item.slug)) continue;
      seen.add(item.slug);
      const repMin = clamp(Math.round(toNum(item.repMin, 8)), 3, 180);
      exercises.push({
        slug: item.slug,
        sets: clamp(Math.round(toNum(item.sets, 3)), 2, 6),
        repMin,
        repMax: clamp(Math.round(toNum(item.repMax, repMin + 4)), repMin, 180),
        restSeconds: item.restSeconds === undefined ? undefined : clamp(Math.round(toNum(item.restSeconds, 90)), 20, 300),
        tempo: typeof item.tempo === 'string' && /^[0-9x]-[0-9x]-[0-9x]$/.test(item.tempo) ? item.tempo : undefined,
        note: typeof item.note === 'string' ? item.note.slice(0, 140) : undefined,
      });
    }
    if (exercises.length >= 2) {
      plan = {
        name: typeof w.name === 'string' ? w.name.slice(0, 60) : 'Séance FitPulse',
        focus: FOCUSES.includes(w.focus as Focus) ? (w.focus as Focus) : 'full',
        exercises: exercises.slice(0, 12),
      };
    }
  }

  if (!reply && !plan) return null;
  return { reply: reply || (plan ? `Voici ta séance ${FOCUS_LABEL[plan.focus].toLowerCase()}.` : ''), plan };
}

// ---------------------------------------------------------------------------
// Chat libre et génération de séance
// ---------------------------------------------------------------------------

export interface CoachInput {
  message: string;
  history: ChatTurn[];
  profile: UserProfile;
  recentSlugs: string[];
}

export interface CoachResult {
  reply: string;
  plan: AIPlan | null;
  model: string;
}

export async function askCoach(input: CoachInput): Promise<CoachResult> {
  const allowed = new Set(availableExercises(input.profile).map((e) => e.slug));
  const systemInstruction = buildCoachPrompt(input.profile, input.recentSlugs);

  // Gemini exige que la conversation commence par l'utilisateur.
  const turns = [...input.history];
  while (turns.length > 0 && turns[0].role !== 'user') turns.shift();
  const contents: Content[] = [
    ...turns.map((t) => ({ role: (t.role === 'user' ? 'user' : 'model') as 'user' | 'model', parts: [{ text: t.text }] })),
    { role: 'user', parts: [{ text: input.message }] },
  ];

  const { text, model } = await generateJson(systemInstruction, contents);
  const parsed = sanitizeChat(parseJson(text), allowed);
  if (!parsed) throw new Error('Réponse JSON invalide');
  return { ...parsed, model };
}

// ---------------------------------------------------------------------------
// Alternatives d'exercice en un clic
// ---------------------------------------------------------------------------

export interface SwapInput {
  profile: UserProfile;
  current: Exercise;
  candidates: Exercise[];
  reason: string;
}

export async function askSwap(input: SwapInput): Promise<SwapSuggestion[]> {
  const allowed = new Set(input.candidates.map((c) => c.slug));
  const list = input.candidates
    .map((e) => `${e.slug} | ${e.name} | ${GEAR_LABEL[e.gear]} | ${e.mechanic}${e.technique ? ` | ${e.technique}` : ''}`)
    .join('\n');

  const system = [
    'Tu es FitPulse Coach. Réponds en français, uniquement en JSON.',
    STYLE_PROMPT[input.profile.coachingStyle],
    `Profil : ${LEVEL_LABEL[input.profile.level]}, objectif ${GOAL_LABEL[input.profile.goal]}, sport ${SPORT_LABEL[input.profile.sport]}, zones sensibles : ${input.profile.sensitiveAreas.map((a) => AREA_LABEL[a]).join(', ') || 'aucune'}.`,
    `L'utilisateur veut remplacer « ${input.current.name} » (${MUSCLE_LABEL[input.current.muscle]}). Raison : ${input.reason}.`,
    'Choisis jusqu\'à 3 remplaçants dans la liste ci-dessous, du plus proche au moins proche (même muscle, même schéma de mouvement, même intensité). Donne pour chacun une raison de 14 mots maximum.',
    'Utilise UNIQUEMENT les slugs de la liste.',
    '',
    list,
    '',
    'Format : {"suggestions": [{"slug": string, "why": string}]}',
  ].join('\n');

  const { text } = await generateJson(system, [{ role: 'user', parts: [{ text: 'Propose des alternatives.' }] }]);
  const raw = parseJson(text);
  if (!isObj(raw) || !Array.isArray(raw.suggestions)) throw new Error('Réponse JSON invalide');

  const out: SwapSuggestion[] = [];
  for (const s of raw.suggestions) {
    if (!isObj(s) || typeof s.slug !== 'string' || !allowed.has(s.slug) || out.some((o) => o.slug === s.slug)) continue;
    out.push({ slug: s.slug, why: typeof s.why === 'string' ? s.why.slice(0, 140) : '' });
  }
  if (out.length === 0) throw new Error('Aucune alternative valide');
  return out.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Nutrition : estimation d'un repas à partir d'une photo ou d'une description vocale
// ---------------------------------------------------------------------------

export interface NutritionInput {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}

export async function askNutrition(input: NutritionInput): Promise<{ items: FoodItemEstimate[]; note: string }> {
  const system = [
    'Tu es un assistant de nutrition sportive. Réponds en français, uniquement en JSON.',
    "Identifie chaque aliment du repas (photo ou description), estime la quantité en grammes et donne calories (kcal) et macronutriments (protéines, glucides, lipides en grammes) pour CETTE quantité.",
    "Sois réaliste et prudent : ce sont des estimations. Si la photo n'est pas un repas ou est illisible, renvoie une liste vide et explique-le dans \"note\".",
    'Format : {"items": [{"name": string, "grams": number, "kcal": number, "protein": number, "carbs": number, "fat": number}], "note": string}',
  ].join('\n');

  const parts: Content['parts'] = [];
  if (input.imageBase64) parts.push({ inlineData: { mimeType: input.mimeType ?? 'image/jpeg', data: input.imageBase64 } });
  parts.push({ text: input.text ? `Repas décrit par l'utilisateur : ${input.text}` : 'Analyse la photo de ce repas.' });

  const { text } = await generateJson(system, [{ role: 'user', parts }]);
  const raw = parseJson(text);
  if (!isObj(raw) || !Array.isArray(raw.items)) throw new Error('Réponse JSON invalide');

  const items: FoodItemEstimate[] = [];
  for (const it of raw.items.slice(0, 12)) {
    if (!isObj(it) || typeof it.name !== 'string') continue;
    items.push({
      name: it.name.slice(0, 60),
      grams: clamp(Math.round(toNum(it.grams, 100)), 1, 2000),
      kcal: clamp(Math.round(toNum(it.kcal, 0)), 0, 3000),
      protein: clamp(Math.round(toNum(it.protein, 0) * 10) / 10, 0, 300),
      carbs: clamp(Math.round(toNum(it.carbs, 0) * 10) / 10, 0, 500),
      fat: clamp(Math.round(toNum(it.fat, 0) * 10) / 10, 0, 300),
    });
  }
  return { items, note: typeof raw.note === 'string' ? raw.note.slice(0, 300) : '' };
}
