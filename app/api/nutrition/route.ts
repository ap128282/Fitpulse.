import { NextResponse } from 'next/server';
import { askNutrition, isGeminiConfigured } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 30;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 15;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS;
}

// ~1,5 Mo d'image en base64
const MAX_IMAGE_CHARS = 2_000_000;

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

  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 600) : '';
  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
  const mimeType = typeof body.mimeType === 'string' && /^image\/(jpeg|png|webp)$/.test(body.mimeType) ? body.mimeType : 'image/jpeg';

  if (!text && !imageBase64) return NextResponse.json({ error: 'Aucune donnée à analyser.' }, { status: 400 });
  if (imageBase64.length > MAX_IMAGE_CHARS) return NextResponse.json({ error: 'Image trop lourde.' }, { status: 413 });
  if (imageBase64 && !/^[A-Za-z0-9+/=]+$/.test(imageBase64)) return NextResponse.json({ error: 'Image invalide.' }, { status: 400 });

  if (!isGeminiConfigured()) return NextResponse.json({ items: [], note: '', source: 'local', reason: 'no_key' });

  try {
    const result = await askNutrition({ text: text || undefined, imageBase64: imageBase64 || undefined, mimeType });
    return NextResponse.json({ ...result, source: 'gemini' });
  } catch (err) {
    console.error('Gemini (nutrition) :', err instanceof Error ? err.message : err);
    return NextResponse.json({ items: [], note: '', source: 'local', reason: 'failed' });
  }
}
