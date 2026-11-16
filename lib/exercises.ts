import type { Capability, Exercise, GearType, Muscle, Sport, Technique } from './types';

// Images de démonstration : base "free-exercise-db" (licence Unlicense, domaine public).
// https://github.com/yuhonas/free-exercise-db
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

/** Deux images (position de départ / position d'arrivée) pour animer la démo. */
export function exerciseImages(imageId?: string): string[] {
  if (!imageId) return [];
  return [`${IMAGE_BASE}/${imageId}/0.jpg`, `${IMAGE_BASE}/${imageId}/1.jpg`];
}

type Mech = 'polyarticulaire' | 'isolation';

interface Extra {
  conditioning?: boolean;
  unit?: 'sec';
  technique?: Technique;
  tempo?: string;
  sports?: Sport[];
}

const ex = (
  slug: string,
  name: string,
  muscle: Muscle,
  gear: GearType,
  mechanic: Mech,
  startKg: number,
  step: number,
  needs: Capability[],
  imageId: string | undefined,
  cue: string,
  extra: boolean | Extra = false
): Exercise => {
  const e: Extra = typeof extra === 'boolean' ? { conditioning: extra } : extra;
  return { slug, name, muscle, gear, mechanic, startKg, step, needs, imageId, cue, ...e };
};

export const EXERCISES: Exercise[] = [
  // ------------------------------- Pectoraux -------------------------------
  ex('developpe-couche-barre', 'Développé couché barre', 'pectoraux', 'barre', 'polyarticulaire', 50, 2.5, ['barre-disques', 'banc-droit'], 'Barbell_Bench_Press_-_Medium_Grip', 'Omoplates serrées, pieds ancrés, la barre descend sur le bas des pectoraux.'),
  ex('developpe-couche-halteres', 'Développé couché haltères', 'pectoraux', 'halteres', 'polyarticulaire', 20, 2, ['halteres', 'banc-droit'], 'Dumbbell_Bench_Press', 'Descends jusqu\'à sentir l\'étirement, coudes à environ 45° du corps.'),
  ex('developpe-incline-halteres', 'Développé incliné haltères', 'pectoraux', 'halteres', 'polyarticulaire', 18, 2, ['halteres', 'banc-reglable'], 'Incline_Dumbbell_Press', 'Banc incliné autour de 30°, pousse en gardant les omoplates basses.'),
  ex('developpe-machine', 'Développé machine', 'pectoraux', 'machine', 'polyarticulaire', 40, 2.5, ['machines'], 'Machine_Bench_Press', 'Règle le siège pour que les poignées soient à hauteur de poitrine.'),
  ex('pompes', 'Pompes', 'pectoraux', 'poids-du-corps', 'polyarticulaire', 0, 2.5, [], 'Pushups', 'Corps gainé de la tête aux talons, poitrine proche du sol.', true),
  ex('pompes-pieds-sureleves', 'Pompes pieds surélevés', 'pectoraux', 'poids-du-corps', 'polyarticulaire', 0, 2.5, [], 'Push-Ups_With_Feet_Elevated', 'Pieds sur une surface stable, ventre serré pour ne pas cambrer.', true),
  ex('ecarte-halteres', 'Écarté haltères', 'pectoraux', 'halteres', 'isolation', 10, 2, ['halteres', 'banc-droit'], 'Dumbbell_Flyes', 'Coudes légèrement fléchis, ouvre en arc de cercle sans descendre trop bas.'),
  ex('pec-deck', 'Pec deck', 'pectoraux', 'machine', 'isolation', 35, 2.5, ['machines'], 'Butterfly', 'Rapproche les bras en contractant les pectoraux, sans hausser les épaules.'),
  ex('ecarte-poulie-vis-a-vis', 'Écarté poulie vis-à-vis', 'pectoraux', 'poulie', 'isolation', 10, 2.5, ['poulies'], 'Cable_Crossover', 'Un pas en avant, buste légèrement penché, croise les mains devant toi.'),

  // --------------------------------- Dos -----------------------------------
  ex('tractions', 'Tractions', 'dos', 'poids-du-corps', 'polyarticulaire', 0, 2.5, ['barre-traction'], 'Pullups', 'Pars bras tendus, tire les coudes vers les hanches, menton au-dessus de la barre.', true),
  ex('tractions-supination', 'Tractions supination', 'dos', 'poids-du-corps', 'polyarticulaire', 0, 2.5, ['barre-traction'], 'Chin-Up', 'Paumes vers toi, descente contrôlée jusqu\'aux bras tendus.', true),
  ex('rowing-barre', 'Rowing barre', 'dos', 'barre', 'polyarticulaire', 50, 2.5, ['barre-disques'], 'Bent_Over_Barbell_Row', 'Dos plat, buste penché, tire la barre vers le nombril.'),
  ex('tirage-vertical', 'Tirage vertical', 'dos', 'poulie', 'polyarticulaire', 50, 2.5, ['poulies'], 'Wide-Grip_Lat_Pulldown', 'Tire la barre vers le haut de la poitrine, poitrine sortie.'),
  ex('rowing-haltere-unilateral', 'Rowing haltère unilatéral', 'dos', 'halteres', 'polyarticulaire', 22, 2, ['halteres'], 'One-Arm_Dumbbell_Row', 'Une main en appui, tire le coude vers la hanche sans tourner le buste.'),
  ex('rowing-poulie-assis', 'Rowing poulie assis', 'dos', 'poulie', 'polyarticulaire', 45, 2.5, ['poulies'], 'Seated_Cable_Rows', 'Dos droit, rapproche les omoplates en fin de mouvement.'),
  ex('rowing-inverse', 'Rowing inversé', 'dos', 'poids-du-corps', 'polyarticulaire', 0, 2.5, ['barre-disques'], 'Inverted_Row', 'Corps gainé sous une barre fixe, tire la poitrine vers la barre.', true),
  ex('pull-over-poulie', 'Pull-over poulie bras tendus', 'dos', 'poulie', 'isolation', 20, 2.5, ['poulies'], 'Straight-Arm_Pulldown', 'Bras quasi tendus, ramène la barre vers les cuisses en serrant les dorsaux.'),
  ex('souleve-de-terre', 'Soulevé de terre', 'dos', 'barre', 'polyarticulaire', 70, 2.5, ['barre-disques'], 'Barbell_Deadlift', 'Dos neutre, barre contre les jambes, pousse le sol avec les pieds.'),

  // -------------------------------- Épaules --------------------------------
  ex('developpe-militaire-barre', 'Développé militaire barre', 'epaules', 'barre', 'polyarticulaire', 35, 2.5, ['barre-disques'], 'Barbell_Shoulder_Press', 'Abdos et fessiers serrés, pousse la barre à la verticale au-dessus de la tête.'),
  ex('developpe-epaules-halteres', 'Développé épaules haltères', 'epaules', 'halteres', 'polyarticulaire', 14, 2, ['halteres'], 'Dumbbell_Shoulder_Press', 'Pousse au-dessus de la tête sans cambrer le bas du dos.'),
  ex('developpe-epaules-machine', 'Développé épaules machine', 'epaules', 'machine', 'polyarticulaire', 30, 2.5, ['machines'], 'Machine_Shoulder_Military_Press', 'Dos collé au dossier, pousse sans verrouiller brutalement les coudes.'),
  ex('elevations-laterales-halteres', 'Élévations latérales haltères', 'epaules', 'halteres', 'isolation', 7, 1, ['halteres'], 'Side_Lateral_Raise', 'Monte les coudes jusqu\'à hauteur d\'épaules, sans élan.'),
  ex('elevations-laterales-poulie', 'Élévations latérales poulie', 'epaules', 'poulie', 'isolation', 5, 1.25, ['poulies'], 'Cable_Seated_Lateral_Raise', 'Tension constante : monte lentement et contrôle la descente.'),
  ex('oiseau-halteres', 'Oiseau haltères', 'epaules', 'halteres', 'isolation', 6, 1, ['halteres'], 'Reverse_Flyes', 'Buste penché, ouvre les bras en pensant aux arrières d\'épaules.'),
  ex('oiseau-machine', 'Oiseau machine', 'epaules', 'machine', 'isolation', 25, 2.5, ['machines'], 'Reverse_Machine_Flyes', 'Poitrine contre le support, écarte les bras sans hausser les épaules.'),
  ex('face-pull', 'Face pull', 'epaules', 'poulie', 'isolation', 20, 2.5, ['poulies'], 'Face_Pull', 'Tire la corde vers le visage, coudes hauts, écarte bien les mains.'),

  // -------------------------------- Biceps ---------------------------------
  ex('curl-barre', 'Curl barre', 'biceps', 'barre', 'isolation', 25, 2.5, ['barre-disques'], 'Barbell_Curl', 'Coudes collés au corps, ne balance pas le buste.'),
  ex('curl-halteres', 'Curl haltères', 'biceps', 'halteres', 'isolation', 10, 1, ['halteres'], 'Dumbbell_Bicep_Curl', 'Tourne le poignet vers le haut en montant, descente lente.'),
  ex('curl-incline-halteres', 'Curl incliné haltères', 'biceps', 'halteres', 'isolation', 8, 1, ['halteres', 'banc-reglable'], 'Incline_Dumbbell_Curl', 'Bras pendants derrière le buste pour un grand étirement du biceps.'),
  ex('curl-marteau', 'Curl marteau', 'biceps', 'halteres', 'isolation', 12, 2, ['halteres'], 'Hammer_Curls', 'Paumes face à face, travaille aussi l\'avant-bras.'),
  ex('curl-marteau-poulie', 'Curl marteau poulie corde', 'biceps', 'poulie', 'isolation', 20, 2.5, ['poulies'], 'Cable_Hammer_Curls_-_Rope_Attachment', 'Garde les coudes fixes, serre en haut du mouvement.'),
  ex('curl-pupitre-machine', 'Curl pupitre machine', 'biceps', 'machine', 'isolation', 20, 2.5, ['machines'], 'Machine_Preacher_Curls', 'Bras bien posés sur le pupitre, amplitude complète.'),

  // -------------------------------- Triceps --------------------------------
  ex('barre-au-front', 'Barre au front', 'triceps', 'barre', 'isolation', 25, 2.5, ['barre-disques', 'banc-droit'], 'EZ-Bar_Skullcrusher', 'Seuls les avant-bras bougent, coudes pointés vers le plafond.'),
  ex('extension-poulie-corde', 'Extension triceps poulie corde', 'triceps', 'poulie', 'isolation', 25, 2.5, ['poulies'], 'Triceps_Pushdown_-_Rope_Attachment', 'Coudes collés, écarte la corde en bas du mouvement.'),
  ex('extension-triceps-haltere', 'Extension triceps haltère', 'triceps', 'halteres', 'isolation', 10, 2, ['halteres'], 'Dumbbell_One-Arm_Triceps_Extension', 'Coude vers le plafond, descends l\'haltère derrière la tête.'),
  ex('kickback-triceps', 'Kickback triceps', 'triceps', 'halteres', 'isolation', 6, 1, ['halteres'], 'Tricep_Dumbbell_Kickback', 'Coude haut et fixe, étends le bras vers l\'arrière.'),
  ex('dips-sur-banc', 'Dips sur banc', 'triceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, ['banc-droit'], 'Bench_Dips', 'Mains sur le banc, descends les fesses près du banc, épaules basses.', true),
  ex('pompes-prise-serree', 'Pompes prise serrée', 'triceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, [], 'Push-Ups_-_Close_Triceps_Position', 'Mains sous les épaules, coudes le long du corps.', true),

  // ------------------------------- Quadriceps ------------------------------
  ex('squat-barre', 'Squat barre', 'quadriceps', 'barre', 'polyarticulaire', 60, 2.5, ['barre-disques'], 'Barbell_Squat', 'Genoux dans l\'axe des pieds, descends en gardant le dos neutre.'),
  ex('presse-a-cuisses', 'Presse à cuisses', 'quadriceps', 'machine', 'polyarticulaire', 100, 5, ['machines'], 'Leg_Press', 'Bas du dos plaqué, ne verrouille pas les genoux en haut.'),
  ex('hack-squat', 'Hack squat', 'quadriceps', 'machine', 'polyarticulaire', 60, 5, ['machines'], 'Hack_Squat', 'Dos au dossier, descends jusqu\'à la parallèle ou plus bas.'),
  ex('goblet-squat', 'Goblet squat kettlebell', 'quadriceps', 'kettlebell', 'polyarticulaire', 16, 4, ['kettlebells'], 'Goblet_Squat', 'Kettlebell contre la poitrine, coudes entre les genoux en bas.', true),
  ex('squat-haltere', 'Squat haltère', 'quadriceps', 'halteres', 'polyarticulaire', 16, 2, ['halteres'], 'Dumbbell_Squat', 'Haltères le long du corps, poitrine haute, pousse dans les talons.'),
  ex('fentes-statiques-halteres', 'Fentes statiques haltères', 'quadriceps', 'halteres', 'polyarticulaire', 12, 2, ['halteres'], 'Split_Squat_with_Dumbbells', 'Buste droit, genou avant au-dessus de la cheville.'),
  ex('montee-sur-banc', 'Montées sur banc haltères', 'quadriceps', 'halteres', 'polyarticulaire', 10, 2, ['halteres', 'banc-droit'], 'Dumbbell_Step_Ups', 'Pousse avec la jambe d\'appui, évite de t\'aider de l\'autre pied.'),
  ex('fentes-marchees', 'Fentes marchées', 'quadriceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, [], 'Bodyweight_Walking_Lunge', 'Grands pas, buste droit, genou arrière frôle le sol.', true),
  ex('squat-poids-du-corps', 'Squat poids du corps', 'quadriceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, [], 'Bodyweight_Squat', 'Talons au sol, descends en poussant les fesses vers l\'arrière.', true),
  ex('squat-saute', 'Squats sautés', 'quadriceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, [], 'Freehand_Jump_Squat', 'Réception souple sur la pointe des pieds, enchaîne sans te précipiter.', true),
  ex('leg-extension', 'Leg extension', 'quadriceps', 'machine', 'isolation', 40, 2.5, ['machines'], 'Leg_Extensions', 'Contracte les cuisses en haut, descente lente.'),

  // --------------------------------- Ischios -------------------------------
  ex('souleve-de-terre-roumain', 'Soulevé de terre roumain', 'ischios', 'barre', 'polyarticulaire', 60, 2.5, ['barre-disques'], 'Romanian_Deadlift', 'Genoux légèrement fléchis, pousse les fesses vers l\'arrière, dos plat.'),
  ex('souleve-de-terre-jambes-tendues-halteres', 'Soulevé de terre jambes tendues haltères', 'ischios', 'halteres', 'polyarticulaire', 18, 2, ['halteres'], 'Stiff-Legged_Dumbbell_Deadlift', 'Haltères près des jambes, étire les ischios sans arrondir le dos.'),
  ex('leg-curl-allonge', 'Leg curl allongé', 'ischios', 'machine', 'isolation', 35, 2.5, ['machines'], 'Lying_Leg_Curls', 'Hanches collées au banc, fléchis les genoux sans à-coup.'),
  ex('leg-curl-assis', 'Leg curl assis', 'ischios', 'machine', 'isolation', 35, 2.5, ['machines'], 'Seated_Leg_Curl', 'Règle le coussin sur le bas du mollet, amplitude complète.'),
  ex('swing-kettlebell', 'Swing kettlebell', 'ischios', 'kettlebell', 'polyarticulaire', 16, 4, ['kettlebells'], 'One-Arm_Kettlebell_Swings', 'Mouvement de charnière de hanches : les bras guident, les hanches propulsent.', true),

  // -------------------------------- Fessiers -------------------------------
  ex('hip-thrust-barre', 'Hip thrust barre', 'fessiers', 'barre', 'polyarticulaire', 60, 2.5, ['barre-disques', 'banc-droit'], 'Barbell_Hip_Thrust', 'Menton rentré, verrouille les hanches en haut en serrant les fessiers.'),
  ex('pont-fessier-unilateral', 'Pont fessier unilatéral', 'fessiers', 'poids-du-corps', 'isolation', 0, 2.5, [], 'Single_Leg_Glute_Bridge', 'Pousse dans le talon, bassin à plat en haut du mouvement.'),
  ex('kickback-poulie', 'Kickback fessier poulie', 'fessiers', 'poulie', 'isolation', 15, 2.5, ['poulies'], 'One-Legged_Cable_Kickback', 'Bassin stable, envoie la jambe vers l\'arrière sans cambrer.'),

  // -------------------------------- Mollets --------------------------------
  ex('mollets-debout-machine', 'Mollets debout machine', 'mollets', 'machine', 'isolation', 60, 5, ['machines'], 'Standing_Calf_Raises', 'Descends le talon bas, monte sur la pointe des pieds et marque une pause.'),
  ex('mollets-presse', 'Mollets à la presse', 'mollets', 'machine', 'isolation', 80, 5, ['machines'], 'Calf_Press_On_The_Leg_Press_Machine', 'Jambes tendues, amplitude maximale à chaque répétition.'),
  ex('mollets-assis-haltere', 'Mollets assis haltère', 'mollets', 'halteres', 'isolation', 10, 2, ['halteres', 'banc-droit'], 'Dumbbell_Seated_One-Leg_Calf_Raise', 'Haltère sur le genou, monte lentement sur la pointe du pied.'),

  // --------------------------------- Abdos ---------------------------------
  ex('crunch-poulie', 'Crunch poulie haute', 'abdos', 'poulie', 'isolation', 30, 2.5, ['poulies'], 'Cable_Crunch', 'Enroule la colonne en rapprochant les côtes du bassin.'),
  ex('releve-de-jambes-suspendu', 'Relevé de jambes suspendu', 'abdos', 'poids-du-corps', 'isolation', 0, 2.5, ['barre-traction'], 'Hanging_Leg_Raise', 'Évite de te balancer, relève le bassin en fin de mouvement.', true),
  ex('crunch', 'Crunch', 'abdos', 'poids-du-corps', 'isolation', 0, 2.5, [], 'Crunches', 'Décolle les épaules du sol, expire en montant.', true),
  ex('russian-twist', 'Russian twist', 'abdos', 'poids-du-corps', 'isolation', 0, 2.5, [], 'Russian_Twist', 'Buste incliné, tourne les épaules (pas seulement les bras).', true),
  ex('mountain-climbers', 'Mountain climbers', 'abdos', 'poids-du-corps', 'polyarticulaire', 0, 2.5, [], 'Mountain_Climbers', 'Position de pompe gainée, ramène les genoux vers la poitrine en rythme.', true),
  ex('burpees', 'Burpees', 'quadriceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, [], undefined, 'Pompe, retour des pieds sous les mains puis saut : garde un rythme régulier.', true),

  // ------------------ Renforcement des jambes : trail et course ------------------
  ex('descente-marche-excentrique', 'Descente de marche excentrique', 'quadriceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, ['box'], 'Dumbbell_Step_Ups', 'Monte à deux jambes, puis redescends sur une seule jambe en 4 secondes, sans te laisser tomber.', { technique: 'excentrique', tempo: '4-0-1', sports: ['trail', 'running'] }),
  ex('squat-tempo-poids-du-corps', 'Squat tempo lent (descente 4 s)', 'quadriceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, [], 'Bodyweight_Squat', 'Descends en 4 secondes, marque 1 seconde en bas, remonte en 1 seconde.', { technique: 'excentrique', tempo: '4-1-1', sports: ['trail', 'running'] }),
  ex('squat-tempo-barre', 'Squat tempo excentrique (barre)', 'quadriceps', 'barre', 'polyarticulaire', 50, 2.5, ['barre-disques', 'rack'], 'Barbell_Squat', 'Charge modérée : 4 secondes pour descendre, remontée puissante.', { technique: 'excentrique', tempo: '4-0-1', sports: ['trail', 'running', 'rugby', 'football'] }),
  ex('wall-sit', 'Chaise murale (isométrique)', 'quadriceps', 'poids-du-corps', 'isolation', 0, 2.5, [], undefined, 'Dos au mur, cuisses à l\'horizontale : tiens la position sans appuyer les mains sur les cuisses.', { unit: 'sec', technique: 'isometrique', sports: ['trail', 'running', 'cyclisme'] }),
  ex('fente-isometrique', 'Fente isométrique (maintien)', 'quadriceps', 'poids-du-corps', 'isolation', 0, 2.5, [], 'Split_Squat_with_Dumbbells', 'Genou avant à 90 degrés, tiens la position basse, buste droit.', { unit: 'sec', technique: 'isometrique', sports: ['trail', 'running'] }),
  ex('pont-fessier-isometrique', 'Pont fessier unilatéral isométrique', 'fessiers', 'poids-du-corps', 'isolation', 0, 2.5, [], 'Single_Leg_Glute_Bridge', 'Bassin à plat, tiens en haut en serrant le fessier.', { unit: 'sec', technique: 'isometrique', sports: ['trail', 'running', 'cyclisme'] }),
  ex('mollets-excentriques-unipodal', 'Mollets excentriques unipodaux', 'mollets', 'poids-du-corps', 'isolation', 0, 2.5, ['box'], undefined, 'Monte sur les deux pieds, redescends sur une jambe en 4 secondes, talon sous la marche.', { technique: 'excentrique', tempo: '4-0-1', sports: ['trail', 'running'] }),
  ex('releves-tibial', 'Relevés de tibial antérieur', 'mollets', 'poids-du-corps', 'isolation', 0, 2.5, [], undefined, 'Dos au mur, talons à 30 cm : relève la pointe des pieds sans plier les genoux. Protège les tibias dans les descentes.', { technique: 'concentrique', sports: ['trail', 'running'] }),
  ex('equilibre-unipodal', 'Équilibre unipodal', 'mollets', 'poids-du-corps', 'isolation', 0, 2.5, [], undefined, 'Sur une jambe, genou souple, bassin stable. Ferme les yeux quand tu le maîtrises.', { unit: 'sec', technique: 'proprioception', sports: ['trail', 'running', 'football', 'rugby', 'escalade'] }),
  ex('squat-plateau-equilibre', "Squat sur plateau d'équilibre", 'quadriceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, ['equilibre'], 'Balance_Board', "Pieds écartés largeur d'épaules, genoux dans l'axe, contrôle les oscillations.", { technique: 'proprioception', sports: ['trail', 'running', 'football', 'rugby'] }),
  ex('souleve-terre-unipodal-kettlebell', 'Soulevé de terre unipodal kettlebell', 'ischios', 'kettlebell', 'polyarticulaire', 12, 4, ['kettlebells'], 'Kettlebell_One-Legged_Deadlift', 'Hanches carrées, dos plat, jambe libre dans le prolongement du buste.', { technique: 'proprioception', sports: ['trail', 'running', 'football'] }),
  ex('squat-unipodal-box', 'Squat unipodal sur box', 'quadriceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, ['box'], 'Single-Leg_High_Box_Squat', 'Assieds-toi sur la box sur une jambe en 3 secondes, remonte sans élan.', { technique: 'excentrique', tempo: '3-0-1', sports: ['trail', 'running'] }),
  ex('saut-sur-box', 'Sauts sur box', 'quadriceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, ['box'], 'Front_Box_Jump', 'Impulsion explosive, réception souple et silencieuse, redescends en marchant.', { technique: 'concentrique', conditioning: true, sports: ['trail', 'rugby', 'football', 'pompiers'] }),
  ex('fentes-laterales', 'Fentes latérales', 'fessiers', 'poids-du-corps', 'polyarticulaire', 0, 2.5, [], undefined, "Grand pas sur le côté, fesses vers l'arrière, genou dans l'axe du pied.", { technique: 'proprioception', sports: ['trail', 'running', 'football', 'rugby', 'combat'] }),
  ex('fentes-arriere-halteres', 'Fentes arrière haltères', 'quadriceps', 'halteres', 'polyarticulaire', 12, 2, ['halteres'], 'Dumbbell_Rear_Lunge', 'Pas en arrière, tronc droit, le genou arrière frôle le sol.'),
  ex('curl-ischios-ballon', 'Curl ischios sur ballon', 'ischios', 'poids-du-corps', 'isolation', 0, 2.5, ['swiss-ball'], 'Ball_Leg_Curl', 'Hanches hautes, ramène le ballon sous les fesses, retour lent (4 secondes).', { technique: 'excentrique', tempo: '1-0-4', sports: ['trail', 'running', 'football'] }),
  ex('souleve-de-terre-trap-bar', 'Soulevé de terre trap bar', 'ischios', 'barre', 'polyarticulaire', 70, 2.5, ['trap-bar', 'disques'], 'Trap_Bar_Deadlift', 'Dos neutre, pousse le sol, hanches et épaules montent ensemble.', { sports: ['trail', 'rugby', 'football'] }),
  ex('poussee-traineau', 'Poussée de traîneau', 'quadriceps', 'poids-du-corps', 'polyarticulaire', 0, 2.5, ['traineau'], 'Sled_Push', 'Buste incliné, bras tendus, petits pas puissants.', { conditioning: true, sports: ['trail', 'rugby', 'football', 'pompiers'] }),
  ex('good-morning-elastique', 'Good morning élastique', 'ischios', 'poids-du-corps', 'isolation', 0, 2.5, ['elastiques'], 'Band_Good_Morning', 'Charnière de hanches, dos plat, élastique sous les pieds.'),
  ex('mollets-elastique', 'Mollets avec élastique', 'mollets', 'poids-du-corps', 'isolation', 0, 2.5, ['elastiques'], 'Calf_Raises_-_With_Bands', 'Amplitude complète, pause en haut.', { sports: ['trail', 'running'] }),
  ex('ecarte-elastique', 'Écarté arrière élastique', 'epaules', 'poids-du-corps', 'isolation', 0, 2.5, ['elastiques'], 'Band_Pull_Apart', "Bras tendus, écarte l'élastique en serrant les omoplates."),
  ex('tractions-assistees-elastique', 'Tractions assistées élastique', 'dos', 'poids-du-corps', 'polyarticulaire', 0, 2.5, ['barre-traction', 'elastiques'], 'Band_Assisted_Pull-Up', "Élastique sous les genoux ou les pieds, tire jusqu'au menton."),
  ex('planche', 'Planche (gainage)', 'abdos', 'poids-du-corps', 'isolation', 0, 2.5, [], 'Plank', 'Corps aligné, abdos et fessiers serrés, ne creuse pas le dos.', { unit: 'sec', technique: 'isometrique', conditioning: true }),
  ex('planche-laterale', 'Planche latérale', 'abdos', 'poids-du-corps', 'isolation', 0, 2.5, [], undefined, "Appui sur l'avant-bras, bassin haut, corps aligné.", { unit: 'sec', technique: 'isometrique' }),
  ex('dead-bug', 'Dead bug', 'abdos', 'poids-du-corps', 'isolation', 0, 2.5, [], 'Dead_Bug', 'Bas du dos plaqué au sol, bouge bras et jambe opposés lentement.', { technique: 'proprioception' }),
  ex('crunch-ballon', 'Crunch sur ballon', 'abdos', 'poids-du-corps', 'isolation', 0, 2.5, ['swiss-ball'], 'Exercise_Ball_Crunch', 'Dos calé sur le ballon, enroule le buste sans tirer sur la nuque.'),
  ex('superman', 'Superman', 'dos', 'poids-du-corps', 'isolation', 0, 2.5, [], 'Superman', "Soulève bras et jambes, nuque neutre, pause d'une seconde en haut.", true),
  ex('developpe-incline-barre', 'Développé incliné barre', 'pectoraux', 'barre', 'polyarticulaire', 40, 2.5, ['barre-disques', 'banc-reglable'], 'Barbell_Incline_Bench_Press_-_Medium_Grip', 'Banc à 30 degrés, descends la barre sur le haut de la poitrine.'),
  ex('developpe-couche-serre', 'Développé couché prise serrée', 'triceps', 'barre', 'polyarticulaire', 40, 2.5, ['barre-disques', 'banc-droit'], 'Close-Grip_Barbell_Bench_Press', "Mains à peine plus serrées que les épaules, coudes près du corps."),
];

export const EXERCISE_BY_SLUG: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.slug, e]));

export const GEAR_LABEL: Record<GearType, string> = {
  barre: 'Barre',
  halteres: 'Haltères',
  kettlebell: 'Kettlebell',
  machine: 'Machine',
  poulie: 'Poulie',
  'poids-du-corps': 'Poids du corps',
};

/** Un exercice est faisable si tout son matériel est disponible (un banc réglable remplace un banc droit). */
export function canDo(exercise: Exercise, owned: Capability[]): boolean {
  return exercise.needs.every((need) => {
    if (owned.includes(need)) return true;
    return need === 'banc-droit' && owned.includes('banc-reglable');
  });
}
