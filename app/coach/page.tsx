'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, ChevronDown, Info, Play, RefreshCw, Send, Settings2, Sparkles } from 'lucide-react';
import DurationPicker from '@/components/DurationPicker';
import ExerciseDemo from '@/components/ExerciseDemo';
import { recentSlugs, useHydrated, useStore } from '@/lib/store';
import { FOCUS_LABEL, FOCUS_SHORT, GEAR_LABEL, parseCoachRequest, TECHNIQUE_LABEL } from '@/lib/ai-engine';
import { ALL_MUSCLES, GOAL_LABEL, MUSCLE_LABEL, STYLE_LABEL, durationLabel } from '@/lib/profile';
import type { ChatTurn, CoachResponse, CoachingStyle, Goal, Muscle, PlannedWorkout, UserProfile } from '@/lib/types';

interface Message {
  id: number;
  role: 'user' | 'coach';
  text: string;
  plan?: PlannedWorkout;
}

const fmt = (n: number) => String(Number(n.toFixed(2)));

function greeting(style: CoachingStyle, name: string): string {
  const who = name ? ` ${name}` : '';
  if (style === 'bienveillant')
    return `Bonjour${who}, ravi de t'accompagner. Pose-moi n'importe quelle question sur l'entraînement, la nutrition ou la récupération, ou demande-moi une séance : je m'adapte à ton temps et à ton matériel.`;
  if (style === 'direct') return `Salut${who}. Question sport, nutrition ou récupération ? Ou demande une séance : donne la durée.`;
  return `Salut${who} ! Prêt à tout donner ? Pose-moi toutes tes questions (entraînement, nutrition, récupération) ou demande une séance sur mesure.`;
}

function localReply(plan: PlannedWorkout, style: CoachingStyle, muscle?: Muscle): string {
  const what = muscle ? `centrée sur ${MUSCLE_LABEL[muscle].toLowerCase()} (avec les muscles complémentaires pour l'équilibre)` : FOCUS_LABEL[plan.focus].toLowerCase();
  if (style === 'bienveillant') return `Voici une séance ${what} de ${plan.duration} minutes. Avance à ton rythme, garde 2 répétitions en réserve et prends le repos dont tu as besoin.`;
  if (style === 'direct') return `Séance ${what}, ${plan.duration} min. RIR visé : 1 à 2. Charges calculées d'après ta dernière séance.`;
  return `C'est parti ! Séance ${what} de ${plan.duration} minutes. Donne tout, garde 1 à 2 répétitions en réserve et on bat des records !`;
}

export default function CoachPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const history = useStore((s) => s.history);
  const planWorkout = useStore((s) => s.planWorkout);
  const planFromAI = useStore((s) => s.planFromAI);
  const startWorkout = useStore((s) => s.startWorkout);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState<'no_key' | 'failed' | null>(null);
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hydrated && messages.length === 0) {
      setMessages([{ id: 0, role: 'coach', text: greeting(profile.coachingStyle, profile.name) }]);
    }
  }, [hydrated, messages.length, profile.coachingStyle, profile.name]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const send = async (raw: string, forced?: { focus?: PlannedWorkout['focus']; muscle?: Muscle }) => {
    const text = raw.trim();
    if (!text || loading) return;
    setInput('');

    const intent = parseCoachRequest(text);
    const effGoal = intent.goal ?? goal ?? profile.goal;
    const effDuration = intent.duration ?? duration ?? profile.duration;
    const effMuscle = forced?.muscle ?? intent.muscle ?? muscle ?? undefined;
    const callProfile: UserProfile = { ...profile, goal: effGoal, duration: effDuration };

    // Les réglages rapides sont transmis au coach comme contexte de la demande.
    const hints = [
      `durée exacte disponible : ${effDuration} min`,
      muscle && !intent.muscle ? `muscle ciblé : ${MUSCLE_LABEL[muscle]}` : '',
      goal && !intent.goal ? `objectif du jour : ${GOAL_LABEL[goal]}` : '',
    ].filter(Boolean);
    const message = hints.length > 0 && (duration !== null || muscle || goal) ? `${text}\n(${hints.join(' ; ')})` : text;

    const turns: ChatTurn[] = messages.slice(-8).map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { id: idRef.current++, role: 'user', text }]);
    setLoading(true);

    let data: CoachResponse | null = null;
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: turns, profile: callProfile, recentSlugs: recentSlugs(history) }),
      });
      if (res.ok) data = (await res.json()) as CoachResponse;
      else if (res.status === 429) {
        setMessages((m) => [...m, { id: idRef.current++, role: 'coach', text: "Beaucoup de demandes d'un coup : patiente quelques minutes avant de me reposer une question." }]);
        setLoading(false);
        return;
      }
    } catch {
      data = null;
    }

    // 1) Réponse de Gemini (discussion libre ou séance)
    if (data && data.source === 'gemini' && data.reply) {
      setOffline(null);
      const plan = data.plan ? planFromAI(data.plan, { goal: effGoal, duration: effDuration }) : null;
      setMessages((m) => [...m, { id: idRef.current++, role: 'coach', text: data!.reply as string, plan: plan ?? undefined }]);
      setLoading(false);
      return;
    }

    // 2) Repli : coach local. Il ne sait que construire des séances ; les questions libres nécessitent Gemini.
    setOffline(data?.reason ?? 'failed');
    const wantsWorkout = !!(intent.duration || intent.focus || intent.muscle || effMuscle || /séance|seance|entra|programme|workout/i.test(text));
    if (!wantsWorkout) {
      setMessages((m) => [
        ...m,
        {
          id: idRef.current++,
          role: 'coach',
          text: "Pour répondre à cette question, j'ai besoin du coach Gemini, qui n'est pas disponible pour le moment. Je peux en revanche te préparer une séance : indique la durée et ce que tu veux travailler.",
        },
      ]);
      setLoading(false);
      return;
    }
    const plan = planWorkout({
      duration: effDuration,
      goal: effGoal,
      focus: forced?.focus ?? intent.focus,
      muscle: effMuscle,
      seed: Date.now() + Math.floor(Math.random() * 100000),
    });
    setMessages((m) => [...m, { id: idRef.current++, role: 'coach', text: localReply(plan, profile.coachingStyle, effMuscle), plan }]);
    setLoading(false);
  };

  const launch = (plan: PlannedWorkout) => {
    startWorkout(plan);
    router.push('/workout');
  };

  if (!hydrated) return <div className="panel h-40 animate-pulse" aria-busy="true" />;

  const suggestions =
    profile.sport === 'trail'
      ? ['Séance jambes trail 50 min', 'Comment récupérer après une sortie longue ?', 'Quoi manger avant une course ?', "Séance haut du corps d'1 h"]
      : profile.goal === 'pompiers'
      ? ['Séance prépa pompiers 45 min', 'Je veux travailler les tractions et les pompes', 'Comment progresser en gainage ?']
      : ['45 min développement musculaire', 'Une séance que sur les biceps de 30 min', 'Combien de protéines par jour ?', 'Je suis courbaturé, que faire ?'];

  return (
    <div className="flex flex-col">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-royal">
          <Bot size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-extrabold uppercase leading-none">Coach IA</h1>
          <p className="mt-1 text-xs text-muted">
            Ton {STYLE_LABEL[profile.coachingStyle].toLowerCase()} · {profile.place === 'maison' ? 'à la maison' : 'en salle'}
          </p>
        </div>
        <Link href="/profile" className="btn-outline !px-3 !py-2 text-xs" aria-label="Régler le coach et le matériel">
          <Settings2 size={15} />
          Régler
        </Link>
      </header>

      {offline && (
        <p role="status" className="mb-3 flex gap-2 rounded-xl border border-line bg-panel p-3 text-xs text-muted">
          <Info size={15} className="mt-0.5 shrink-0 text-royal-light" />
          {offline === 'no_key'
            ? "Le coach Gemini n'est pas encore activé : les séances sont créées par le moteur local de FitPulse et le chat libre est indisponible."
            : 'Le coach Gemini est indisponible pour le moment : le moteur local a pris le relais.'}
        </p>
      )}

      <details className="panel mb-4 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">
          <span>
            Réglages de la séance <span className="font-normal text-muted">· {durationLabel(duration ?? profile.duration)}{muscle ? ` · ${MUSCLE_LABEL[muscle]}` : ''}</span>
          </span>
          <ChevronDown size={16} className="text-muted" />
        </summary>
        <div className="mt-4 space-y-4">
          <DurationPicker value={duration ?? profile.duration} onChange={setDuration} />
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Objectif du jour</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => {
                const on = (goal ?? profile.goal) === g;
                return (
                  <button key={g} type="button" onClick={() => setGoal(g)} aria-pressed={on} className={`chip text-center !text-xs ${on ? 'chip-on' : ''}`}>
                    {GOAL_LABEL[g]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Cibler un seul muscle (facultatif)</p>
            <p className="mb-1.5 text-xs text-muted">La séance se concentre dessus et garde les muscles complémentaires pour rester équilibré.</p>
            <div className="flex flex-wrap gap-2">
              {ALL_MUSCLES.map((m) => (
                <button key={m} type="button" onClick={() => setMuscle(muscle === m ? null : m)} aria-pressed={muscle === m} className={`chip !px-3 !py-1.5 text-xs ${muscle === m ? 'chip-on' : ''}`}>
                  {MUSCLE_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>

      <div className="space-y-3" role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[94%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'rounded-br-md bg-royal font-semibold text-white' : 'card-cream rounded-bl-md'}`}>
              <p className="whitespace-pre-wrap">{m.text}</p>

              {m.plan && (
                <div className="mt-3 rounded-xl bg-ink p-3 text-white">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-display text-xl font-bold uppercase leading-tight">{m.plan.name}</p>
                    <p className="shrink-0 text-xs text-muted">~{m.plan.estimatedMin} min</p>
                  </div>
                  <ul className="space-y-2.5">
                    {m.plan.exercises.map((e) => (
                      <li key={e.slug} className="flex items-center gap-3">
                        <ExerciseDemo imageId={e.imageId} name={e.name} variant="thumb" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{e.name}</p>
                          <p className="text-xs text-muted">
                            {GEAR_LABEL[e.gear]}
                            {e.technique ? ` · ${TECHNIQUE_LABEL[e.technique]}` : ''}
                            {e.tempo ? ` · tempo ${e.tempo}` : ''} · repos {e.restSeconds} s
                          </p>
                          {e.note && <p className="truncate text-xs text-royal-light">{e.note}</p>}
                        </div>
                        <p className="shrink-0 text-right text-xs tabular-nums">
                          <span className="font-bold text-white">
                            {e.sets.length}×{e.repRange[0]}–{e.repRange[1]}
                            {e.unit === 'sec' ? ' s' : ''}
                          </span>
                          <br />
                          <span className="text-muted">{e.unit === 'sec' ? 'maintien' : e.sets[0].weight > 0 ? `${fmt(e.sets[0].weight)} kg` : 'PDC'}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-muted">Chaque exercice démarre par une série d&apos;échauffement adaptée.</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="btn-outline flex-1 !py-2 text-sm"
                      onClick={() => send(`Propose-moi une autre séance ${FOCUS_SHORT[m.plan!.focus]}, avec des exercices différents`, { focus: m.plan!.focus })}
                      disabled={loading}
                    >
                      <RefreshCw size={15} />
                      Varier
                    </button>
                    <button className="btn-royal flex-[2] !py-2 text-sm" onClick={() => launch(m.plan!)}>
                      <Play size={15} />
                      Lancer la séance
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="panel flex items-center gap-2 px-4 py-3 text-sm text-muted">
              <Sparkles size={15} className="animate-pulse text-royal-light" />
              Le coach réfléchit…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((s) => (
          <button key={s} onClick={() => send(s)} className="chip shrink-0" disabled={loading}>
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-[76px] mt-3 flex gap-2 bg-ink/95 py-2 backdrop-blur"
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={600} placeholder="Une question, ou « 1 h, jambes et trail »" className="field flex-1" aria-label="Message pour le coach" />
        <button type="submit" className="btn-royal !px-4" disabled={loading || !input.trim()} aria-label="Envoyer">
          <Send size={18} />
        </button>
      </form>
      <p className="mt-1 text-center text-[11px] text-muted">Conseils indicatifs : ils ne remplacent pas un médecin ni un diététicien.</p>
    </div>
  );
}
