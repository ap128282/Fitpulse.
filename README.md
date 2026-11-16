# FitPulse

Application mobile (PWA) de musculation et de préparation physique : Next.js 14, Tailwind, Zustand, Recharts, Supabase (facultatif), coach IA Gemini.

## Démarrage

```bash
npm install
cp .env.example .env.local   # facultatif
npm run dev
```

## Ce qui fonctionne sans aucune clé

Questionnaire de départ en 10 étapes, profil, 140 équipements maison / salle, génération de séances (durée libre,
muscle ciblé, sports), échauffements, surcharge progressive au RIR avec ajustement en temps réel, minuteur de repos,
historique, graphiques, journal nutritionnel, recettes, plans de repas et liste de courses.
Les données restent dans le navigateur.

## Avec une clé Gemini (gratuite)

1. Crée une clé sur https://aistudio.google.com (Get API key).
2. Ajoute-la dans `GEMINI_API_KEY` (`.env.local`, ou Vercel > Settings > Environment Variables), puis redéploie.

Elle active : le chat libre du coach (sport, nutrition, récupération), les séances rédigées par l'IA, les alternatives
d'exercice recommandées, l'analyse de repas par photo et par la voix.
La clé reste côté serveur (`app/api/*`), jamais dans le navigateur.

## Sources externes

- Images d'exercices : free-exercise-db (domaine public) https://github.com/yuhonas/free-exercise-db
- Produits et codes-barres : Open Food Facts (base libre) https://world.openfoodfacts.org

## Supabase (facultatif)

Exécute `schema.sql` dans le SQL Editor puis renseigne `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
