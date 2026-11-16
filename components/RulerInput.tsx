'use client';

import { Minus, Plus } from 'lucide-react';

interface Props {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  /** Valeur de départ du curseur quand rien n'est saisi. */
  start: number;
  unit?: string;
  /** Graduation majeure tous les « major » pas. */
  major?: number;
  onChange: (v: number | undefined) => void;
  optional?: boolean;
}

/** Règle graduée à faire glisser pour saisir une mensuration, avec boutons de réglage fin. */
export default function RulerInput({ label, value, min, max, start, unit = 'cm', major = 10, onChange, optional = true }: Props) {
  const range = max - min;
  const current = value ?? start;
  const clampV = (v: number) => Math.min(max, Math.max(min, Math.round(v * 2) / 2));

  const ticks = [
    `linear-gradient(to right, #9AA6B5 2px, transparent 2px)`,
    `linear-gradient(to right, #2E3A47 1px, transparent 1px)`,
  ].join(', ');
  const sizes = [`calc(100% / ${range / major}) 62%`, `calc(100% / ${range}) 34%`].join(', ');

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        {optional && value !== undefined && (
          <button type="button" onClick={() => onChange(undefined)} className="text-xs font-semibold text-muted underline">
            Effacer
          </button>
        )}
      </div>

      <div className="my-2 flex items-center justify-between gap-3">
        <button type="button" onClick={() => onChange(clampV(current - 0.5))} className="btn-outline !px-2.5 !py-2" aria-label={`Retirer 0,5 ${unit}`}>
          <Minus size={16} />
        </button>
        <p className={`font-display text-5xl font-extrabold tabular-nums ${value === undefined ? 'text-muted' : ''}`}>
          {value === undefined ? '—' : String(current).replace('.', ',')}
          <span className="ml-1 text-lg font-semibold text-muted">{unit}</span>
        </p>
        <button type="button" onClick={() => onChange(clampV(current + 0.5))} className="btn-outline !px-2.5 !py-2" aria-label={`Ajouter 0,5 ${unit}`}>
          <Plus size={16} />
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-ink">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundImage: ticks, backgroundSize: sizes, backgroundPosition: 'left bottom, left bottom', backgroundRepeat: 'repeat-x' }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={0.5}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          className="ruler-input relative"
          aria-label={`${label} en ${unit === 'cm' ? 'centimètres' : unit}`}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted">
        <span>{min}</span>
        <span>{Math.round((min + max) / 2)}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
