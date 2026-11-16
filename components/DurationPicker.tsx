'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { DURATION_MAX, DURATION_MIN, DURATIONS, durationLabel } from '@/lib/profile';

interface Props {
  value: number;
  onChange: (minutes: number) => void;
  label?: string;
}

/** Durée de séance libre à la minute près : curseur, boutons ±5 min, saisie exacte et raccourcis. */
export default function DurationPicker({ value, onChange, label = 'Durée de la séance' }: Props) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const set = (v: number) => onChange(Math.min(DURATION_MAX, Math.max(DURATION_MIN, Math.round(v))));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => set(value - 5)} className="btn-outline !px-3" aria-label="Retirer 5 minutes">
          <Minus size={18} />
        </button>
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={text}
              aria-label={`${label}, en minutes`}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                setText(String(value));
              }}
              onChange={(e) => {
                const t = e.target.value.replace(/\D/g, '').slice(0, 3);
                setText(t);
                const n = parseInt(t, 10);
                if (Number.isFinite(n) && n >= DURATION_MIN && n <= DURATION_MAX) onChange(n);
              }}
              className="w-24 bg-transparent text-center font-display text-6xl font-extrabold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-royal-light"
            />
            <span className="text-lg font-semibold text-muted">min</span>
          </div>
          <p className="text-xs text-muted">{durationLabel(value)}</p>
        </div>
        <button type="button" onClick={() => set(value + 5)} className="btn-outline !px-3" aria-label="Ajouter 5 minutes">
          <Plus size={18} />
        </button>
      </div>

      <input
        type="range"
        min={DURATION_MIN}
        max={DURATION_MAX}
        step={5}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="slider-input"
        aria-label={label}
      />

      <div className="flex flex-wrap justify-center gap-2">
        {DURATIONS.map((d) => (
          <button key={d} type="button" aria-pressed={value === d} onClick={() => set(d)} className={`chip !px-3 !py-1.5 ${value === d ? 'chip-on' : ''}`}>
            {durationLabel(d)}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted">De {DURATION_MIN} min à {durationLabel(DURATION_MAX)} : tu choisis la durée exacte, FitPulse construit la séance qui tient dedans.</p>
    </div>
  );
}
