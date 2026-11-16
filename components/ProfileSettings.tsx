'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulse, Info, Plus, RotateCcw } from 'lucide-react';
import DurationPicker from './DurationPicker';
import EquipmentSelector from './EquipmentSelector';
import { useHydrated, useStore } from '@/lib/store';
import {
  ALL_ALLERGIES,
  ALL_AREAS,
  ALL_MUSCLES,
  ALL_SPORTS,
  ALLERGY_LABEL,
  AREA_LABEL,
  DAY_LABELS,
  DIET_LABEL,
  GOAL_DESC,
  GOAL_LABEL,
  LEVEL_LABEL,
  MUSCLE_LABEL,
  SPORT_LABEL,
  STYLE_DESC,
  STYLE_LABEL,
  STYLE_SAMPLE,
} from '@/lib/profile';
import type { Allergy, CoachingStyle, Diet, Goal, Level, Measurements, Muscle, SensitiveArea, Sex, Sport } from '@/lib/types';

// ---------------------------------------------------------------------------
// Petits composants
// ---------------------------------------------------------------------------

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel space-y-4 p-4">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-wide">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{children}</p>;
}

function NumField({
  label,
  value,
  unit,
  min,
  max,
  optional = false,
  onCommit,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  min: number;
  max: number;
  optional?: boolean;
  onCommit: (v: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value === undefined ? '' : String(value));
  }, [value, focused]);

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const t = e.target.value.replace(',', '.');
            setText(t);
            if (t === '') {
              if (optional) onCommit(undefined);
              return;
            }
            const n = parseFloat(t);
            if (Number.isFinite(n) && n >= min && n <= max) onCommit(n);
          }}
          className="field pr-10 tabular-nums"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
    </label>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-xl bg-ink p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-2 text-sm font-bold transition ${value === o.value ? 'bg-royal text-white' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function toggleIn<T extends string>(list: T[], v: T, max = 99): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v];
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function ProfileSettings() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const addBodyWeight = useStore((s) => s.addBodyWeight);
  const [weightSaved, setWeightSaved] = useState(false);

  if (!hydrated) return <div className="panel h-40 animate-pulse" aria-busy="true" />;

  const setMeasure = (key: keyof Measurements, v: number | undefined) => setProfile({ measurements: { ...profile.measurements, [key]: v } });

  const toggleDay = (d: number) => {
    const days = profile.availableDays.includes(d) ? profile.availableDays.filter((x) => x !== d) : [...profile.availableDays, d].sort();
    if (days.length === 0) return;
    setProfile({ availableDays: days, sessionsPerWeek: Math.min(7, days.length) });
  };

  const saveWeight = () => {
    addBodyWeight(profile.weightKg);
    setWeightSaved(true);
    setTimeout(() => setWeightSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Identité */}
      <section className="panel flex items-center gap-4 p-4">
        <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-royal font-display text-3xl font-extrabold">
          {(profile.name.trim()[0] ?? 'F').toUpperCase()}
        </div>
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-semibold text-muted">Prénom</span>
          <input value={profile.name} onChange={(e) => setProfile({ name: e.target.value.slice(0, 40) })} placeholder="Ton prénom" className="field" />
        </label>
      </section>

      {/* Profil sportif */}
      <Section title="Profil sportif">
        <div>
          <Label>Niveau</Label>
          <Segmented<Level>
            label="Niveau"
            value={profile.level}
            onChange={(level) => setProfile({ level })}
            options={(Object.keys(LEVEL_LABEL) as Level[]).map((v) => ({ value: v, label: LEVEL_LABEL[v] }))}
          />
        </div>

        <div>
          <Label>Objectif</Label>
          <div className="space-y-2">
            {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => {
              const on = profile.goal === g;
              return (
                <button key={g} type="button" aria-pressed={on} onClick={() => setProfile({ goal: g })} className={`pick ${on ? 'pick-on' : ''}`}>
                  <span className="font-bold">{GOAL_LABEL[g]}</span>
                  <span className={`mt-0.5 block text-xs ${on ? 'text-muted-ink' : 'text-muted'}`}>{GOAL_DESC[g]}</span>
                </button>
              );
            })}
          </div>
          {profile.goal === 'pompiers' && (
            <p className="mt-2 flex gap-2 rounded-xl bg-ink p-3 text-xs text-muted">
              <Info size={15} className="mt-0.5 shrink-0 text-royal-light" />
              FitPulse travaille ta force-endurance. Consulte le détail officiel des épreuves de sélection et ajoute de la course à pied : l&apos;application ne remplace pas ta préparation cardio.
            </p>
          )}
        </div>

        <div>
          <Label>Sport pratiqué</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_SPORTS.map((s) => (
              <button key={s} type="button" aria-pressed={profile.sport === s} onClick={() => setProfile({ sport: s as Sport })} className={`chip !py-1.5 text-xs ${profile.sport === s ? 'chip-on' : ''}`}>
                {SPORT_LABEL[s]}
              </button>
            ))}
          </div>
          {profile.sport !== 'aucun' && (
            <input value={profile.sportGoal} onChange={(e) => setProfile({ sportGoal: e.target.value.slice(0, 120) })} className="field mt-2" placeholder="Objectif sportif (ex : trail de 50 km en juin)" aria-label="Objectif sportif" />
          )}
          {(profile.sport === 'trail' || profile.sport === 'running') && (
            <p className="mt-2 flex gap-2 rounded-xl bg-ink p-3 text-xs text-muted">
              <Info size={15} className="mt-0.5 shrink-0 text-royal-light" />
              Module jambes actif : excentrique, isométrique, concentrique et proprioception sont intégrés à tes séances jambes.
            </p>
          )}
        </div>

        <div>
          <Label>Jours d&apos;entraînement</Label>
          <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Jours d'entraînement">
            {DAY_LABELS.map((d, i) => (
              <button key={d} type="button" aria-pressed={profile.availableDays.includes(i)} onClick={() => toggleDay(i)} className={`rounded-xl border py-2.5 text-xs font-bold transition ${profile.availableDays.includes(i) ? 'border-cream bg-cream text-ink' : 'border-line text-muted'}`}>
                {d}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{profile.sessionsPerWeek} séance{profile.sessionsPerWeek > 1 ? 's' : ''} par semaine</p>
        </div>

        <div>
          <Label>Durée d&apos;une séance (à la minute près)</Label>
          <div className="rounded-xl bg-ink p-3">
            <DurationPicker value={profile.duration} onChange={(duration) => setProfile({ duration })} />
          </div>
        </div>

        <div>
          <Label>Muscles prioritaires (3 maximum)</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_MUSCLES.map((m) => {
              const on = profile.priorityMuscles.includes(m);
              return (
                <button key={m} type="button" aria-pressed={on} onClick={() => setProfile({ priorityMuscles: toggleIn<Muscle>(profile.priorityMuscles, m, 3) })} disabled={!on && profile.priorityMuscles.length >= 3} className={`chip disabled:opacity-40 ${on ? 'chip-on' : ''}`}>
                  {MUSCLE_LABEL[m]}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-muted">Un réglage par défaut : tu peux toujours demander au coach une séance sur un autre muscle.</p>
        </div>

        <div>
          <Label>Zones sensibles</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_AREAS.map((a) => (
              <button key={a} type="button" aria-pressed={profile.sensitiveAreas.includes(a)} onClick={() => setProfile({ sensitiveAreas: toggleIn<SensitiveArea>(profile.sensitiveAreas, a) })} className={`chip !py-1.5 text-xs ${profile.sensitiveAreas.includes(a) ? 'chip-on' : ''}`}>
                {AREA_LABEL[a]}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Style du coach */}
      <Section title="Style du coach IA">
        <div className="space-y-2">
          {(Object.keys(STYLE_LABEL) as CoachingStyle[]).map((s) => {
            const on = profile.coachingStyle === s;
            return (
              <button key={s} type="button" aria-pressed={on} onClick={() => setProfile({ coachingStyle: s })} className={`pick ${on ? 'pick-on' : ''}`}>
                <span className="font-bold">{STYLE_LABEL[s]}</span>
                <span className={`mt-0.5 block text-xs ${on ? 'text-muted-ink' : 'text-muted'}`}>{STYLE_DESC[s]}</span>
                <span className={`mt-1.5 block text-sm italic ${on ? 'text-royal' : 'text-royal-light'}`}>« {STYLE_SAMPLE[s]} »</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Lieu & matériel */}
      <section className="panel p-4">
        <EquipmentSelector />
      </section>

      {/* Santé & physio */}
      <Section title="Santé et physique" icon={<HeartPulse size={22} className="text-ember" />}>
        <div>
          <Label>Sexe (pour estimer le métabolisme)</Label>
          <Segmented<Sex>
            label="Sexe"
            value={profile.sex}
            onChange={(sex) => setProfile({ sex })}
            options={[
              { value: 'homme', label: 'Homme' },
              { value: 'femme', label: 'Femme' },
            ]}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="Âge" unit="ans" min={14} max={90} value={profile.age} onCommit={(v) => v !== undefined && setProfile({ age: Math.round(v) })} />
          <NumField label="Poids" unit="kg" min={30} max={300} value={profile.weightKg} onCommit={(v) => v !== undefined && setProfile({ weightKg: v })} />
          <NumField label="Taille" unit="cm" min={120} max={230} value={profile.heightCm} onCommit={(v) => v !== undefined && setProfile({ heightCm: v })} />
        </div>

        <button type="button" onClick={saveWeight} className="btn-outline w-full text-sm">
          <Plus size={16} />
          {weightSaved ? 'Ajouté à la courbe' : 'Ajouter ce poids à la courbe de progression'}
        </button>

        <div>
          <Label>Mensurations (facultatif)</Label>
          <div className="grid grid-cols-2 gap-3">
            <NumField optional label="Poitrine" unit="cm" min={40} max={250} value={profile.measurements.chestCm} onCommit={(v) => setMeasure('chestCm', v)} />
            <NumField optional label="Taille (tour)" unit="cm" min={40} max={250} value={profile.measurements.waistCm} onCommit={(v) => setMeasure('waistCm', v)} />
            <NumField optional label="Hanches" unit="cm" min={40} max={250} value={profile.measurements.hipsCm} onCommit={(v) => setMeasure('hipsCm', v)} />
            <NumField optional label="Bras" unit="cm" min={15} max={80} value={profile.measurements.armCm} onCommit={(v) => setMeasure('armCm', v)} />
            <NumField optional label="Cuisse" unit="cm" min={25} max={120} value={profile.measurements.thighCm} onCommit={(v) => setMeasure('thighCm', v)} />
          </div>
        </div>

        <p className="flex gap-2 rounded-xl bg-ink p-3 text-xs text-muted">
          <Info size={15} className="mt-0.5 shrink-0 text-royal-light" />
          La synchronisation automatique avec Apple Santé ou Google Fit n&apos;est pas possible depuis une application web : saisis ton poids ici, il alimente la courbe de progression.
        </p>
      </Section>

      {/* Alimentation */}
      <Section title="Alimentation">
        <div>
          <Label>Régime</Label>
          <Segmented<Diet>
            label="Régime alimentaire"
            value={profile.diet}
            onChange={(diet) => setProfile({ diet })}
            options={(Object.keys(DIET_LABEL) as Diet[]).map((v) => ({ value: v, label: DIET_LABEL[v] }))}
          />
        </div>
        <div>
          <Label>Allergies et intolérances</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_ALLERGIES.map((a) => (
              <button key={a} type="button" aria-pressed={profile.allergies.includes(a)} onClick={() => setProfile({ allergies: toggleIn<Allergy>(profile.allergies, a) })} className={`chip !py-1.5 text-xs ${profile.allergies.includes(a) ? 'chip-on' : ''}`}>
                {ALLERGY_LABEL[a]}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <button
        type="button"
        onClick={() => {
          setProfile({ onboarded: false });
          router.push('/onboarding');
        }}
        className="btn-outline w-full"
      >
        <RotateCcw size={16} />
        Refaire le questionnaire de départ
      </button>

      <p className="text-center text-xs text-muted">Modifications enregistrées automatiquement sur cet appareil.</p>
    </div>
  );
}
