'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Armchair,
  ArrowUpToLine,
  Bike,
  Building2,
  Check,
  Circle,
  Cog,
  Dumbbell,
  Footprints,
  GripHorizontal,
  Home,
  Layers,
  Link2,
  Mountain,
  RectangleHorizontal,
  Search,
  Shield,
  SlidersHorizontal,
  Square,
  Timer,
  Triangle,
  Waves,
  Weight,
  X,
  Zap,
} from 'lucide-react';
import { useHydrated, useStore } from '@/lib/store';
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  defaultWeightsFor,
  EQUIPMENT_BY_ID,
  EQUIPMENT_CATALOG,
  EquipCategory,
  EquipItem,
  IconKey,
  itemsForPlace,
  ownedIds,
  PRESETS,
  WEIGHT_CHOICES,
  WEIGHT_TITLE,
} from '@/lib/equipment';
import { availableExercises } from '@/lib/ai-engine';

const ICONS: Record<IconKey, typeof Dumbbell> = {
  dumbbell: Dumbbell,
  weight: Weight,
  bench: Armchair,
  pullup: ArrowUpToLine,
  link: Link2,
  cog: Cog,
  grip: GripHorizontal,
  rect: RectangleHorizontal,
  bike: Bike,
  footprints: Footprints,
  activity: Activity,
  circle: Circle,
  square: Square,
  triangle: Triangle,
  timer: Timer,
  mountain: Mountain,
  zap: Zap,
  waves: Waves,
  shield: Shield,
  layers: Layers,
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

interface Props {
  /** Masque le titre quand le composant est intégré dans un écran qui a déjà le sien. */
  compact?: boolean;
}

export default function EquipmentSelector({ compact = false }: Props) {
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const setPlace = useStore((s) => s.setPlace);

  const [category, setCategory] = useState<EquipCategory | 'tout'>('tout');
  const [query, setQuery] = useState('');
  const [weightsFor, setWeightsFor] = useState<string | null>(null);

  const place = profile.place;
  const key = place === 'maison' ? 'home' : 'gym';
  const owned = ownedIds(profile);
  const items = useMemo(() => itemsForPlace(place), [place]);

  const visible = useMemo(() => {
    const q = norm(query.trim());
    return items.filter((e) => (category === 'tout' || e.category === category) && (!q || norm(e.label).includes(q)));
  }, [items, category, query]);

  const grouped = useMemo(() => {
    const map = new Map<EquipCategory, EquipItem[]>();
    for (const e of visible) map.set(e.category, [...(map.get(e.category) ?? []), e]);
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c) ?? [] }));
  }, [visible]);

  if (!hydrated) return <div className="panel h-40 animate-pulse" aria-busy="true" />;

  const setOwned = (ids: string[]) => {
    const weights = { ...profile.equipment.weights };
    const defaults = defaultWeightsFor(ids);
    for (const id of ids) if (defaults[id] && !weights[id]) weights[id] = defaults[id];
    setProfile({ equipment: { ...profile.equipment, [key]: ids, weights } });
  };

  const toggle = (id: string) => setOwned(owned.includes(id) ? owned.filter((x) => x !== id) : [...owned, id]);

  const applyPreset = (presetId: string) => {
    const p = PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setPlace(p.place);
    const ids = p.id === 'salle-complete' ? p.ids : p.ids;
    const k = p.place === 'maison' ? 'home' : 'gym';
    const weights = { ...profile.equipment.weights };
    const defaults = defaultWeightsFor(ids);
    for (const id of ids) if (defaults[id] && !weights[id]) weights[id] = defaults[id];
    setProfile({ place: p.place, equipment: { ...profile.equipment, [k]: ids, weights } });
  };

  const setWeights = (id: string, list: number[]) =>
    setProfile({ equipment: { ...profile.equipment, weights: { ...profile.equipment.weights, [id]: list } } });

  const exerciseCount = availableExercises(profile).length;
  const editing = weightsFor ? EQUIPMENT_BY_ID[weightsFor] : null;

  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h2 className="font-display text-3xl font-bold uppercase leading-none">Lieu et matériel</h2>
          <p className="mt-1 text-sm text-muted">
            Coche ce que tu as vraiment : le coach ne te proposera que des exercices réalisables avec ce matériel.
          </p>
        </div>
      )}

      {/* Lieu */}
      <div role="group" aria-label="Lieu d'entraînement" className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-panel p-1">
        {(
          [
            { id: 'maison', label: 'À la maison', Icon: Home },
            { id: 'salle', label: 'En salle', Icon: Building2 },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={place === id}
            onClick={() => setPlace(id)}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition ${place === id ? 'bg-royal text-white' : 'text-muted'}`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* Préréglages */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.filter((p) => p.place === place).map((p) => (
          <button key={p.id} type="button" onClick={() => applyPreset(p.id)} className="chip !py-1.5 text-xs">
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => setOwned(items.filter((e) => e.category !== 'accessoires').map((e) => e.id))} className="chip !py-1.5 text-xs">
          Tout cocher
        </button>
        <button type="button" onClick={() => setOwned([])} className="chip !py-1.5 text-xs">
          Tout décocher
        </button>
      </div>

      {/* Recherche et catégories */}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Rechercher parmi ${items.length} équipements`}
          className="field !pl-9"
          aria-label="Rechercher un équipement"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Catégories">
        {(['tout', ...CATEGORY_ORDER] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={`chip shrink-0 !py-1.5 text-xs ${category === c ? 'chip-on' : ''}`}
          >
            {c === 'tout' ? 'Tout' : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted" aria-live="polite">
        {owned.length} sélectionné{owned.length > 1 ? 's' : ''} sur {EQUIPMENT_CATALOG.length} références · {exerciseCount} exercices disponibles (le poids du corps est toujours inclus).
      </p>

      {/* Catalogue */}
      {grouped.length === 0 && <p className="panel p-4 text-center text-sm text-muted">Aucun équipement ne correspond à ta recherche.</p>}
      {grouped.map(({ category: cat, items: list }) => (
        <section key={cat} aria-label={CATEGORY_LABEL[cat]}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{CATEGORY_LABEL[cat]}</h3>
          <div className="grid grid-cols-2 gap-2">
            {list.map((item) => {
              const Icon = ICONS[item.icon];
              const on = owned.includes(item.id);
              const w = profile.equipment.weights[item.id] ?? [];
              return (
                <div key={item.id} className={`flex flex-col rounded-2xl border transition ${on ? 'border-cream bg-cream text-ink' : 'border-line bg-panel'}`}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(item.id)}
                    className="flex flex-1 items-start gap-2.5 p-3 text-left"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-royal text-white' : 'bg-ink text-muted'}`}>
                      <Icon size={18} />
                    </span>
                    <span className="flex-1 text-[13px] font-semibold leading-tight">{item.label}</span>
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? 'border-royal bg-royal text-white' : 'border-line'}`}
                    >
                      {on && <Check size={13} strokeWidth={3} />}
                    </span>
                  </button>
                  {on && item.weightKind && (
                    <button
                      type="button"
                      onClick={() => setWeightsFor(item.id)}
                      className="mx-3 mb-3 flex items-center justify-between gap-1 rounded-lg bg-ink/10 px-2 py-1.5 text-left text-[11px] font-bold text-ink"
                    >
                      <span className="truncate">{w.length > 0 ? `${w.length} poids : ${w[0]} à ${w[w.length - 1]} kg` : 'Choisir les poids'}</span>
                      <SlidersHorizontal size={12} className="shrink-0" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Choix précis des poids */}
      {editing && editing.weightKind && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3" onClick={() => setWeightsFor(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Poids de ${editing.label}`}
            className="card-cream max-h-[85vh] w-full max-w-md overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-2xl font-bold uppercase leading-tight">{editing.label}</h3>
              <button type="button" onClick={() => setWeightsFor(null)} aria-label="Fermer" className="rounded-full p-1.5 text-muted-ink">
                <X size={20} />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-ink">{WEIGHT_TITLE[editing.weightKind]}</p>

            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <button type="button" className="btn-outline-cream !px-3 !py-1.5" onClick={() => setWeights(editing.id, [...WEIGHT_CHOICES[editing.weightKind!]])}>
                Tout
              </button>
              <button type="button" className="btn-outline-cream !px-3 !py-1.5" onClick={() => setWeights(editing.id, WEIGHT_CHOICES[editing.weightKind!].filter((x) => x <= 20))}>
                Jusqu&apos;à 20 kg
              </button>
              <button type="button" className="btn-outline-cream !px-3 !py-1.5" onClick={() => setWeights(editing.id, [])}>
                Aucun
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {WEIGHT_CHOICES[editing.weightKind].map((w) => {
                const list = profile.equipment.weights[editing.id] ?? [];
                const sel = list.includes(w);
                return (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={sel}
                    onClick={() =>
                      setWeights(editing.id, sel ? list.filter((x) => x !== w) : [...list, w].sort((a, b) => a - b))
                    }
                    className={`min-w-[3rem] rounded-xl border px-3 py-2 text-sm font-bold tabular-nums ${
                      sel ? 'border-royal bg-royal text-white' : 'border-line-cream bg-white text-ink'
                    }`}
                  >
                    {String(w).replace('.', ',')}
                  </button>
                );
              })}
            </div>

            <button type="button" onClick={() => setWeightsFor(null)} className="btn-royal mt-4 w-full">
              Valider
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
