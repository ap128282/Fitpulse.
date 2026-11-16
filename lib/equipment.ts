import type { Capability, EquipmentId, UserProfile } from './types';

export type EquipCategory =
  | 'libres' | 'bancs' | 'racks' | 'poulies' | 'machines-haut' | 'machines-bas'
  | 'cardio' | 'fonctionnel' | 'equilibre' | 'accessoires' | 'performance';

export type IconKey =
  | 'dumbbell' | 'weight' | 'bench' | 'pullup' | 'link' | 'cog' | 'grip' | 'rect'
  | 'bike' | 'footprints' | 'activity' | 'circle' | 'square' | 'triangle'
  | 'timer' | 'mountain' | 'zap' | 'waves' | 'shield' | 'layers';

export type WeightKind = 'dumbbell' | 'kettlebell' | 'plate' | 'bar' | 'ball';

export interface EquipItem {
  id: EquipmentId;
  label: string;
  category: EquipCategory;
  /** « both » = proposé à la maison et en salle ; « salle » = uniquement en salle. */
  scope: 'both' | 'salle';
  /** Capacités que ce matériel apporte aux exercices. */
  provides: Capability[];
  weightKind?: WeightKind;
  icon: IconKey;
}

export const CATEGORY_LABEL: Record<EquipCategory, string> = {
  libres: 'Poids libres',
  bancs: 'Bancs',
  racks: 'Racks et cages',
  poulies: 'Poulies',
  'machines-haut': 'Machines haut du corps',
  'machines-bas': 'Machines bas du corps',
  cardio: 'Cardio',
  fonctionnel: 'Poids du corps et fonctionnel',
  equilibre: 'Équilibre et proprioception',
  accessoires: 'Accessoires',
  performance: 'Performance et force athlétique',
};

export const CATEGORY_ORDER: EquipCategory[] = [
  'libres', 'bancs', 'racks', 'poulies', 'machines-haut', 'machines-bas',
  'cardio', 'fonctionnel', 'equilibre', 'accessoires', 'performance',
];

export const CATEGORY_ICON: Record<EquipCategory, IconKey> = {
  libres: 'dumbbell',
  bancs: 'bench',
  racks: 'shield',
  poulies: 'link',
  'machines-haut': 'cog',
  'machines-bas': 'cog',
  cardio: 'bike',
  fonctionnel: 'pullup',
  equilibre: 'circle',
  accessoires: 'grip',
  performance: 'mountain',
};

const it = (
  id: string,
  label: string,
  category: EquipCategory,
  scope: 'both' | 'salle',
  provides: Capability[] = [],
  weightKind?: WeightKind,
  icon?: IconKey
): EquipItem => ({ id, label, category, scope, provides, weightKind, icon: icon ?? CATEGORY_ICON[category] });

export const EQUIPMENT_CATALOG: EquipItem[] = [
  // ------------------------------ Poids libres ------------------------------
  it('halteres-fixes', 'Haltères fixes (hexagonaux)', 'libres', 'both', ['halteres'], 'dumbbell', 'dumbbell'),
  it('halteres-reglables', 'Haltères réglables à disques', 'libres', 'both', ['halteres'], 'dumbbell', 'dumbbell'),
  it('halteres-selecteur', 'Haltères à sélecteur (type PowerBlock)', 'libres', 'both', ['halteres'], 'dumbbell', 'dumbbell'),
  it('halteres-neoprene', 'Haltères néoprène légers', 'libres', 'both', ['halteres'], 'dumbbell', 'dumbbell'),
  it('halteres-rubber', 'Haltères caoutchoutés (rangée salle)', 'libres', 'salle', ['halteres'], 'dumbbell', 'dumbbell'),
  it('kettlebell-fonte', 'Kettlebells en fonte', 'libres', 'both', ['kettlebells'], 'kettlebell', 'weight'),
  it('kettlebell-vinyle', 'Kettlebells vinyle', 'libres', 'both', ['kettlebells'], 'kettlebell', 'weight'),
  it('kettlebell-reglable', 'Kettlebell réglable', 'libres', 'both', ['kettlebells'], 'kettlebell', 'weight'),
  it('kettlebell-competition', 'Kettlebells de compétition', 'libres', 'salle', ['kettlebells'], 'kettlebell', 'weight'),
  it('barre-olympique', 'Barre olympique 20 kg', 'libres', 'both', ['barre'], 'bar', 'grip'),
  it('barre-olympique-15', 'Barre olympique 15 kg', 'libres', 'both', ['barre'], 'bar', 'grip'),
  it('barre-courte', 'Barre courte (120 à 150 cm)', 'libres', 'both', ['barre'], 'bar', 'grip'),
  it('barre-ez', 'Barre EZ (curl)', 'libres', 'both', ['barre'], 'bar', 'grip'),
  it('barre-prechargee', 'Barre pré-chargée fixe', 'libres', 'both', ['barre-disques'], 'bar', 'grip'),
  it('trap-bar', 'Trap bar (barre hexagonale)', 'libres', 'both', ['trap-bar'], 'bar', 'grip'),
  it('barre-multiprise', 'Barre multiprises (swiss bar)', 'libres', 'salle', ['barre'], 'bar', 'grip'),
  it('disques-olympiques', 'Disques olympiques (50 mm)', 'libres', 'both', ['disques'], 'plate', 'circle'),
  it('disques-standard', 'Disques standard (30 mm)', 'libres', 'both', ['disques'], 'plate', 'circle'),
  it('disques-bumper', 'Disques bumper (caoutchouc)', 'libres', 'both', ['disques'], 'plate', 'circle'),
  it('disques-fractionnes', 'Disques fractionnés (0,5 à 1,25 kg)', 'libres', 'both', ['disques'], 'plate', 'circle'),
  it('medecine-ball', 'Médecine ball', 'libres', 'both', [], 'ball', 'circle'),
  it('slam-ball', 'Slam ball', 'libres', 'both', [], 'ball', 'circle'),
  it('gilet-leste', 'Gilet lesté', 'libres', 'both', [], 'plate', 'shield'),
  it('sac-sable', 'Sac de sable (sandbag)', 'libres', 'both', [], 'plate', 'weight'),

  // ---------------------------------- Bancs ---------------------------------
  it('banc-plat', 'Banc plat', 'bancs', 'both', ['banc-droit']),
  it('banc-reglable', 'Banc réglable (incliné / décliné)', 'bancs', 'both', ['banc-droit', 'banc-reglable']),
  it('banc-incline-fixe', 'Banc incliné fixe', 'bancs', 'salle', ['banc-reglable']),
  it('banc-decline', 'Banc décliné', 'bancs', 'salle'),
  it('banc-compact', 'Banc compact pliable (maison)', 'bancs', 'both', ['banc-droit']),
  it('banc-scott', 'Pupitre à biceps (Larry Scott)', 'bancs', 'both'),
  it('banc-abdos', 'Banc à abdos', 'bancs', 'both'),
  it('banc-lombaires', 'Banc à lombaires 45°', 'bancs', 'salle'),
  it('chaise-romaine', 'Chaise romaine', 'bancs', 'salle'),
  it('banc-militaire', 'Banc de développé militaire (dossier droit)', 'bancs', 'salle', ['banc-reglable']),

  // ----------------------------- Racks et cages -----------------------------
  it('rack-squat', 'Rack à squat', 'racks', 'both', ['rack']),
  it('cage-squat', 'Cage de squat / power rack (avec barre de traction)', 'racks', 'both', ['rack', 'barre-traction']),
  it('rack-mural', 'Rack mural pliable', 'racks', 'both', ['rack']),
  it('supports-developpe', 'Supports de développé couché', 'racks', 'both', ['rack']),
  it('smith', 'Smith machine (barre guidée)', 'racks', 'salle', ['machines']),
  it('landmine', 'Landmine (ancrage de barre)', 'racks', 'both'),
  it('plateforme-souleve', 'Plateforme de soulevé de terre', 'racks', 'salle'),
  it('stand-barre-curl', 'Stand à barre de curl', 'racks', 'salle'),

  // ---------------------------------- Poulies -------------------------------
  it('poulie-haute', 'Poulie haute', 'poulies', 'salle', ['poulies']),
  it('poulie-basse', 'Poulie basse', 'poulies', 'salle', ['poulies']),
  it('poulie-reglable', 'Poulie réglable double', 'poulies', 'salle', ['poulies']),
  it('crossover', 'Station de câbles (crossover)', 'poulies', 'salle', ['poulies']),
  it('station-tirage', 'Station tirage vertical', 'poulies', 'salle', ['poulies']),
  it('rowing-poulie', 'Rowing poulie assis', 'poulies', 'salle', ['poulies']),
  it('poulie-murale', 'Poulie murale (maison)', 'poulies', 'both', ['poulies']),
  it('station-multifonction', 'Station multifonction (home gym)', 'poulies', 'both', ['poulies']),
  it('corde-triceps', 'Corde triceps', 'poulies', 'both'),
  it('barre-v-poulie', 'Barre en V et poignée de rowing', 'poulies', 'both'),
  it('barre-droite-poulie', 'Barre droite de tirage', 'poulies', 'both'),
  it('sangle-cheville', 'Sangle de cheville pour poulie', 'poulies', 'both'),

  // ------------------------- Machines haut du corps -------------------------
  it('pec-deck', 'Pec deck / butterfly', 'machines-haut', 'salle', ['machines']),
  it('developpe-convergent', 'Développé machine convergent', 'machines-haut', 'salle', ['machines']),
  it('developpe-incline-machine', 'Développé incliné machine', 'machines-haut', 'salle', ['machines']),
  it('developpe-decline-machine', 'Développé décliné machine', 'machines-haut', 'salle', ['machines']),
  it('developpe-epaules-machine', 'Développé épaules machine', 'machines-haut', 'salle', ['machines']),
  it('elevations-laterales-machine', 'Élévations latérales machine', 'machines-haut', 'salle', ['machines']),
  it('oiseau-machine', 'Oiseau inversé machine', 'machines-haut', 'salle', ['machines']),
  it('rowing-machine', 'Rowing machine assis (poitrine appuyée)', 'machines-haut', 'salle', ['machines']),
  it('t-bar-row', 'T-bar row (rowing en T)', 'machines-haut', 'salle', ['machines']),
  it('tirage-horizontal', 'Tirage horizontal machine', 'machines-haut', 'salle', ['machines']),
  it('tirage-vertical-machine', 'Tirage vertical machine', 'machines-haut', 'salle', ['machines']),
  it('pullover-machine', 'Pull-over machine', 'machines-haut', 'salle', ['machines']),
  it('curl-machine', 'Curl biceps machine', 'machines-haut', 'salle', ['machines']),
  it('triceps-machine', 'Extension triceps machine', 'machines-haut', 'salle', ['machines']),
  it('dips-machine', 'Dips guidés / assistés', 'machines-haut', 'salle', ['machines']),
  it('traction-assistee', 'Machine à tractions assistées', 'machines-haut', 'salle', ['machines', 'barre-traction']),
  it('shrug-machine', 'Machine à shrugs (trapèzes)', 'machines-haut', 'salle', ['machines']),
  it('abdos-machine', 'Crunch machine (abdos)', 'machines-haut', 'salle', ['machines']),
  it('rotary-torso', 'Rotation du buste (rotary torso)', 'machines-haut', 'salle', ['machines']),
  it('lombaires-machine', 'Extension lombaires machine', 'machines-haut', 'salle', ['machines']),

  // -------------------------- Machines bas du corps -------------------------
  it('presse-45', 'Presse à cuisses 45°', 'machines-bas', 'salle', ['machines']),
  it('presse-horizontale', 'Presse à cuisses horizontale', 'machines-bas', 'salle', ['machines']),
  it('hack-squat', 'Hack squat', 'machines-bas', 'salle', ['machines']),
  it('pendulum-squat', 'Pendulum squat', 'machines-bas', 'salle', ['machines']),
  it('belt-squat', 'Belt squat', 'machines-bas', 'salle', ['machines']),
  it('leg-extension', 'Leg extension', 'machines-bas', 'salle', ['machines']),
  it('leg-curl-allonge', 'Leg curl allongé', 'machines-bas', 'salle', ['machines']),
  it('leg-curl-assis', 'Leg curl assis', 'machines-bas', 'salle', ['machines']),
  it('adducteurs', 'Machine adducteurs', 'machines-bas', 'salle', ['machines']),
  it('abducteurs', 'Machine abducteurs', 'machines-bas', 'salle', ['machines']),
  it('mollets-debout', 'Mollets debout machine', 'machines-bas', 'salle', ['machines']),
  it('mollets-assis', 'Mollets assis machine', 'machines-bas', 'salle', ['machines']),
  it('hip-thrust-machine', 'Hip thrust machine', 'machines-bas', 'salle', ['machines']),
  it('glute-kickback', 'Glute kickback machine', 'machines-bas', 'salle', ['machines']),
  it('multi-hip', 'Multi-hip machine', 'machines-bas', 'salle', ['machines']),
  it('ghd', 'Banc GHD (glute-ham developer)', 'machines-bas', 'salle'),
  it('reverse-hyper', 'Reverse hyper', 'machines-bas', 'salle'),

  // ---------------------------------- Cardio --------------------------------
  it('tapis-course', 'Tapis de course', 'cardio', 'both', [], undefined, 'footprints'),
  it('velo-appartement', "Vélo d'appartement", 'cardio', 'both', [], undefined, 'bike'),
  it('velo-spinning', 'Vélo de spinning', 'cardio', 'both', [], undefined, 'bike'),
  it('velo-semi-allonge', 'Vélo semi-allongé', 'cardio', 'salle', [], undefined, 'bike'),
  it('rameur', 'Rameur', 'cardio', 'both', [], undefined, 'waves'),
  it('elliptique', 'Vélo elliptique', 'cardio', 'both', [], undefined, 'activity'),
  it('stepper', 'Escalier / Stairmaster', 'cardio', 'salle', [], undefined, 'mountain'),
  it('air-bike', 'Air bike', 'cardio', 'both', [], undefined, 'zap'),
  it('ski-erg', 'Ski erg', 'cardio', 'salle', [], undefined, 'waves'),
  it('corde-sauter', 'Corde à sauter', 'cardio', 'both', [], undefined, 'timer'),
  it('tapis-incline', 'Tapis incliné / trail', 'cardio', 'salle', [], undefined, 'mountain'),

  // ------------------------ Poids du corps et fonctionnel -------------------
  it('barre-traction', 'Barre de traction (porte ou mur)', 'fonctionnel', 'both', ['barre-traction'], undefined, 'pullup'),
  it('anneaux', 'Anneaux de gymnastique', 'fonctionnel', 'both', ['barre-traction'], undefined, 'pullup'),
  it('suspension', 'Sangles de suspension (type TRX)', 'fonctionnel', 'both', [], undefined, 'pullup'),
  it('espalier', 'Espalier', 'fonctionnel', 'both', ['barre-traction'], undefined, 'pullup'),
  it('barres-dips', 'Barres à dips', 'fonctionnel', 'both', [], undefined, 'pullup'),
  it('parallettes', 'Parallettes', 'fonctionnel', 'both', [], undefined, 'pullup'),
  it('corde-grimper', 'Corde à grimper', 'fonctionnel', 'salle', [], undefined, 'pullup'),
  it('box-pliometrique', 'Box pliométrique', 'fonctionnel', 'both', ['box'], undefined, 'square'),
  it('step-aerobic', 'Step / marche réglable', 'fonctionnel', 'both', ['box'], undefined, 'square'),
  it('tapis-sol', 'Tapis de sol', 'fonctionnel', 'both', [], undefined, 'rect'),
  it('roue-abdos', 'Roue abdominale', 'fonctionnel', 'both', [], undefined, 'circle'),
  it('elastiques', 'Bandes élastiques de résistance', 'fonctionnel', 'both', ['elastiques'], undefined, 'link'),
  it('mini-bands', 'Mini-bands (fessiers, hanches)', 'fonctionnel', 'both', ['elastiques'], undefined, 'link'),
  it('tubes-resistance', 'Tubes de résistance avec poignées', 'fonctionnel', 'both', ['elastiques'], undefined, 'link'),
  it('swiss-ball', 'Ballon de gym (swiss ball)', 'fonctionnel', 'both', ['swiss-ball'], undefined, 'circle'),
  it('battle-rope', 'Corde ondulatoire (battle rope)', 'fonctionnel', 'both', [], undefined, 'waves'),
  it('foam-roller', 'Rouleau de massage', 'fonctionnel', 'both', [], undefined, 'rect'),
  it('balle-massage', 'Balle de massage', 'fonctionnel', 'both', [], undefined, 'circle'),

  // ------------------------ Équilibre et proprioception ---------------------
  it('bosu', 'BOSU', 'equilibre', 'both', ['equilibre'], undefined, 'triangle'),
  it('plateau-freeman', 'Plateau de Freeman (wobble board)', 'equilibre', 'both', ['equilibre'], undefined, 'circle'),
  it('balance-board', 'Balance board', 'equilibre', 'both', ['equilibre'], undefined, 'rect'),
  it('coussin-equilibre', "Coussin d'équilibre gonflable", 'equilibre', 'both', ['equilibre'], undefined, 'circle'),
  it('demi-sphere', "Demi-sphère d'équilibre", 'equilibre', 'both', ['equilibre'], undefined, 'triangle'),
  it('tapis-mousse', 'Tapis mousse épais (airex)', 'equilibre', 'both', ['equilibre'], undefined, 'rect'),
  it('slackline', 'Slackline', 'equilibre', 'both', [], undefined, 'activity'),

  // ------------------------------- Accessoires ------------------------------
  it('colliers', 'Colliers de serrage', 'accessoires', 'both', [], undefined, 'grip'),
  it('sangles-poignets', 'Sangles de tirage (straps)', 'accessoires', 'both', [], undefined, 'grip'),
  it('ceinture-lombaire', 'Ceinture de force', 'accessoires', 'both', [], undefined, 'shield'),
  it('ceinture-dips', 'Ceinture à lester (dips / tractions)', 'accessoires', 'both', [], 'plate', 'shield'),
  it('genouilleres', 'Genouillères de maintien', 'accessoires', 'both', [], undefined, 'shield'),
  it('gants', 'Gants / crochets de tirage', 'accessoires', 'both', [], undefined, 'grip'),
  it('magnesie', 'Magnésie', 'accessoires', 'both', [], undefined, 'grip'),

  // ----------------------- Performance et force athlétique ------------------
  it('traineau', 'Traîneau (sled)', 'performance', 'both', ['traineau'], undefined, 'mountain'),
  it('pneu', 'Pneu de tracteur', 'performance', 'both', [], undefined, 'circle'),
  it('sac-bulgare', 'Sac bulgare', 'performance', 'both', [], undefined, 'weight'),
  it('poignees-farmer', 'Poignées de farmer walk', 'performance', 'salle', [], 'plate', 'weight'),
  it('massue', 'Massue / macebell', 'performance', 'both', [], undefined, 'grip'),
  it('enclume', 'Pierres d\'Atlas', 'performance', 'salle', [], undefined, 'circle'),
];

export const EQUIPMENT_BY_ID: Record<string, EquipItem> = Object.fromEntries(EQUIPMENT_CATALOG.map((e) => [e.id, e]));

export const WEIGHT_CHOICES: Record<WeightKind, number[]> = {
  dumbbell: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 45, 50, 55, 60],
  kettlebell: [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48],
  plate: [0.5, 1.25, 2.5, 5, 10, 15, 20, 25],
  bar: [7, 10, 15, 20],
  ball: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20],
};

export const WEIGHT_TITLE: Record<WeightKind, string> = {
  dumbbell: 'Poids disponibles (kg, par haltère)',
  kettlebell: 'Poids disponibles (kg)',
  plate: 'Disques / charges disponibles (kg)',
  bar: 'Poids de la barre (kg)',
  ball: 'Poids disponibles (kg)',
};

/** Matériel proposé selon le lieu. */
export function itemsForPlace(place: 'maison' | 'salle'): EquipItem[] {
  return EQUIPMENT_CATALOG.filter((e) => place === 'salle' || e.scope === 'both');
}

/** Capacités déduites du matériel coché. */
export function capabilitiesFor(ids: EquipmentId[]): Capability[] {
  const caps = new Set<Capability>();
  for (const id of ids) EQUIPMENT_BY_ID[id]?.provides.forEach((c) => caps.add(c));
  if (caps.has('barre') && caps.has('disques')) caps.add('barre-disques');
  return Array.from(caps);
}

export function ownedIds(profile: Pick<UserProfile, 'place' | 'equipment'>): EquipmentId[] {
  return profile.place === 'maison' ? profile.equipment.home : profile.equipment.gym;
}

/** Poids réellement possédés pour un type de charge, d'après les équipements cochés. */
export function weightsFor(profile: Pick<UserProfile, 'place' | 'equipment'>, kind: WeightKind): number[] {
  const set = new Set<number>();
  for (const id of ownedIds(profile)) {
    if (EQUIPMENT_BY_ID[id]?.weightKind !== kind) continue;
    (profile.equipment.weights[id] ?? []).forEach((w) => set.add(w));
  }
  return Array.from(set).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Préréglages et migration de l'ancienne liste de matériel (8 éléments)
// ---------------------------------------------------------------------------

export const PRESETS: { id: string; label: string; place: 'maison' | 'salle'; ids: EquipmentId[] }[] = [
  {
    id: 'salle-complete',
    label: 'Salle complète',
    place: 'salle',
    ids: EQUIPMENT_CATALOG.filter((e) => e.category !== 'accessoires').map((e) => e.id),
  },
  {
    id: 'maison-basique',
    label: 'Maison basique',
    place: 'maison',
    ids: ['halteres-reglables', 'banc-reglable', 'barre-traction', 'tapis-sol', 'elastiques'],
  },
  {
    id: 'maison-complete',
    label: 'Home gym complet',
    place: 'maison',
    ids: [
      'halteres-reglables', 'kettlebell-fonte', 'barre-olympique', 'disques-olympiques', 'banc-reglable',
      'cage-squat', 'poulie-murale', 'barre-traction', 'tapis-sol', 'elastiques', 'box-pliometrique',
    ],
  },
  { id: 'aucun', label: 'Aucun matériel', place: 'maison', ids: [] },
];

export const LEGACY_EQUIPMENT: Record<string, EquipmentId[]> = {
  halteres: ['halteres-fixes'],
  kettlebells: ['kettlebell-fonte'],
  'banc-droit': ['banc-plat'],
  'banc-reglable': ['banc-reglable'],
  'barre-traction': ['barre-traction'],
  'barre-disques': ['barre-olympique', 'disques-olympiques'],
  poulies: ['poulie-reglable'],
  machines: ['pec-deck', 'presse-45', 'leg-extension', 'leg-curl-allonge', 'tirage-vertical-machine'],
};

export function defaultWeightsFor(ids: EquipmentId[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const id of ids) {
    const kind = EQUIPMENT_BY_ID[id]?.weightKind;
    if (!kind) continue;
    out[id] =
      kind === 'dumbbell'
        ? [4, 6, 8, 10, 12, 14, 16, 20]
        : kind === 'kettlebell'
        ? [8, 12, 16, 20]
        : kind === 'plate'
        ? [1.25, 2.5, 5, 10, 20]
        : kind === 'bar'
        ? [20]
        : [4, 6, 8];
  }
  return out;
}
