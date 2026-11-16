import { NextResponse } from 'next/server';
import { askCoach, askSwap, isGeminiConfigured } from '@/lib/gemini';
import { alternativesFor } from '@/lib/ai-engine';
import { EXERCISE_BY_SLUG } from '@/lib/exercises';
import { sanitizeProfile } from '@/lib/profile';
import type { ChatTurn, CoachResponse, SwapResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Limite simple par adresse IP (best effort sur serverless) pour protéger le quota gratuit Gemini.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS;
}

function cleanHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-8)
    .filter((t): t is { role: string; text: string } => typeof t?.text === 'string' && (t.role === 'user' || t.role === 'coach'))
    .map((t) => ({ role: t.role as ChatTurn['role'], text: t.text.slice(0, 800) }));
}

const strings = (raw: unknown, max: number): string[] =>
  Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string').slice(0, max) : [];

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Trop de demandes, réessaie dans quelques minutes.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const profile = sanitizeProfile(body.profile);

  // --- Alternatives d'exercice en un clic -------------------------------------------------------
  if (body.mode === 'swap') {
    const current = typeof body.exerciseSlug === 'string' ? EXERCISE_BY_SLUG[body.exerciseSlug] : undefined;
    if (!current) return NextResponse.json({ error: 'Exercice inconnu.' }, { status: 400 });
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : 'ne convient pas';

    if (!isGeminiConfigured()) {
      const res: SwapResponse = { suggestions: [], source: 'local' };
      return NextResponse.json(res);
    }
    const candidates = alternativesFor(current, strings(body.inWorkout, 20), profile, 8, Date.now());
    try {
      const suggestions = await askSwap({ profile, current, candidates, reason });
      const res: SwapResponse = { suggestions, source: 'gemini' };
      return NextResponse.json(res);
    } catch (err) {
      console.error('Gemini (alternatives) :', err instanceof Error ? err.message : err);
      const res: SwapResponse = { suggestions: [], source: 'local' };
      return NextResponse.json(res);
    }
  }

  // --- Chat libre et génération de séance -------------------------------------------------------
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : '';
  if (!message) return NextResponse.json({ error: 'Message vide.' }, { status: 400 });

  if (!isGeminiConfigured()) {
    const res: CoachResponse = { reply: null, plan: null, source: 'local', reason: 'no_key' };
    return NextResponse.json(res);
  }

  try {
    const result = await askCoach({
      message,
      history: cleanHistory(body.history),
      profile,
      recentSlugs: strings(body.recentSlugs, 30),
    });
    const res: CoachResponse = { reply: result.reply, plan: result.plan, source: 'gemini' };
    return NextResponse.json(res);
  } catch (err) {
    console.error('Gemini :', err instanceof Error ? err.message : err);
    const res: CoachResponse = { reply: null, plan: null, source: 'local', reason: 'failed' };
    return NextResponse.json(res);
  }
}
