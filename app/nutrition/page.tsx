'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Copy, Minus, Plus, RefreshCw, ShoppingBasket, Trash2, X } from 'lucide-react';
import AddFoodSheet from '@/components/AddFoodSheet';
import { dayKey, useHydrated, useStore } from '@/lib/store';
import {
  computeTargets,
  dayMacros,
  FOOD_BY_ID,
  generatePlan,
  MEAL_LABEL,
  MEAL_ORDER,
  RECIPE_BY_ID,
  RECIPES,
  recipeAllowed,
  recipeMacros,
  recipeTags,
  Recipe,
  RecipeTag,
  shoppingList,
  TAG_LABEL,
} from '@/lib/nutrition';
import { DIET_LABEL } from '@/lib/profile';
import type { MealType } from '@/lib/types';

type Tab = 'journal' | 'plans' | 'recettes' | 'courses';

const TABS: { id: Tab; label: string }[] = [
  { id: 'journal', label: 'Journal' },
  { id: 'plans', label: 'Plans' },
  { id: 'recettes', label: 'Recettes' },
  { id: 'courses', label: 'Courses' },
];

const fmt1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta, 12);
  return dayKey(date);
}

function dayTitle(key: string): string {
  const today = dayKey(new Date());
  if (key === today) return "Aujourd'hui";
  if (key === shiftDay(today, -1)) return 'Hier';
  if (key === shiftDay(today, 1)) return 'Demain';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ---------------------------------------------------------------------------
// Anneaux de progression
// ---------------------------------------------------------------------------

function Ring({ value, max, size, stroke, color, children, label }: { value: number; max: number; size: number; stroke: number; color: string; children?: React.ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2E3A47" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} style={{ transition: 'stroke-dashoffset 0.5s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visuel de recette (carte typographique, sans photo)
// ---------------------------------------------------------------------------

const TILE: Record<MealType, string> = {
  'petit-dejeuner': 'bg-cream text-ink',
  dejeuner: 'bg-royal text-white',
  diner: 'bg-panel text-white ring-1 ring-line',
  collation: 'bg-ember text-white',
};

function RecipeTile({ recipe, tall = false }: { recipe: Recipe; tall?: boolean }) {
  return (
    <div className={`relative flex flex-col justify-end overflow-hidden rounded-xl p-3 ${TILE[recipe.meal]} ${tall ? 'h-32' : 'h-20 w-20 shrink-0'}`} aria-hidden="true">
      <span className="absolute inset-x-0 top-0 h-1 tricolor opacity-80" />
      <span className={`font-display font-extrabold uppercase leading-none ${tall ? 'text-2xl' : 'text-[13px]'}`}>{tall ? recipe.name : MEAL_LABEL[recipe.meal]}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Détail d'une recette
// ---------------------------------------------------------------------------

function RecipeSheet({ recipe, initialPortion = 1, onClose }: { recipe: Recipe; initialPortion?: number; onClose: () => void }) {
  const addMeal = useStore((s) => s.addMeal);
  const [portion, setPortion] = useState(initialPortion);
  const [meal, setMeal] = useState<MealType>(recipe.meal);
  const [done, setDone] = useState(false);
  const macros = recipeMacros(recipe, portion);
  const tags = recipeTags(recipe);

  const add = () => {
    addMeal({
      date: dayKey(new Date()),
      meal,
      name: portion === 1 ? recipe.name : `${recipe.name} (×${fmt1(portion)})`,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      source: 'recette',
    });
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={recipe.name} className="card-cream max-h-[88vh] w-full max-w-md overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-display text-3xl font-bold uppercase leading-none">{recipe.name}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted-ink">
            <X size={20} />
          </button>
        </div>
        <RecipeTile recipe={recipe} tall />
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-ink">
          <Clock size={13} />
          {recipe.minutes} min · {MEAL_LABEL[recipe.meal]}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">{TAG_LABEL[t]}</span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-line-cream">
          <span className="text-sm font-semibold">Portions</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPortion(Math.max(0.5, portion - 0.25))} className="btn-outline-cream !px-2.5 !py-1.5" aria-label="Moins de portion"><Minus size={14} /></button>
            <span className="w-12 text-center font-display text-2xl font-bold tabular-nums">{fmt1(portion)}</span>
            <button type="button" onClick={() => setPortion(Math.min(4, portion + 0.25))} className="btn-outline-cream !px-2.5 !py-1.5" aria-label="Plus de portion"><Plus size={14} /></button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            { l: 'kcal', v: macros.kcal },
            { l: 'Prot.', v: `${fmt1(macros.protein)} g` },
            { l: 'Gluc.', v: `${fmt1(macros.carbs)} g` },
            { l: 'Lip.', v: `${fmt1(macros.fat)} g` },
          ].map((x) => (
            <div key={x.l} className="rounded-xl bg-white p-2 ring-1 ring-line-cream">
              <p className="font-display text-xl font-bold tabular-nums">{x.v}</p>
              <p className="text-[11px] text-muted-ink">{x.l}</p>
            </div>
          ))}
        </div>

        <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide text-muted-ink">Ingrédients</h4>
        <ul className="space-y-1 text-sm">
          {recipe.ingredients.map(([id, g]) => {
            const label = FOOD_BY_ID[id]?.name ?? id;
            return (
              <li key={id} className="flex justify-between border-b border-line-cream py-1">
                <span>{label}</span>
                <span className="tabular-nums text-muted-ink">{Math.round(g * portion)} g</span>
              </li>
            );
          })}
        </ul>

        <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide text-muted-ink">Préparation</h4>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {recipe.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>

        <div className="mt-4 flex gap-2">
          <select value={meal} onChange={(e) => setMeal(e.target.value as MealType)} aria-label="Repas" className="rounded-xl border border-line-cream bg-white px-3 text-sm font-semibold">
            {MEAL_ORDER.map((m) => (
              <option key={m} value={m}>{MEAL_LABEL[m]}</option>
            ))}
          </select>
          <button type="button" onClick={add} className="btn-royal flex-1">
            <Plus size={16} />
            {done ? 'Ajouté au journal' : "Ajouter au journal d'aujourd'hui"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NutritionPage() {
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const meals = useStore((s) => s.meals);
  const removeMeal = useStore((s) => s.removeMeal);
  const addMeal = useStore((s) => s.addMeal);
  const plan = useStore((s) => s.plan);
  const setPlan = useStore((s) => s.setPlan);
  const checked = useStore((s) => s.shoppingChecked);
  const toggleShopping = useStore((s) => s.toggleShopping);
  const resetShopping = useStore((s) => s.resetShopping);

  const [tab, setTab] = useState<Tab>('journal');
  const [date, setDate] = useState(dayKey(new Date()));
  const [sheetMeal, setSheetMeal] = useState<MealType | null>(null);
  const [recipeOpen, setRecipeOpen] = useState<{ recipe: Recipe; portion: number } | null>(null);
  const [planDay, setPlanDay] = useState(0);
  const [genDays, setGenDays] = useState(7);
  const [genMeals, setGenMeals] = useState<3 | 4>(4);
  const [genKcal, setGenKcal] = useState<number | null>(null);
  const [tagFilter, setTagFilter] = useState<RecipeTag | null>(null);
  const [mealFilter, setMealFilter] = useState<MealType | null>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [kcalEdit, setKcalEdit] = useState('');

  const targets = useMemo(() => computeTargets(profile), [profile]);
  const allowed = useMemo(() => RECIPES.filter((r) => recipeAllowed(r, profile.diet, profile.allergies)), [profile.diet, profile.allergies]);
  const shopping = useMemo(() => (plan ? shoppingList(plan) : []), [plan]);

  if (!hydrated) return <div className="panel h-40 animate-pulse" aria-busy="true" />;

  const dayMeals = meals.filter((m) => m.date === date);
  const totals = dayMeals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.protein, c: a.c + m.carbs, f: a.f + m.fat }), { kcal: 0, p: 0, c: 0, f: 0 });
  const remaining = targets.kcal - totals.kcal;

  const recipes = allowed.filter((r) => {
    if (mealFilter && r.meal !== mealFilter) return false;
    if (tagFilter && !recipeTags(r).includes(tagFilter)) return false;
    if (search.trim() && !r.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const kcalForPlan = genKcal ?? targets.kcal;
  const shoppingTotal = shopping.reduce((n, g) => n + g.items.length, 0);
  const shoppingDone = shopping.reduce((n, g) => n + g.items.filter((i) => checked[i.key]).length, 0);

  const copyList = async () => {
    const text = shopping.map((g) => `${g.aisle}\n${g.items.map((i) => `- ${i.name} : ${i.grams} g`).join('\n')}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const day = plan?.days[planDay];
  const dayTotals = day ? dayMacros(day) : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none">Nutrition</h1>
        <p className="mt-1 text-sm text-muted">
          Objectif : {targets.kcal.toLocaleString('fr-FR')} kcal · {DIET_LABEL[profile.diet]}
        </p>
      </header>

      <div role="tablist" aria-label="Sections nutrition" className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-panel p-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-xl py-2.5 text-sm font-bold transition ${tab === t.id ? 'bg-royal text-white' : 'text-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ------------------------------ Journal ------------------------------ */}
      {tab === 'journal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setDate(shiftDay(date, -1))} className="btn-outline !px-3" aria-label="Jour précédent"><ChevronLeft size={18} /></button>
            <p className="font-display text-2xl font-bold uppercase" aria-live="polite">{dayTitle(date)}</p>
            <button type="button" onClick={() => setDate(shiftDay(date, 1))} className="btn-outline !px-3" aria-label="Jour suivant"><ChevronRight size={18} /></button>
          </div>

          <section className="panel p-4" aria-label="Bilan du jour">
            <div className="flex items-center gap-4">
              <Ring value={totals.kcal} max={targets.kcal} size={132} stroke={12} color={remaining < 0 ? '#E11D48' : '#1A56DB'} label={`${totals.kcal} calories sur ${targets.kcal}`}>
                <span className="font-display text-3xl font-extrabold tabular-nums">{totals.kcal}</span>
                <span className="text-[11px] text-muted">/ {targets.kcal} kcal</span>
              </Ring>
              <div className="flex-1 space-y-2">
                {[
                  { l: 'Protéines', v: totals.p, m: targets.protein, c: '#1A56DB' },
                  { l: 'Glucides', v: totals.c, m: targets.carbs, c: '#FFFFFF' },
                  { l: 'Lipides', v: totals.f, m: targets.fat, c: '#E11D48' },
                ].map((x) => (
                  <div key={x.l}>
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold">{x.l}</span>
                      <span className="tabular-nums text-muted">{Math.round(x.v)} / {x.m} g</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink" role="progressbar" aria-valuemin={0} aria-valuemax={x.m} aria-valuenow={Math.round(x.v)} aria-label={x.l}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (x.v / Math.max(1, x.m)) * 100)}%`, background: x.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-sm" aria-live="polite">
              {remaining >= 0 ? <><span className="font-bold">{remaining}</span> kcal restantes</> : <span className="font-bold text-ember">{-remaining} kcal au-dessus de l&apos;objectif</span>}
            </p>
          </section>

          {MEAL_ORDER.map((meal) => {
            const list = dayMeals.filter((m) => m.meal === meal);
            const sum = list.reduce((n, m) => n + m.kcal, 0);
            return (
              <section key={meal} className="panel p-3" aria-label={MEAL_LABEL[meal]}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold uppercase">{MEAL_LABEL[meal]}</h2>
                  <span className="text-sm tabular-nums text-muted">{sum} kcal</span>
                </div>
                {list.length === 0 && <p className="mb-2 text-xs text-muted">Rien d&apos;ajouté.</p>}
                <ul className="space-y-1.5">
                  {list.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{m.name}</p>
                        <p className="text-xs tabular-nums text-muted">{m.grams ? `${m.grams} g · ` : ''}P {fmt1(m.protein)} · G {fmt1(m.carbs)} · L {fmt1(m.fat)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold tabular-nums">{m.kcal}</span>
                        <button type="button" onClick={() => removeMeal(m.id)} aria-label={`Supprimer ${m.name}`} className="text-muted"><Trash2 size={15} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => setSheetMeal(meal)} className="mt-2 flex items-center gap-1.5 text-sm font-bold text-royal-light">
                  <Plus size={16} />
                  Ajouter
                </button>
              </section>
            );
          })}

          <section className="panel p-4">
            <h2 className="mb-1 font-display text-xl font-bold uppercase">Objectif calorique</h2>
            <p className="mb-3 text-xs text-muted">{targets.note}</p>
            <div className="flex gap-2">
              <input value={kcalEdit} onChange={(e) => setKcalEdit(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder={`${targets.kcal} (calculé)`} className="field flex-1" aria-label="Objectif calorique personnalisé" />
              <button type="button" className="btn-outline" onClick={() => { const n = parseInt(kcalEdit, 10); if (n >= 1200 && n <= 5000) { setProfile({ calorieTarget: n }); setKcalEdit(''); } }}>
                Appliquer
              </button>
            </div>
            {profile.calorieTarget && (
              <button type="button" onClick={() => setProfile({ calorieTarget: undefined })} className="mt-2 text-xs font-semibold text-muted underline">
                Revenir au calcul automatique
              </button>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------- Plans ------------------------------- */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <section className="panel space-y-4 p-4">
            <h2 className="font-display text-2xl font-bold uppercase">Générer un plan de repas</h2>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Objectif quotidien</p>
              <div className="flex items-center justify-between gap-3">
                <button type="button" className="btn-outline !px-3" onClick={() => setGenKcal(Math.max(1200, kcalForPlan - 50))} aria-label="Moins 50 calories"><Minus size={16} /></button>
                <p className="font-display text-4xl font-extrabold tabular-nums">{kcalForPlan} <span className="text-base text-muted">kcal</span></p>
                <button type="button" className="btn-outline !px-3" onClick={() => setGenKcal(Math.min(5000, kcalForPlan + 50))} aria-label="Plus 50 calories"><Plus size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Durée</p>
                <div className="flex gap-1" role="group" aria-label="Nombre de jours">
                  {[3, 5, 7].map((d) => (
                    <button key={d} type="button" aria-pressed={genDays === d} onClick={() => setGenDays(d)} className={`chip flex-1 !px-1 text-center ${genDays === d ? 'chip-on' : ''}`}>{d} j</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Repas par jour</p>
                <div className="flex gap-1" role="group" aria-label="Repas par jour">
                  {([3, 4] as const).map((n) => (
                    <button key={n} type="button" aria-pressed={genMeals === n} onClick={() => setGenMeals(n)} className={`chip flex-1 !px-1 text-center ${genMeals === n ? 'chip-on' : ''}`}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted">{allowed.length} recettes compatibles avec ton régime ({DIET_LABEL[profile.diet]}) et tes allergies.</p>
            <button
              type="button"
              disabled={allowed.length < 4}
              onClick={() => { setPlan(generatePlan(profile, kcalForPlan, genDays, genMeals, Date.now())); setPlanDay(0); }}
              className="btn-royal w-full disabled:opacity-40"
            >
              <RefreshCw size={16} />
              {plan ? 'Générer un nouveau plan' : 'Générer le plan'}
            </button>
            {allowed.length < 4 && <p role="alert" className="text-xs font-semibold text-ember">Pas assez de recettes compatibles avec tes réglages alimentaires.</p>}
          </section>

          {plan && day && dayTotals && (
            <section className="space-y-3" aria-label="Plan actif">
              <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Jours du plan">
                {plan.days.map((_, i) => (
                  <button key={i} type="button" role="tab" aria-selected={planDay === i} onClick={() => setPlanDay(i)} className={`chip shrink-0 ${planDay === i ? 'chip-on' : ''}`}>Jour {i + 1}</button>
                ))}
              </div>

              <div className="card-cream p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-royal">Total du jour</p>
                <p className="font-display text-3xl font-extrabold tabular-nums">{dayTotals.kcal} kcal <span className="text-sm font-semibold text-muted-ink">P {fmt1(dayTotals.protein)} · G {fmt1(dayTotals.carbs)} · L {fmt1(dayTotals.fat)}</span></p>
              </div>

              <ul className="space-y-2">
                {day.map((m, i) => {
                  const r = RECIPE_BY_ID[m.recipeId];
                  if (!r) return null;
                  const mac = recipeMacros(r, m.portion);
                  return (
                    <li key={i} className="panel flex items-center gap-3 p-3">
                      <RecipeTile recipe={r} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-royal-light">{MEAL_LABEL[m.meal]}</p>
                        <button type="button" onClick={() => setRecipeOpen({ recipe: r, portion: m.portion })} className="block max-w-full truncate text-left text-sm font-bold underline-offset-2 hover:underline">{r.name}</button>
                        <p className="text-xs tabular-nums text-muted">×{fmt1(m.portion)} · {mac.kcal} kcal · P {fmt1(mac.protein)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addMeal({ date: dayKey(new Date()), meal: m.meal, name: `${r.name} (×${fmt1(m.portion)})`, kcal: mac.kcal, protein: mac.protein, carbs: mac.carbs, fat: mac.fat, source: 'recette' })}
                        className="btn-outline !px-2.5 !py-2 text-xs"
                        aria-label={`Ajouter ${r.name} au journal d'aujourd'hui`}
                      >
                        <Plus size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button type="button" onClick={() => setPlan(null)} className="text-xs font-semibold text-muted underline">Supprimer ce plan</button>
            </section>
          )}
        </div>
      )}

      {/* ------------------------------ Recettes ------------------------------ */}
      {tab === 'recettes' && (
        <div className="space-y-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Rechercher parmi ${allowed.length} recettes`} className="field" aria-label="Rechercher une recette" />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtres de régime">
            <button type="button" aria-pressed={tagFilter === null} onClick={() => setTagFilter(null)} className={`chip shrink-0 !py-1.5 text-xs ${tagFilter === null ? 'chip-on' : ''}`}>Tous</button>
            {(Object.keys(TAG_LABEL) as RecipeTag[]).map((t) => (
              <button key={t} type="button" aria-pressed={tagFilter === t} onClick={() => setTagFilter(tagFilter === t ? null : t)} className={`chip shrink-0 !py-1.5 text-xs ${tagFilter === t ? 'chip-on' : ''}`}>{TAG_LABEL[t]}</button>
            ))}
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtres de repas">
            {MEAL_ORDER.map((m) => (
              <button key={m} type="button" aria-pressed={mealFilter === m} onClick={() => setMealFilter(mealFilter === m ? null : m)} className={`chip shrink-0 !py-1.5 text-xs ${mealFilter === m ? 'chip-on' : ''}`}>{MEAL_LABEL[m]}</button>
            ))}
          </div>
          <p className="text-xs text-muted" aria-live="polite">{recipes.length} recette{recipes.length > 1 ? 's' : ''} · macros calculées à partir des ingrédients</p>
          <ul className="space-y-2">
            {recipes.map((r) => {
              const mac = recipeMacros(r);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setRecipeOpen({ recipe: r, portion: 1 })} className="panel flex w-full items-center gap-3 p-3 text-left">
                    <RecipeTile recipe={r} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{r.name}</p>
                      <p className="text-xs text-muted"><Clock size={11} className="mr-1 inline" />{r.minutes} min</p>
                      <p className="text-xs tabular-nums text-muted"><span className="font-bold text-white">{mac.kcal} kcal</span> · P {fmt1(mac.protein)} · G {fmt1(mac.carbs)} · L {fmt1(mac.fat)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {recipes.length === 0 && <p className="panel p-4 text-center text-sm text-muted">Aucune recette ne correspond à ces filtres.</p>}
        </div>
      )}

      {/* ------------------------------ Courses ------------------------------ */}
      {tab === 'courses' && (
        <div className="space-y-4">
          {!plan ? (
            <div className="panel p-5 text-center">
              <ShoppingBasket size={28} className="mx-auto mb-2 text-royal-light" />
              <p className="font-bold">Pas encore de liste de courses</p>
              <p className="mt-1 text-sm text-muted">Génère un plan de repas : la liste se crée toute seule, avec les quantités additionnées.</p>
              <button type="button" onClick={() => setTab('plans')} className="btn-royal mt-4">Créer un plan</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted" aria-live="polite">{shoppingDone} / {shoppingTotal} articles cochés</p>
                <div className="flex gap-2">
                  <button type="button" onClick={copyList} className="btn-outline !px-3 !py-2 text-xs"><Copy size={14} />{copied ? 'Copié' : 'Copier'}</button>
                  <button type="button" onClick={resetShopping} className="btn-outline !px-3 !py-2 text-xs">Tout décocher</button>
                </div>
              </div>
              {shopping.map((g) => (
                <section key={g.aisle} className="panel p-3" aria-label={g.aisle}>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{g.aisle}</h2>
                  <ul className="space-y-1">
                    {g.items.map((i) => (
                      <li key={i.key}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1.5">
                          <input type="checkbox" checked={!!checked[i.key]} onChange={() => toggleShopping(i.key)} className="h-5 w-5 accent-[#1A56DB]" />
                          <span className={`flex-1 text-sm ${checked[i.key] ? 'text-muted line-through' : 'font-semibold'}`}>{i.name}</span>
                          <span className="text-sm tabular-nums text-muted">{i.grams >= 1000 ? `${fmt1(i.grams / 1000)} kg` : `${i.grams} g`}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </div>
      )}

      {sheetMeal && <AddFoodSheet meal={sheetMeal} date={date} onClose={() => setSheetMeal(null)} />}
      {recipeOpen && <RecipeSheet recipe={recipeOpen.recipe} initialPortion={recipeOpen.portion} onClose={() => setRecipeOpen(null)} />}
    </div>
  );
}
