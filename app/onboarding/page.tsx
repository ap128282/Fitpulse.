'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Info, Minus, Plus } from 'lucide-react';
import DurationPicker from '@/components/DurationPicker';
import EquipmentSelector from '@/components/EquipmentSelector';
import RulerInput from '@/components/RulerInput';
import { useHydrated, useStore } from '@/lib/store';
import { computeTargets } from '@/lib/nutrition';
import { ownedIds } from '@/lib/equipment';
import { availableExercises } from '@/lib/ai-engine';
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
  LEVEL_DESC,
  LEVEL_LABEL,
  MUSCLE_LABEL,
  SPORT_LABEL,
  STYLE_DESC,
  STYLE_LABEL,
  STYLE_SAMPLE,
  durationLabel,
} from '@/lib/profile';
import type { Allergy, CoachingStyle, Diet, Goal, Level, Muscle, SensitiveArea, Sex, Sport } from '@/lib/types';

const STEPS = [
  { title: 'Ton objectif', hint: "Ce que tu veux construire. Tu pourras le changer à tout moment." },
  { title: 'Ton sport', hint: "FitPulse adapte les exercices à ce que tu pratiques." },
  { title: 'À propos de toi', hint: 'Ces valeurs servent à calculer tes besoins et tes charges de départ.' },
  { title: 'Tes mensurations', hint: 'Facultatif : fais glisser la règle. Elles servent à suivre ta progression.' },
  { title: 'Ton niveau', hint: 'Sois honnête, le coach ajuste les charges séance après séance.' },
  { title: 'Ton alimentation', hint: 'Les recettes et les plans respectent ton régime et tes allergies.' },
  { title: 'Ton planning', hint: 'Tu choisis les jours et la durée exacte de tes séances.' },
  { title: 'Ton matériel', hint: 'Seuls les exercices réalisables avec ce matériel te seront proposés.' },
  { title: 'Tes priorités', hint: 'Jusqu\'à 3 muscles, tes zones sensibles et le ton du coach.' },
  { title: 'Ton plan est prêt', hint: 'Voici ce que FitPulse a calculé pour toi.' },
] as const;

const EXPERIENCE = [0, 1, 2, 3, 5, 10];

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)));
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => set(value - step)} className="btn-outline !px-3" aria-label={`Diminuer : ${label}`}>
          <Minus size={16} />
        </button>
        <div className="flex items-baseline gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={text}
            aria-label={`${label} en ${unit}`}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setText(String(value));
            }}
            onChange={(e) => {
              const t = e.target.value.replace(',', '.');
              setText(t);
              const n = parseFloat(t);
              if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
            }}
            className="w-24 bg-transparent text-center font-display text-5xl font-extrabold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-royal-light"
          />
          <span className="text-sm font-semibold text-muted">{unit}</span>
        </div>
        <button type="button" onClick={() => set(value + step)} className="btn-outline !px-3" aria-label={`Augmenter : ${label}`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function Pick({ on, onClick, title, desc, extra }: { on: boolean; onClick: () => void; title: string; desc?: string; extra?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`pick ${on ? 'pick-on' : ''}`}>
      <span className="flex items-center justify-between gap-2">
        <span className="font-bold">{title}</span>
        {on && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-royal text-white">
            <Check size={12} strokeWidth={3} />
          </span>
        )}
      </span>
      {desc && <span className={`mt-0.5 block text-xs ${on ? 'text-muted-ink' : 'text-muted'}`}>{desc}</span>}
      {extra && <span className={`mt-1.5 block text-sm italic ${on ? 'text-royal' : 'text-royal-light'}`}>{extra}</span>}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const addBodyWeight = useStore((s) => s.addBodyWeight);

  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const targets = useMemo(() => computeTargets(profile), [profile]);

  if (!hydrated) return <div className="panel h-40 animate-pulse" aria-busy="true" />;

  const last = STEPS.length - 1;
  const toggleIn = <T extends string>(list: T[], v: T, max = 99): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v];

  const toggleDay = (d: number) => {
    const days = profile.availableDays.includes(d) ? profile.availableDays.filter((x) => x !== d) : [...profile.availableDays, d].sort();
    setProfile({ availableDays: days, sessionsPerWeek: Math.max(1, Math.min(7, days.length)) });
  };

  const canContinue = step !== 6 || profile.availableDays.length > 0;

  const finish = () => {
    completeOnboarding({});
    addBodyWeight(profile.weightKg);
    router.push('/dashboard');
  };

  const m = profile.measurements;
  const setMeasure = (k: keyof typeof m, v: number | undefined) => setProfile({ measurements: { ...m, [k]: v } });

  return (
    <div className="pb-28">
      {/* Progression */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
          <span>
            Étape {step + 1} sur {STEPS.length}
          </span>
          {step === 3 && (
            <button type="button" onClick={() => setStep(step + 1)} className="underline">
              Passer
            </button>
          )}
        </div>
        <div className="flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Progression de l'onboarding">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-white' : i === step ? 'bg-royal' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="font-display text-5xl font-extrabold uppercase leading-none outline-none">
        {STEPS[step].title}
      </h1>
      <p className="mb-6 mt-2 text-sm text-muted">{STEPS[step].hint}</p>

      <div className="space-y-3">
        {/* 1. Objectif */}
        {step === 0 && (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Ton prénom (facultatif)</span>
              <input value={profile.name} onChange={(e) => setProfile({ name: e.target.value.slice(0, 40) })} className="field" placeholder="Comment t'appelles-tu ?" autoComplete="given-name" />
            </label>
            {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
              <Pick key={g} on={profile.goal === g} onClick={() => setProfile({ goal: g })} title={GOAL_LABEL[g]} desc={GOAL_DESC[g]} />
            ))}
          </>
        )}

        {/* 2. Sport */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SPORTS.map((s) => (
                <button key={s} type="button" aria-pressed={profile.sport === s} onClick={() => setProfile({ sport: s as Sport })} className={`pick !p-3 text-sm font-semibold ${profile.sport === s ? 'pick-on' : ''}`}>
                  {SPORT_LABEL[s]}
                </button>
              ))}
            </div>
            {profile.sport !== 'aucun' && (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">Ton objectif sportif (facultatif)</span>
                <input value={profile.sportGoal} onChange={(e) => setProfile({ sportGoal: e.target.value.slice(0, 120) })} className="field" placeholder="Ex : trail de 50 km en juin" />
              </label>
            )}
            {(profile.sport === 'trail' || profile.sport === 'running') && (
              <p className="flex gap-2 rounded-2xl border border-line bg-panel p-3 text-xs text-muted">
                <Info size={15} className="mt-0.5 shrink-0 text-royal-light" />
                Module jambes activé : renforcement excentrique (descentes), isométrique (maintiens) et concentrique, plus des exercices de proprioception pour chevilles et genoux.
              </p>
            )}
          </>
        )}

        {/* 3. À propos */}
        {step === 2 && (
          <>
            <div role="group" aria-label="Sexe" className="grid grid-cols-2 gap-2">
              {(['homme', 'femme'] as Sex[]).map((s) => (
                <Pick key={s} on={profile.sex === s} onClick={() => setProfile({ sex: s })} title={s === 'homme' ? 'Homme' : 'Femme'} />
              ))}
            </div>
            <Stepper label="Âge" value={profile.age} min={14} max={90} unit="ans" onChange={(age) => setProfile({ age })} />
            <Stepper label="Poids" value={profile.weightKg} min={30} max={300} step={0.5} unit="kg" onChange={(weightKg) => setProfile({ weightKg })} />
            <Stepper label="Taille" value={profile.heightCm} min={120} max={230} unit="cm" onChange={(heightCm) => setProfile({ heightCm })} />
            <p className="text-xs text-muted">Le sexe et l&apos;âge servent uniquement à estimer ton métabolisme de base (formule de Mifflin-St Jeor).</p>
          </>
        )}

        {/* 4. Mensurations */}
        {step === 3 && (
          <>
            <RulerInput label="Tour de poitrine" value={m.chestCm} min={60} max={150} start={95} onChange={(v) => setMeasure('chestCm', v)} />
            <RulerInput label="Tour de taille" value={m.waistCm} min={50} max={140} start={80} onChange={(v) => setMeasure('waistCm', v)} />
            <RulerInput label="Tour de hanches" value={m.hipsCm} min={60} max={150} start={95} onChange={(v) => setMeasure('hipsCm', v)} />
            <RulerInput label="Tour de bras" value={m.armCm} min={20} max={55} start={32} major={5} onChange={(v) => setMeasure('armCm', v)} />
            <RulerInput label="Tour de cuisse" value={m.thighCm} min={35} max={90} start={55} major={5} onChange={(v) => setMeasure('thighCm', v)} />
          </>
        )}

        {/* 5. Niveau */}
        {step === 4 && (
          <>
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
              <Pick key={l} on={profile.level === l} onClick={() => setProfile({ level: l })} title={LEVEL_LABEL[l]} desc={LEVEL_DESC[l]} />
            ))}
            <div className="rounded-2xl border border-line bg-panel p-4">
              <p className="mb-2 text-sm font-semibold">Années de pratique</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Années de pratique">
                {EXPERIENCE.map((y) => (
                  <button key={y} type="button" aria-pressed={profile.experienceYears === y} onClick={() => setProfile({ experienceYears: y })} className={`chip ${profile.experienceYears === y ? 'chip-on' : ''}`}>
                    {y === 0 ? 'Aucune' : y === 10 ? '10 ans et +' : `${y} an${y > 1 ? 's' : ''}`}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 6. Alimentation */}
        {step === 5 && (
          <>
            {(Object.keys(DIET_LABEL) as Diet[]).map((d) => (
              <Pick key={d} on={profile.diet === d} onClick={() => setProfile({ diet: d })} title={DIET_LABEL[d]} />
            ))}
            <div className="rounded-2xl border border-line bg-panel p-4">
              <p className="mb-2 text-sm font-semibold">Allergies et intolérances</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Allergies et intolérances">
                {ALL_ALLERGIES.map((a) => (
                  <button key={a} type="button" aria-pressed={profile.allergies.includes(a)} onClick={() => setProfile({ allergies: toggleIn<Allergy>(profile.allergies, a) })} className={`chip ${profile.allergies.includes(a) ? 'chip-on' : ''}`}>
                    {ALLERGY_LABEL[a]}
                  </button>
                ))}
              </div>
            </div>
            <p className="flex gap-2 text-xs text-muted">
              <Info size={15} className="mt-0.5 shrink-0 text-royal-light" />
              Ces informations restent sur ton appareil. Elles ne sont envoyées au coach IA (Google Gemini) que lorsque tu lui écris.
            </p>
          </>
        )}

        {/* 7. Planning */}
        {step === 6 && (
          <>
            <div className="rounded-2xl border border-line bg-panel p-4">
              <p className="mb-2 text-sm font-semibold">Jours disponibles</p>
              <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Jours disponibles">
                {DAY_LABELS.map((d, i) => (
                  <button key={d} type="button" aria-pressed={profile.availableDays.includes(i)} onClick={() => toggleDay(i)} className={`rounded-xl border py-3 text-xs font-bold transition ${profile.availableDays.includes(i) ? 'border-cream bg-cream text-ink' : 'border-line text-muted'}`}>
                    {d}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted" aria-live="polite">
                {profile.availableDays.length === 0 ? 'Choisis au moins un jour.' : `${profile.availableDays.length} séance${profile.availableDays.length > 1 ? 's' : ''} par semaine.`}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-4">
              <DurationPicker value={profile.duration} onChange={(duration) => setProfile({ duration })} />
            </div>
          </>
        )}

        {/* 8. Matériel */}
        {step === 7 && <EquipmentSelector compact />}

        {/* 9. Priorités */}
        {step === 8 && (
          <>
            <div className="rounded-2xl border border-line bg-panel p-4">
              <p className="mb-1 text-sm font-semibold">Muscles prioritaires (3 maximum)</p>
              <p className="mb-2 text-xs text-muted">Un réglage par défaut : tu pourras toujours demander au coach une séance sur n&apos;importe quel autre muscle.</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Muscles prioritaires">
                {ALL_MUSCLES.map((mu) => {
                  const on = profile.priorityMuscles.includes(mu);
                  return (
                    <button key={mu} type="button" aria-pressed={on} disabled={!on && profile.priorityMuscles.length >= 3} onClick={() => setProfile({ priorityMuscles: toggleIn<Muscle>(profile.priorityMuscles, mu, 3) })} className={`chip disabled:opacity-40 ${on ? 'chip-on' : ''}`}>
                      {MUSCLE_LABEL[mu]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-4">
              <p className="mb-1 text-sm font-semibold">Zones sensibles</p>
              <p className="mb-2 text-xs text-muted">Le coach évite les exercices qui les sollicitent fortement. Ce n&apos;est pas un avis médical.</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Zones sensibles">
                {ALL_AREAS.map((a) => (
                  <button key={a} type="button" aria-pressed={profile.sensitiveAreas.includes(a)} onClick={() => setProfile({ sensitiveAreas: toggleIn<SensitiveArea>(profile.sensitiveAreas, a) })} className={`chip ${profile.sensitiveAreas.includes(a) ? 'chip-on' : ''}`}>
                    {AREA_LABEL[a]}
                  </button>
                ))}
              </div>
            </div>
            <p className="pt-1 text-sm font-semibold">Style du coach</p>
            {(Object.keys(STYLE_LABEL) as CoachingStyle[]).map((s) => (
              <Pick key={s} on={profile.coachingStyle === s} onClick={() => setProfile({ coachingStyle: s })} title={STYLE_LABEL[s]} desc={STYLE_DESC[s]} extra={`« ${STYLE_SAMPLE[s]} »`} />
            ))}
          </>
        )}

        {/* 10. Récapitulatif */}
        {step === last && (
          <>
            <div className="card-cream overflow-hidden">
              <div className="tricolor h-1.5" />
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-royal">Objectif quotidien estimé</p>
                <p className="font-display text-6xl font-extrabold leading-none tabular-nums">
                  {targets.kcal.toLocaleString('fr-FR')} <span className="text-2xl text-muted-ink">kcal</span>
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Protéines', value: targets.protein },
                    { label: 'Glucides', value: targets.carbs },
                    { label: 'Lipides', value: targets.fat },
                  ].map((x) => (
                    <div key={x.label} className="rounded-xl bg-white p-3 ring-1 ring-line-cream">
                      <p className="font-display text-3xl font-bold tabular-nums">{x.value} g</p>
                      <p className="text-xs text-muted-ink">{x.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-ink">{targets.note}</p>
              </div>
            </div>

            <ul className="panel divide-y divide-line text-sm">
              {[
                ['Objectif', GOAL_LABEL[profile.goal]],
                ['Sport', SPORT_LABEL[profile.sport]],
                ['Niveau', LEVEL_LABEL[profile.level]],
                ['Planning', `${profile.availableDays.length} séance${profile.availableDays.length > 1 ? 's' : ''} par semaine, ${durationLabel(profile.duration)}`],
                ['Lieu', profile.place === 'maison' ? 'À la maison' : 'En salle'],
                ['Matériel', `${ownedIds(profile).length} équipements, ${availableExercises(profile).length} exercices disponibles`],
                ['Alimentation', DIET_LABEL[profile.diet]],
                ['Coach', STYLE_LABEL[profile.coachingStyle]],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-muted">{k}</span>
                  <span className="text-right font-semibold">{v}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2 px-4 py-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="btn-outline !px-4" aria-label="Étape précédente">
              <ArrowLeft size={18} />
            </button>
          )}
          {step < last ? (
            <button type="button" disabled={!canContinue} onClick={() => setStep(step + 1)} className="btn-royal flex-1 text-lg">
              Continuer
              <ArrowRight size={18} />
            </button>
          ) : (
            <button type="button" onClick={finish} className="btn-royal flex-1 text-lg">
              Commencer FitPulse
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
