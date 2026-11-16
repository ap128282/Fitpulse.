'use client';

import { useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { exerciseImages } from '@/lib/exercises';

interface Props {
  imageId?: string;
  name: string;
  /** "card" = grande démo en haut d'une carte, "thumb" = miniature carrée. */
  variant?: 'card' | 'thumb';
}

/**
 * Alterne la position de départ et d'arrivée (images libres de droits, free-exercise-db)
 * pour donner l'effet d'une démonstration. Sans animation si l'utilisateur la désactive.
 */
export default function ExerciseDemo({ imageId, name, variant = 'card' }: Props) {
  const images = exerciseImages(imageId);
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (variant === 'thumb' || images.length < 2 || failed) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1100);
    return () => clearInterval(id);
  }, [images.length, failed, variant]);

  const box =
    variant === 'thumb'
      ? 'h-14 w-14 shrink-0 rounded-xl'
      : 'aspect-[3/2] w-full rounded-t-2xl';

  if (images.length === 0 || failed) {
    return (
      <div
        className={`${box} flex items-center justify-center bg-panel text-muted`}
        role="img"
        aria-label={`Illustration indisponible : ${name}`}
      >
        <Dumbbell size={variant === 'thumb' ? 22 : 40} />
      </div>
    );
  }

  return (
    <div className={`${box} relative overflow-hidden bg-white`}>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={i === 0 ? `Démonstration : ${name}` : ''}
          aria-hidden={i !== 0}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            variant === 'thumb' ? (i === 0 ? 'opacity-100' : 'opacity-0') : frame === i ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </div>
  );
}
