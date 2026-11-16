import type { Allergy, Diet, MealPlan, MealType, PlanMeal, UserProfile } from './types';

// ---------------------------------------------------------------------------
// Types et libellés
// ---------------------------------------------------------------------------

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type FoodFlag = 'viande' | 'poisson' | 'laitier' | 'oeuf' | 'gluten' | 'fruits-a-coque' | 'soja' | 'sesame' | 'miel';

export type Aisle =
  | 'Fruits et légumes'
  | 'Féculents et pain'
  | 'Viandes et poissons'
  | 'Produits laitiers et œufs'
  | 'Légumineuses et protéines végétales'
  | 'Épicerie, huiles et oléagineux';

export interface Food {
  id: string;
  name: string;
  /** Valeurs pour 100 g. */
  kcal: number;
  p: number;
  c: number;
  f: number;
  aisle: Aisle;
  flags: FoodFlag[];
}

export interface Recipe {
  id: string;
  name: string;
  meal: MealType;
  minutes: number;
  /** [identifiant d'aliment, grammes pour 1 portion] */
  ingredients: [string, number][];
  steps: string[];
}

export const MEAL_LABEL: Record<MealType, string> = {
  'petit-dejeuner': 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
  collation: 'Collation',
};

export const MEAL_ORDER: MealType[] = ['petit-dejeuner', 'dejeuner', 'diner', 'collation'];

export type RecipeTag = 'vegetarien' | 'pescetarien' | 'vegan' | 'sans-gluten' | 'sans-lactose' | 'proteine';

export const TAG_LABEL: Record<RecipeTag, string> = {
  vegetarien: 'Végétarien',
  pescetarien: 'Pescétarien',
  vegan: 'Végétalien',
  'sans-gluten': 'Sans gluten',
  'sans-lactose': 'Sans lactose',
  proteine: 'Riche en protéines',
};

// ---------------------------------------------------------------------------
// Aliments (valeurs usuelles pour 100 g, arrondies)
// ---------------------------------------------------------------------------

const fd = (id: string, name: string, kcal: number, p: number, c: number, f: number, aisle: Aisle, flags: FoodFlag[] = []): Food => ({
  id, name, kcal, p, c, f, aisle, flags,
});

const FEC: Aisle = 'Féculents et pain';
const VIA: Aisle = 'Viandes et poissons';
const LAI: Aisle = 'Produits laitiers et œufs';
const FRU: Aisle = 'Fruits et légumes';
const LEG: Aisle = 'Légumineuses et protéines végétales';
const EPI: Aisle = 'Épicerie, huiles et oléagineux';

export const FOODS: Food[] = [
  fd('avoine', "Flocons d'avoine", 370, 13, 60, 7, FEC, ['gluten']),
  fd('riz-basmati', 'Riz basmati cuit', 130, 2.7, 28, 0.3, FEC),
  fd('riz-complet', 'Riz complet cuit', 123, 2.7, 25.6, 1, FEC),
  fd('pates', 'Pâtes cuites', 158, 5.8, 31, 0.9, FEC, ['gluten']),
  fd('pates-completes', 'Pâtes complètes cuites', 150, 6, 29, 1.2, FEC, ['gluten']),
  fd('pain-complet', 'Pain complet', 250, 10, 45, 3.5, FEC, ['gluten']),
  fd('quinoa', 'Quinoa cuit', 120, 4.4, 21, 1.9, FEC),
  fd('patate-douce', 'Patate douce cuite', 90, 2, 20.7, 0.1, FEC),
  fd('pomme-de-terre', 'Pomme de terre cuite', 87, 1.9, 20, 0.1, FEC),
  fd('semoule', 'Semoule cuite', 112, 3.8, 23, 0.2, FEC, ['gluten']),
  fd('tortilla', 'Tortilla de blé', 300, 8, 50, 7, FEC, ['gluten']),
  fd('galette-riz', 'Galette de riz', 387, 8, 81, 2.8, FEC),

  fd('lentilles', 'Lentilles cuites', 116, 9, 20, 0.4, LEG),
  fd('pois-chiches', 'Pois chiches cuits', 164, 8.9, 27, 2.6, LEG),
  fd('haricots-rouges', 'Haricots rouges cuits', 127, 8.7, 22.8, 0.5, LEG),
  fd('tofu', 'Tofu ferme', 144, 15.8, 2.8, 8.7, LEG, ['soja']),
  fd('tempeh', 'Tempeh', 192, 20, 7.6, 11, LEG, ['soja']),
  fd('seitan', 'Seitan', 370, 75, 14, 1.9, LEG, ['gluten']),
  fd('proteine-pois', 'Protéine de pois en poudre', 380, 80, 7, 6, LEG),

  fd('poulet', 'Blanc de poulet cuit', 165, 31, 0, 3.6, VIA, ['viande']),
  fd('dinde', 'Escalope de dinde cuite', 150, 29, 0, 3, VIA, ['viande']),
  fd('boeuf-hache', 'Bœuf haché 5 % cuit', 190, 27, 0, 9, VIA, ['viande']),
  fd('jambon', 'Jambon blanc', 110, 18, 1, 4, VIA, ['viande']),
  fd('saumon', 'Saumon cuit', 208, 22, 0, 13, VIA, ['poisson']),
  fd('thon', 'Thon au naturel', 116, 26, 0, 1, VIA, ['poisson']),
  fd('cabillaud', 'Cabillaud cuit', 105, 23, 0, 0.9, VIA, ['poisson']),
  fd('crevettes', 'Crevettes cuites', 99, 24, 0.2, 0.3, VIA, ['poisson']),

  fd('oeuf', 'Œuf entier', 143, 12.6, 0.7, 9.5, LAI, ['oeuf']),
  fd('yaourt-grec', 'Yaourt grec nature', 59, 10, 3.6, 0.4, LAI, ['laitier']),
  fd('skyr', 'Skyr', 63, 11, 4, 0.2, LAI, ['laitier']),
  fd('fromage-blanc', 'Fromage blanc 0 %', 45, 8, 4, 0.2, LAI, ['laitier']),
  fd('cottage', 'Cottage cheese', 98, 11, 3.4, 4.3, LAI, ['laitier']),
  fd('lait', 'Lait demi-écrémé', 46, 3.3, 4.8, 1.6, LAI, ['laitier']),
  fd('feta', 'Feta', 264, 14, 4, 21, LAI, ['laitier']),
  fd('mozzarella', 'Mozzarella', 250, 18, 1, 19, LAI, ['laitier']),
  fd('fromage-rape', 'Fromage râpé (emmental)', 380, 28, 0, 30, LAI, ['laitier']),
  fd('whey', 'Protéine de lactosérum (whey)', 380, 80, 7, 5, LAI, ['laitier']),
  fd('beurre', 'Beurre', 717, 0.9, 0.1, 81, LAI, ['laitier']),

  fd('banane', 'Banane', 89, 1.1, 23, 0.3, FRU),
  fd('pomme', 'Pomme', 52, 0.3, 14, 0.2, FRU),
  fd('myrtilles', 'Myrtilles', 57, 0.7, 14, 0.3, FRU),
  fd('fraises', 'Fraises', 32, 0.7, 7.7, 0.3, FRU),
  fd('mangue', 'Mangue', 60, 0.8, 15, 0.4, FRU),
  fd('orange', 'Orange', 47, 0.9, 12, 0.1, FRU),
  fd('tomate', 'Tomate', 18, 0.9, 3.9, 0.2, FRU),
  fd('concombre', 'Concombre', 15, 0.7, 3.6, 0.1, FRU),
  fd('carotte', 'Carotte', 41, 0.9, 10, 0.2, FRU),
  fd('brocoli', 'Brocoli cuit', 35, 2.4, 7.2, 0.4, FRU),
  fd('epinards', 'Épinards', 23, 2.9, 3.6, 0.4, FRU),
  fd('courgette', 'Courgette', 17, 1.2, 3.1, 0.3, FRU),
  fd('poivron', 'Poivron', 31, 1, 6, 0.3, FRU),
  fd('champignons', 'Champignons', 22, 3.1, 3.3, 0.3, FRU),
  fd('oignon', 'Oignon', 40, 1.1, 9.3, 0.1, FRU),
  fd('haricots-verts', 'Haricots verts cuits', 35, 1.9, 7.9, 0.3, FRU),
  fd('salade', 'Salade verte', 15, 1.4, 2.9, 0.2, FRU),
  fd('chou-fleur', 'Chou-fleur cuit', 25, 1.9, 5, 0.3, FRU),
  fd('avocat', 'Avocat', 160, 2, 9, 15, FRU),
  fd('citron', 'Citron', 29, 1.1, 9, 0.3, FRU),

  fd('huile-olive', "Huile d'olive", 884, 0, 0, 100, EPI),
  fd('beurre-cacahuete', 'Beurre de cacahuète', 588, 25, 20, 50, EPI, ['fruits-a-coque']),
  fd('amandes', 'Amandes', 579, 21, 22, 50, EPI, ['fruits-a-coque']),
  fd('noix', 'Noix', 654, 15, 14, 65, EPI, ['fruits-a-coque']),
  fd('graines-chia', 'Graines de chia', 486, 17, 42, 31, EPI),
  fd('houmous', 'Houmous', 166, 8, 14, 10, EPI, ['sesame']),
  fd('tahini', 'Purée de sésame (tahini)', 595, 17, 21, 54, EPI, ['sesame']),
  fd('miel', 'Miel', 304, 0.3, 82, 0, EPI, ['miel']),
  fd('sirop-erable', "Sirop d'érable", 260, 0, 67, 0, EPI),
  fd('cacao', 'Cacao en poudre', 228, 20, 58, 14, EPI),
  fd('lait-coco', 'Lait de coco', 197, 2, 3, 21, EPI),
  fd('sauce-tomate', 'Sauce tomate', 29, 1.4, 5.6, 0.3, EPI),
  fd('sauce-soja', 'Sauce soja', 53, 8, 5, 0.6, EPI, ['soja', 'gluten']),
  fd('boisson-soja', 'Boisson au soja', 40, 3.3, 2.5, 1.8, EPI, ['soja']),
];

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export function macrosForFood(food: Food, grams: number): Macros {
  const k = grams / 100;
  return {
    kcal: Math.round(food.kcal * k),
    protein: Math.round(food.p * k * 10) / 10,
    carbs: Math.round(food.c * k * 10) / 10,
    fat: Math.round(food.f * k * 10) / 10,
  };
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function searchFoods(query: string, limit = 12): Food[] {
  const q = norm(query.trim());
  if (!q) return [];
  return FOODS.filter((f) => norm(f.name).includes(q)).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Recettes (macros calculées automatiquement à partir des aliments)
// ---------------------------------------------------------------------------

const rc = (id: string, name: string, meal: MealType, minutes: number, ingredients: [string, number][], steps: string[]): Recipe => ({
  id, name, meal, minutes, ingredients, steps,
});

export const RECIPES: Recipe[] = [
  // Petits-déjeuners
  rc('porridge-banane', 'Porridge banane et miel', 'petit-dejeuner', 8, [['avoine', 60], ['lait', 200], ['banane', 100], ['miel', 10]], ['Fais chauffer le lait avec les flocons 4 à 5 minutes en remuant.', 'Ajoute la banane écrasée et le miel.']),
  rc('porridge-vegan', 'Porridge myrtilles et beurre de cacahuète', 'petit-dejeuner', 8, [['avoine', 60], ['boisson-soja', 250], ['myrtilles', 80], ['beurre-cacahuete', 15], ['sirop-erable', 10]], ['Chauffe la boisson au soja avec les flocons 5 minutes.', 'Termine avec les myrtilles, le beurre de cacahuète et le sirop.']),
  rc('skyr-granola', 'Skyr, avoine et fraises', 'petit-dejeuner', 5, [['skyr', 200], ['avoine', 30], ['fraises', 100], ['amandes', 15]], ['Verse le skyr dans un bol.', 'Ajoute les flocons, les fraises coupées et les amandes concassées.']),
  rc('omelette-epinards', 'Omelette épinards et feta', 'petit-dejeuner', 10, [['oeuf', 150], ['epinards', 80], ['feta', 30], ['pain-complet', 60], ['huile-olive', 5]], ['Fais tomber les épinards dans l\'huile 2 minutes.', 'Ajoute les œufs battus et la feta, cuis à feu doux.', 'Sers avec le pain.']),
  rc('tartines-avocat-oeuf', 'Tartines avocat et œufs', 'petit-dejeuner', 10, [['pain-complet', 80], ['avocat', 70], ['oeuf', 100], ['tomate', 50]], ['Fais griller le pain et écrase l\'avocat dessus.', 'Cuis les œufs au plat ou pochés et dépose-les avec les tomates.']),
  rc('pancakes-proteines', 'Pancakes banane et avoine', 'petit-dejeuner', 15, [['avoine', 50], ['oeuf', 100], ['banane', 100], ['whey', 20]], ['Mixe tous les ingrédients jusqu\'à obtenir une pâte lisse.', 'Cuis de petites galettes 2 minutes par face à la poêle antiadhésive.']),
  rc('brouille-tofu', 'Tofu brouillé aux épinards', 'petit-dejeuner', 12, [['tofu', 150], ['epinards', 60], ['pain-complet', 60], ['huile-olive', 5], ['sauce-soja', 5]], ['Émiette le tofu et fais-le dorer dans l\'huile 5 minutes.', 'Ajoute les épinards et la sauce soja, sers avec le pain grillé.']),
  rc('fromage-blanc-fruits', 'Fromage blanc, myrtilles et noix', 'petit-dejeuner', 4, [['fromage-blanc', 250], ['myrtilles', 80], ['noix', 15], ['miel', 10]], ['Mélange le fromage blanc avec les myrtilles.', 'Ajoute les noix et le miel.']),

  // Déjeuners
  rc('poulet-riz-brocoli', 'Poulet, riz et brocoli', 'dejeuner', 25, [['poulet', 150], ['riz-basmati', 200], ['brocoli', 150], ['huile-olive', 10]], ['Cuis le riz et le brocoli.', 'Fais dorer le poulet coupé en dés dans l\'huile.', 'Assemble le tout dans une assiette.']),
  rc('bowl-saumon-quinoa', 'Bowl saumon et quinoa', 'dejeuner', 20, [['saumon', 130], ['quinoa', 150], ['avocat', 60], ['concombre', 80], ['citron', 10]], ['Cuis le quinoa.', 'Dispose le saumon, l\'avocat et le concombre en tranches.', 'Arrose de jus de citron.']),
  rc('pates-thon-tomate', 'Pâtes au thon et à la tomate', 'dejeuner', 15, [['pates', 250], ['thon', 100], ['sauce-tomate', 100], ['huile-olive', 5]], ['Cuis les pâtes.', 'Réchauffe la sauce avec le thon émietté, mélange avec les pâtes.']),
  rc('wrap-dinde', 'Wrap dinde et crudités', 'dejeuner', 10, [['tortilla', 70], ['dinde', 100], ['salade', 40], ['tomate', 60], ['yaourt-grec', 40]], ['Étale le yaourt sur la tortilla.', 'Ajoute la dinde, la salade et la tomate, puis roule.']),
  rc('salade-lentilles-feta', 'Salade de lentilles et feta', 'dejeuner', 10, [['lentilles', 200], ['feta', 50], ['tomate', 100], ['concombre', 80], ['huile-olive', 10], ['oignon', 20]], ['Mélange les lentilles avec les légumes coupés.', 'Ajoute la feta émiettée et l\'huile.']),
  rc('curry-pois-chiches', 'Curry de pois chiches au lait de coco', 'dejeuner', 25, [['pois-chiches', 200], ['riz-basmati', 180], ['sauce-tomate', 100], ['oignon', 50], ['lait-coco', 50]], ['Fais revenir l\'oignon, ajoute la sauce tomate et le lait de coco.', 'Ajoute les pois chiches, laisse mijoter 10 minutes, sers avec le riz.']),
  rc('boeuf-patate-douce', 'Bœuf haché, patate douce et haricots verts', 'dejeuner', 25, [['boeuf-hache', 150], ['patate-douce', 250], ['haricots-verts', 150], ['huile-olive', 5]], ['Cuis la patate douce et les haricots verts.', 'Fais saisir le bœuf haché à la poêle 6 minutes.']),
  rc('buddha-bowl-tempeh', 'Buddha bowl tempeh et sésame', 'dejeuner', 25, [['tempeh', 120], ['riz-complet', 180], ['carotte', 80], ['chou-fleur', 100], ['tahini', 15]], ['Cuis le riz et le chou-fleur.', 'Fais dorer le tempeh en dés.', 'Assemble avec la carotte râpée et nappe de purée de sésame.']),
  rc('poke-thon', 'Poke bowl au thon', 'dejeuner', 15, [['riz-basmati', 180], ['thon', 100], ['avocat', 60], ['concombre', 60], ['sauce-soja', 10]], ['Cuis le riz.', 'Dispose le thon, l\'avocat et le concombre, assaisonne de sauce soja.']),

  // Dîners
  rc('cabillaud-legumes', 'Cabillaud, pommes de terre et courgettes', 'diner', 25, [['cabillaud', 180], ['pomme-de-terre', 200], ['courgette', 150], ['huile-olive', 8], ['citron', 10]], ['Cuis les pommes de terre à l\'eau.', 'Poêle les courgettes et le cabillaud dans l\'huile.', 'Ajoute le citron.']),
  rc('poulet-quinoa-poivrons', 'Poulet, quinoa et poivrons', 'diner', 25, [['poulet', 150], ['quinoa', 150], ['poivron', 120], ['oignon', 40], ['huile-olive', 8]], ['Cuis le quinoa.', 'Fais revenir poivron, oignon et poulet en dés dans l\'huile.']),
  rc('tofu-saute-legumes', 'Tofu sauté, riz et légumes', 'diner', 20, [['tofu', 200], ['riz-basmati', 180], ['brocoli', 120], ['poivron', 80], ['sauce-soja', 15], ['huile-olive', 8]], ['Fais dorer le tofu en cubes.', 'Ajoute les légumes et la sauce soja, sers avec le riz.']),
  rc('crevettes-semoule', 'Crevettes, semoule et courgettes', 'diner', 20, [['crevettes', 150], ['semoule', 180], ['courgette', 120], ['tomate', 80], ['huile-olive', 8]], ['Poêle les courgettes et la tomate.', 'Ajoute les crevettes 3 minutes, sers sur la semoule.']),
  rc('dinde-pates-completes', 'Dinde, pâtes complètes et champignons', 'diner', 20, [['dinde', 150], ['pates-completes', 200], ['champignons', 100], ['sauce-tomate', 80], ['fromage-rape', 15]], ['Cuis les pâtes.', 'Fais sauter la dinde et les champignons, ajoute la sauce.', 'Parsème de fromage.']),
  rc('saumon-patate-douce', 'Saumon, patate douce et épinards', 'diner', 25, [['saumon', 140], ['patate-douce', 200], ['epinards', 100], ['huile-olive', 5]], ['Cuis la patate douce.', 'Poêle ou four le saumon 10 minutes, fais tomber les épinards.']),
  rc('chili-vegan', 'Chili sin carne', 'diner', 30, [['haricots-rouges', 200], ['riz-complet', 150], ['poivron', 100], ['sauce-tomate', 150], ['oignon', 50]], ['Fais revenir oignon et poivron, ajoute sauce et haricots.', 'Laisse mijoter 15 minutes, sers avec le riz.']),
  rc('omelette-mozza-courgette', 'Omelette mozzarella et courgette', 'diner', 15, [['oeuf', 200], ['mozzarella', 40], ['courgette', 120], ['salade', 50], ['pain-complet', 50]], ['Fais revenir la courgette, ajoute les œufs battus.', 'Ajoute la mozzarella en fin de cuisson, sers avec la salade et le pain.']),
  rc('steak-hache-riz', 'Steak haché, riz et haricots verts', 'diner', 20, [['boeuf-hache', 150], ['riz-basmati', 180], ['haricots-verts', 150]], ['Cuis le riz et les haricots verts.', 'Fais cuire le steak à la poêle.']),
  rc('seitan-legumes', 'Seitan sauté aux légumes', 'diner', 20, [['seitan', 100], ['riz-complet', 150], ['brocoli', 120], ['carotte', 80], ['sauce-soja', 10], ['huile-olive', 8]], ['Fais dorer le seitan en lamelles.', 'Ajoute les légumes émincés et la sauce soja, sers avec le riz.']),

  // Collations
  rc('yaourt-noix', 'Yaourt grec, noix et miel', 'collation', 3, [['yaourt-grec', 170], ['noix', 20], ['miel', 10]], ['Verse le yaourt dans un bol.', 'Ajoute les noix et le miel.']),
  rc('banane-cacahuete', 'Banane et beurre de cacahuète', 'collation', 2, [['banane', 120], ['beurre-cacahuete', 20]], ['Coupe la banane en rondelles et tartine de beurre de cacahuète.']),
  rc('shake-banane', 'Shake protéiné banane', 'collation', 3, [['whey', 30], ['lait', 250], ['banane', 100]], ['Mixe tous les ingrédients jusqu\'à obtenir une texture lisse.']),
  rc('houmous-carottes', 'Houmous et bâtonnets de carotte', 'collation', 5, [['houmous', 60], ['carotte', 150], ['galette-riz', 20]], ['Coupe les carottes en bâtonnets.', 'Sers avec le houmous et la galette de riz.']),
  rc('galette-avocat', 'Galettes de riz à l\'avocat', 'collation', 4, [['galette-riz', 30], ['avocat', 60], ['tomate', 50]], ['Écrase l\'avocat sur les galettes.', 'Ajoute la tomate en rondelles.']),
  rc('pomme-amandes', 'Pomme et amandes', 'collation', 2, [['pomme', 180], ['amandes', 25]], ['Croque la pomme avec une poignée d\'amandes.']),
  rc('cottage-mangue', 'Cottage cheese et mangue', 'collation', 3, [['cottage', 150], ['mangue', 100]], ['Mélange le cottage cheese avec la mangue coupée en dés.']),
  rc('energy-balls', 'Boules d\'énergie avoine et cacahuète', 'collation', 10, [['avoine', 40], ['beurre-cacahuete', 20], ['sirop-erable', 10], ['cacao', 8]], ['Mélange tous les ingrédients et forme 4 boules.', 'Place-les 30 minutes au frais.']),
  rc('smoothie-vegan', 'Smoothie myrtilles et protéine de pois', 'collation', 4, [['boisson-soja', 250], ['banane', 100], ['proteine-pois', 25], ['myrtilles', 60]], ['Mixe tous les ingrédients jusqu\'à obtenir une boisson lisse.']),
];

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

export function recipeMacros(recipe: Recipe, portion = 1): Macros {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const [id, grams] of recipe.ingredients) {
    const food = FOOD_BY_ID[id];
    if (!food) continue;
    const k = (grams * portion) / 100;
    kcal += food.kcal * k;
    protein += food.p * k;
    carbs += food.c * k;
    fat += food.f * k;
  }
  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

export function recipeFlags(recipe: Recipe): Set<FoodFlag> {
  const set = new Set<FoodFlag>();
  for (const [id] of recipe.ingredients) FOOD_BY_ID[id]?.flags.forEach((f) => set.add(f));
  return set;
}

export function recipeTags(recipe: Recipe): RecipeTag[] {
  const flags = recipeFlags(recipe);
  const tags: RecipeTag[] = [];
  const noMeat = !flags.has('viande');
  const noFish = !flags.has('poisson');
  if (noMeat && noFish) tags.push('vegetarien');
  if (noMeat) tags.push('pescetarien');
  if (noMeat && noFish && !flags.has('laitier') && !flags.has('oeuf') && !flags.has('miel')) tags.push('vegan');
  if (!flags.has('gluten')) tags.push('sans-gluten');
  if (!flags.has('laitier')) tags.push('sans-lactose');
  const m = recipeMacros(recipe);
  if (m.kcal > 0 && (m.protein * 4) / m.kcal >= 0.28) tags.push('proteine');
  return tags;
}

const ALLERGY_FLAG: Record<Allergy, FoodFlag> = {
  gluten: 'gluten',
  lactose: 'laitier',
  oeufs: 'oeuf',
  'fruits-a-coque': 'fruits-a-coque',
  poisson: 'poisson',
  soja: 'soja',
  sesame: 'sesame',
};

/** Une recette est proposée seulement si elle respecte le régime et les allergies du profil. */
export function recipeAllowed(recipe: Recipe, diet: Diet, allergies: Allergy[]): boolean {
  const flags = recipeFlags(recipe);
  if (allergies.some((a) => flags.has(ALLERGY_FLAG[a]))) return false;
  if (diet === 'vegetarien' && (flags.has('viande') || flags.has('poisson'))) return false;
  if (diet === 'pescetarien' && flags.has('viande')) return false;
  if (diet === 'vegan' && (flags.has('viande') || flags.has('poisson') || flags.has('laitier') || flags.has('oeuf') || flags.has('miel'))) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Objectifs caloriques et macros (estimation, formule de Mifflin-St Jeor)
// ---------------------------------------------------------------------------

export interface NutritionTargets extends Macros {
  bmr: number;
  tdee: number;
  note: string;
}

const ACTIVITY_BY_SESSIONS: Record<number, number> = { 1: 1.3, 2: 1.375, 3: 1.45, 4: 1.55, 5: 1.6, 6: 1.7, 7: 1.75 };

export function computeTargets(p: UserProfile): NutritionTargets {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'homme' ? 5 : -161);
  let factor = ACTIVITY_BY_SESSIONS[Math.min(7, Math.max(1, p.sessionsPerWeek))] ?? 1.5;
  if (p.sport === 'trail' || p.sport === 'running' || p.sport === 'cyclisme') factor += 0.05;
  const tdee = bmr * factor;

  const minor = p.age < 18;
  let adjust = 0;
  if (p.goal === 'masse') adjust = Math.min(350, tdee * 0.1);
  else if (p.goal === 'affinement') adjust = minor ? 0 : -Math.min(500, tdee * 0.15);
  else if (p.goal === 'performance' || p.goal === 'pompiers') adjust = tdee * 0.03;

  const floor = Math.max(bmr, p.sex === 'femme' ? 1200 : 1500);
  let kcal = Math.max(floor, tdee + adjust);
  if (p.calorieTarget) kcal = p.calorieTarget;
  kcal = Math.round(kcal / 10) * 10;

  const gPerKg = p.goal === 'affinement' ? 2.0 : p.goal === 'masse' ? 1.8 : p.goal === 'pompiers' ? 1.7 : 1.6;
  const protein = Math.round(Math.min(2.2, gPerKg) * p.weightKg);
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  const note = minor
    ? "Tu as moins de 18 ans : FitPulse ne propose jamais de déficit calorique. Parles-en à un professionnel de santé avant de changer ton alimentation."
    : "Estimation indicative, ce n'est pas un avis médical. Ajuste selon l'évolution de ton poids sur 2 à 3 semaines.";

  return { kcal, protein, carbs, fat, bmr: Math.round(bmr), tdee: Math.round(tdee), note };
}

// ---------------------------------------------------------------------------
// Plans de repas et liste de courses
// ---------------------------------------------------------------------------

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

const SPLIT_4: Record<MealType, number> = { 'petit-dejeuner': 0.25, dejeuner: 0.35, diner: 0.3, collation: 0.1 };
const SPLIT_3: Record<MealType, number> = { 'petit-dejeuner': 0.28, dejeuner: 0.38, diner: 0.34, collation: 0 };

export function generatePlan(
  profile: Pick<UserProfile, 'diet' | 'allergies'>,
  kcalTarget: number,
  days = 7,
  mealsPerDay: 3 | 4 = 4,
  seed = Date.now()
): MealPlan {
  const rand = mulberry32(seed);
  const allowed = RECIPES.filter((r) => recipeAllowed(r, profile.diet, profile.allergies));
  const split = mealsPerDay === 4 ? SPLIT_4 : SPLIT_3;
  const used = new Map<string, number>();
  const meals: MealType[] = mealsPerDay === 4 ? MEAL_ORDER : ['petit-dejeuner', 'dejeuner', 'diner'];
  const plan: PlanMeal[][] = [];

  for (let d = 0; d < days; d++) {
    const day: PlanMeal[] = [];
    for (const meal of meals) {
      let pool = allowed.filter((r) => r.meal === meal);
      if (pool.length === 0) pool = allowed.filter((r) => (meal === 'collation' ? r.meal === 'collation' : r.meal !== 'collation' && r.meal !== 'petit-dejeuner'));
      if (pool.length === 0) continue;
      const pick = pool
        .map((r) => ({ r, s: rand() - (used.get(r.id) ?? 0) * 0.7 }))
        .sort((a, b) => b.s - a.s)[0].r;
      used.set(pick.id, (used.get(pick.id) ?? 0) + 1);
      const base = recipeMacros(pick).kcal || 1;
      const portion = Math.min(2.5, Math.max(0.5, Math.round(((kcalTarget * split[meal]) / base) * 4) / 4));
      day.push({ meal, recipeId: pick.id, portion });
    }
    plan.push(day);
  }

  return {
    id: Math.random().toString(36).slice(2, 10),
    createdAt: new Date().toISOString(),
    kcalTarget,
    diet: profile.diet,
    days: plan,
  };
}

export function dayMacros(day: PlanMeal[]): Macros {
  return day.reduce<Macros>(
    (acc, m) => {
      const r = RECIPE_BY_ID[m.recipeId];
      if (!r) return acc;
      const x = recipeMacros(r, m.portion);
      return { kcal: acc.kcal + x.kcal, protein: acc.protein + x.protein, carbs: acc.carbs + x.carbs, fat: acc.fat + x.fat };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export interface ShoppingItem {
  key: string;
  name: string;
  grams: number;
  aisle: Aisle;
}

/** Liste de courses : quantités additionnées sur tous les repas du plan, arrondies aux 10 g supérieurs. */
export function shoppingList(plan: MealPlan): { aisle: Aisle; items: ShoppingItem[] }[] {
  const totals = new Map<string, number>();
  for (const day of plan.days) {
    for (const m of day) {
      const r = RECIPE_BY_ID[m.recipeId];
      if (!r) continue;
      for (const [id, grams] of r.ingredients) totals.set(id, (totals.get(id) ?? 0) + grams * m.portion);
    }
  }
  const groups = new Map<Aisle, ShoppingItem[]>();
  for (const [id, grams] of totals) {
    const food = FOOD_BY_ID[id];
    if (!food) continue;
    const item: ShoppingItem = { key: id, name: food.name, grams: Math.ceil(grams / 10) * 10, aisle: food.aisle };
    groups.set(food.aisle, [...(groups.get(food.aisle) ?? []), item]);
  }
  const order: Aisle[] = [
    'Fruits et légumes', 'Féculents et pain', 'Viandes et poissons', 'Produits laitiers et œufs',
    'Légumineuses et protéines végétales', 'Épicerie, huiles et oléagineux',
  ];
  return order
    .filter((a) => groups.has(a))
    .map((aisle) => ({ aisle, items: (groups.get(aisle) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'fr')) }));
}
