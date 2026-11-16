'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Info, Keyboard, Mic, Plus, ScanBarcode, Search, Sparkles, Square, Trash2, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { FoodSource, searchOpenFoodFacts, productByBarcode } from '@/lib/openfoodfacts';
import { macrosForFood, MEAL_LABEL, searchFoods } from '@/lib/nutrition';
import type { FoodItemEstimate, MealSource, MealType } from '@/lib/types';

type Tab = 'recherche' | 'scanner' | 'photo' | 'vocal' | 'manuel';

const TABS: { id: Tab; label: string; Icon: typeof Search }[] = [
  { id: 'recherche', label: 'Recherche', Icon: Search },
  { id: 'scanner', label: 'Scanner', Icon: ScanBarcode },
  { id: 'photo', label: 'Photo IA', Icon: Camera },
  { id: 'vocal', label: 'Vocal IA', Icon: Mic },
  { id: 'manuel', label: 'Manuel', Icon: Keyboard },
];

interface Props {
  meal: MealType;
  /** YYYY-MM-DD */
  date: string;
  onClose: () => void;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// --- Reconnaissance vocale (non typée dans TypeScript) ------------------------------------------
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => RecognitionLike;

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats: string[] }) => BarcodeDetectorLike;

/** Réduit la photo avant l'envoi (limite de taille et vie privée : on n'envoie que le nécessaire). */
async function resizeImage(file: File, maxSide = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.72);
  return url.split(',')[1] ?? '';
}

export default function AddFoodSheet({ meal, date, onClose }: Props) {
  const addMeal = useStore((s) => s.addMeal);
  const [tab, setTab] = useState<Tab>('recherche');
  const [mealType, setMealType] = useState<MealType>(meal);
  const [added, setAdded] = useState(0);

  // Recherche et scanner
  const [query, setQuery] = useState('');
  const [offResults, setOffResults] = useState<FoodSource[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [selected, setSelected] = useState<FoodSource | null>(null);
  const [grams, setGrams] = useState(100);
  const [scanMessage, setScanMessage] = useState('');
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Photo et vocal
  const [aiItems, setAiItems] = useState<FoodItemEstimate[]>([]);
  const [aiNote, setAiNote] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSource, setAiSource] = useState<MealSource>('photo');
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);

  // Saisie manuelle
  const [manual, setManual] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });

  const local = searchFoods(query).map<FoodSource>((f) => ({
    name: f.name,
    per100: { kcal: f.kcal, protein: f.p, carbs: f.c, fat: f.f },
    origin: 'recherche',
  }));

  // Recherche Open Food Facts (avec temporisation)
  useEffect(() => {
    if (tab !== 'recherche' || query.trim().length < 3) {
      setOffResults([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      setOffLoading(true);
      const res = await searchOpenFoodFacts(query.trim());
      if (!cancelled) {
        setOffResults(res);
        setOffLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, tab]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.stop();
    },
    []
  );

  const lookupCode = async (value: string) => {
    setScanMessage('Recherche du produit…');
    const product = await productByBarcode(value);
    if (product) {
      setSelected(product);
      setGrams(100);
      setScanMessage('');
    } else setScanMessage("Produit introuvable dans Open Food Facts. Essaie la recherche ou la saisie manuelle.");
  };

  const startScan = async () => {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setScanMessage("Le scan par caméra n'est pas disponible sur ce navigateur (par exemple Safari sur iPhone). Saisis le numéro du code-barres ci-dessous.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      setScanMessage('Place le code-barres devant la caméra.');
      await new Promise((r) => setTimeout(r, 50));
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      const loop = async () => {
        if (!streamRef.current) return;
        try {
          const found = await detector.detect(video);
          if (found.length > 0) {
            stopCamera();
            await lookupCode(found[0].rawValue);
            return;
          }
        } catch {
          /* on réessaie à la prochaine image */
        }
        setTimeout(loop, 300);
      };
      void loop();
    } catch {
      setScanMessage("Impossible d'accéder à la caméra. Autorise l'accès ou saisis le code-barres.");
      stopCamera();
    }
  };

  const callAi = async (body: Record<string, string>, source: MealSource) => {
    setAiLoading(true);
    setAiError('');
    setAiItems([]);
    setAiNote('');
    setAiSource(source);
    try {
      const res = await fetch('/api/nutrition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.status === 429) setAiError('Trop de demandes : réessaie dans quelques minutes.');
      else if (!res.ok) setAiError(data?.error ?? "L'analyse a échoué.");
      else if (data.reason === 'no_key') setAiError("L'analyse IA nécessite la clé Gemini (variable GEMINI_API_KEY). En attendant, utilise la recherche ou la saisie manuelle.");
      else if (data.reason === 'failed') setAiError("L'analyse IA est indisponible pour le moment. Réessaie, ou utilise la recherche.");
      else {
        setAiItems(data.items ?? []);
        setAiNote(data.note ?? '');
        if ((data.items ?? []).length === 0) setAiError(data.note || "Aucun aliment reconnu. Essaie une photo plus nette ou décris ton repas.");
      }
    } catch {
      setAiError('Connexion impossible.');
    }
    setAiLoading(false);
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imageBase64 = await resizeImage(file);
      await callAi({ imageBase64, mimeType: 'image/jpeg' }, 'photo');
    } catch {
      setAiError("Impossible de lire cette image.");
    }
  };

  const toggleListening = () => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;
    if (!Ctor) {
      setAiError("La dictée vocale n'est pas disponible sur ce navigateur : écris simplement ce que tu as mangé.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setAiError("La reconnaissance vocale a échoué. Vérifie l'accès au micro.");
    };
    recognitionRef.current = rec;
    setAiError('');
    setListening(true);
    rec.start();
  };

  const add = (entry: { name: string; grams?: number; kcal: number; protein: number; carbs: number; fat: number; source: MealSource }) => {
    addMeal({ date, meal: mealType, ...entry });
    setAdded((n) => n + 1);
  };

  const selectedMacros = selected ? macrosForFood({ id: '', name: selected.name, kcal: selected.per100.kcal, p: selected.per100.protein, c: selected.per100.carbs, f: selected.per100.fat, aisle: 'Épicerie, huiles et oléagineux', flags: [] }, grams) : null;

  const addSelected = () => {
    if (!selected || !selectedMacros) return;
    add({ name: selected.name, grams, source: selected.origin, ...selectedMacros });
    setSelected(null);
    setQuery('');
  };

  const aiTotal = aiItems.reduce((a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.protein, c: a.c + i.carbs, f: a.f + i.fat }), { kcal: 0, p: 0, c: 0, f: 0 });

  const addAi = () => {
    aiItems.forEach((i) => add({ name: i.name, grams: i.grams, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, source: aiSource }));
    setAiItems([]);
    setTranscript('');
    setAiNote('');
  };

  const addManual = () => {
    const kcal = parseFloat(manual.kcal.replace(',', '.'));
    if (!manual.name.trim() || !Number.isFinite(kcal) || kcal < 0 || kcal > 5000) return;
    const n = (v: string) => Math.max(0, parseFloat(v.replace(',', '.')) || 0);
    add({ name: manual.name.trim().slice(0, 60), kcal: Math.round(kcal), protein: n(manual.protein), carbs: n(manual.carbs), fat: n(manual.fat), source: 'manuel' });
    setManual({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  };

  const close = () => {
    stopCamera();
    recognitionRef.current?.stop();
    onClose();
  };

  const SourceRow = ({ s }: { s: FoodSource }) => (
    <li>
      <button
        type="button"
        onClick={() => {
          setSelected(s);
          setGrams(100);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line-cream bg-white px-3 py-2 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{s.name}</span>
          {s.brand && <span className="block truncate text-xs text-muted-ink">{s.brand}</span>}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-ink">{Math.round(s.per100.kcal)} kcal / 100 g</span>
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label="Ajouter un aliment" className="card-cream max-h-[88vh] w-full max-w-md overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-3xl font-bold uppercase leading-none">Ajouter</h3>
            <p className="mt-1 text-xs text-muted-ink" aria-live="polite">
              {added > 0 ? `${added} ajout${added > 1 ? 's' : ''} au journal` : 'Choisis une méthode'}
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Fermer" className="rounded-full p-1.5 text-muted-ink">
            <X size={20} />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Repas">
          {(Object.keys(MEAL_LABEL) as MealType[]).map((m) => (
            <button key={m} type="button" aria-pressed={mealType === m} onClick={() => setMealType(m)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${mealType === m ? 'border-ink bg-ink text-white' : 'border-line-cream bg-white text-ink'}`}>
              {MEAL_LABEL[m]}
            </button>
          ))}
        </div>

        <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { if (id !== 'scanner') stopCamera(); setTab(id); setAiError(''); }} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${tab === id ? 'bg-royal text-white' : 'border border-line-cream bg-white text-ink'}`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Aliment choisi (recherche ou scanner) */}
        {selected && selectedMacros && (tab === 'recherche' || tab === 'scanner') && (
          <div className="mb-3 rounded-xl bg-white p-3 ring-1 ring-royal">
            <p className="font-bold">{selected.name}</p>
            {selected.brand && <p className="text-xs text-muted-ink">{selected.brand}</p>}
            <label className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-muted-ink">Quantité</span>
              <input type="number" inputMode="decimal" min="1" max="3000" value={grams} onChange={(e) => setGrams(Math.min(3000, Math.max(1, Number(e.target.value) || 1)))} className="field-cream !w-24" aria-label="Quantité en grammes" />
              <span className="text-muted-ink">g</span>
            </label>
            <p className="mt-2 text-sm tabular-nums">
              <span className="font-bold">{selectedMacros.kcal} kcal</span> · P {selectedMacros.protein} g · G {selectedMacros.carbs} g · L {selectedMacros.fat} g
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-outline-cream flex-1 !py-2 text-sm" onClick={() => setSelected(null)}>
                Annuler
              </button>
              <button type="button" className="btn-royal flex-[2] !py-2 text-sm" onClick={addSelected}>
                <Plus size={16} />
                Ajouter au journal
              </button>
            </div>
          </div>
        )}

        {/* Recherche */}
        {tab === 'recherche' && (
          <div>
            <div className="relative mb-3">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex : poulet, yaourt, riz…" className="w-full rounded-xl border border-line-cream bg-white py-3 pl-9 pr-3 text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/30" aria-label="Rechercher un aliment" />
            </div>
            {local.length > 0 && (
              <>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-ink">Aliments courants</p>
                <ul className="mb-3 space-y-1.5">{local.map((s) => <SourceRow key={s.name} s={s} />)}</ul>
              </>
            )}
            {query.trim().length >= 3 && (
              <>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-ink">Produits du commerce (Open Food Facts)</p>
                {offLoading && <p className="text-xs text-muted-ink">Recherche en cours…</p>}
                {!offLoading && offResults.length === 0 && <p className="text-xs text-muted-ink">Aucun produit trouvé.</p>}
                <ul className="space-y-1.5">{offResults.map((s, i) => <SourceRow key={`${s.name}-${i}`} s={s} />)}</ul>
              </>
            )}
            {query.trim().length < 3 && local.length === 0 && <p className="text-xs text-muted-ink">Tape au moins 3 lettres pour chercher aussi parmi les produits du commerce.</p>}
          </div>
        )}

        {/* Scanner */}
        {tab === 'scanner' && (
          <div className="space-y-3">
            {scanning ? (
              <div className="overflow-hidden rounded-xl bg-ink">
                <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" aria-label="Aperçu de la caméra" />
                <button type="button" onClick={stopCamera} className="btn-white w-full !rounded-none !py-2 text-sm">
                  <Square size={14} />
                  Arrêter
                </button>
              </div>
            ) : (
              <button type="button" onClick={startScan} className="btn-royal w-full">
                <ScanBarcode size={18} />
                Scanner un code-barres
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (/^\d{8,14}$/.test(code.trim())) void lookupCode(code.trim());
                else setScanMessage('Un code-barres contient entre 8 et 14 chiffres.');
              }}
              className="flex gap-2"
            >
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 14))} inputMode="numeric" placeholder="Ou saisis le numéro du code-barres" className="min-w-0 flex-1 rounded-xl border border-line-cream bg-white px-3 py-3 text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/30" aria-label="Numéro du code-barres" />
              <button type="submit" className="btn-outline-cream !px-4">
                OK
              </button>
            </form>
            {scanMessage && <p role="status" className="text-xs text-muted-ink">{scanMessage}</p>}
          </div>
        )}

        {/* Photo IA */}
        {tab === 'photo' && (
          <div className="space-y-3">
            <label className="btn-royal w-full cursor-pointer">
              <Camera size={18} />
              Prendre ou choisir une photo du repas
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} />
            </label>
            <p className="flex gap-2 text-xs text-muted-ink">
              <Info size={14} className="mt-0.5 shrink-0" />
              La photo (réduite) est envoyée à Google Gemini pour estimer les aliments et les quantités. Ce sont des estimations : corrige-les si besoin.
            </p>
          </div>
        )}

        {/* Vocal IA */}
        {tab === 'vocal' && (
          <div className="space-y-3">
            <button type="button" onClick={toggleListening} className={listening ? 'btn-ember w-full' : 'btn-royal w-full'}>
              {listening ? <Square size={16} /> : <Mic size={18} />}
              {listening ? "J'écoute… (toucher pour arrêter)" : 'Dicter mon repas'}
            </button>
            <textarea value={transcript} onChange={(e) => setTranscript(e.target.value.slice(0, 600))} rows={3} placeholder="Ex : deux œufs, une tranche de pain complet et un yaourt grec" className="w-full rounded-xl border border-line-cream bg-white p-3 text-sm text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/30" aria-label="Description du repas" />
            <button type="button" disabled={!transcript.trim() || aiLoading} onClick={() => void callAi({ text: transcript.trim() }, 'vocal')} className="btn-royal w-full disabled:opacity-40">
              <Sparkles size={16} />
              Analyser avec l&apos;IA
            </button>
          </div>
        )}

        {/* Résultats IA (photo et vocal) */}
        {(tab === 'photo' || tab === 'vocal') && (
          <div className="mt-3" aria-live="polite">
            {aiLoading && <p className="flex items-center gap-2 text-sm text-muted-ink"><Sparkles size={15} className="animate-pulse text-royal" />Analyse en cours…</p>}
            {aiError && <p role="alert" className="rounded-xl bg-white p-3 text-sm font-semibold text-ember ring-1 ring-line-cream">{aiError}</p>}
            {aiItems.length > 0 && (
              <div className="rounded-xl bg-white p-3 ring-1 ring-line-cream">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-royal">Estimation de l&apos;IA</p>
                <ul className="space-y-1.5">
                  {aiItems.map((i, idx) => (
                    <li key={`${i.name}-${idx}`} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{i.name}</span>
                        <span className="block text-xs tabular-nums text-muted-ink">{i.grams} g · P {i.protein} · G {i.carbs} · L {i.fat}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-bold tabular-nums">{i.kcal} kcal</span>
                        <button type="button" aria-label={`Retirer ${i.name}`} onClick={() => setAiItems(aiItems.filter((_, j) => j !== idx))} className="text-muted-ink">
                          <Trash2 size={15} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t border-line-cream pt-2 text-sm font-bold tabular-nums">
                  Total : {aiTotal.kcal} kcal · P {round1(aiTotal.p)} · G {round1(aiTotal.c)} · L {round1(aiTotal.f)}
                </p>
                {aiNote && <p className="mt-1 text-xs text-muted-ink">{aiNote}</p>}
                <button type="button" onClick={addAi} className="btn-royal mt-3 w-full">
                  <Plus size={16} />
                  Ajouter au journal
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manuel */}
        {tab === 'manuel' && (
          <div className="space-y-2">
            <input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Nom de l'aliment ou du plat" className="w-full rounded-xl border border-line-cream bg-white px-3 py-3 text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/30" aria-label="Nom" />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['kcal', 'Calories (kcal)'],
                  ['protein', 'Protéines (g)'],
                  ['carbs', 'Glucides (g)'],
                  ['fat', 'Lipides (g)'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-ink">{label}</span>
                  <input value={manual[k]} inputMode="decimal" onChange={(e) => setManual({ ...manual, [k]: e.target.value })} className="field-cream !text-left" />
                </label>
              ))}
            </div>
            <button type="button" onClick={addManual} disabled={!manual.name.trim() || !manual.kcal} className="btn-royal w-full disabled:opacity-40">
              <Plus size={16} />
              Ajouter au journal
            </button>
          </div>
        )}

        <button type="button" onClick={close} className="btn-outline-cream mt-4 w-full">
          Terminé
        </button>
      </div>
    </div>
  );
}
