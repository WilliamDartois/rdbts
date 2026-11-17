# RDB Mobile

Portage mobile en **Expo / React Native / TypeScript** de l’interface Python PyQt5 RDB. L’interface est en français ; l’application propose les onglets PGM, WEATHER, GARMIN, STRAVA et SETTINGS.

## Démarrer

1. Installer Node.js et l’application **Expo Go** sur le téléphone Android.
2. Depuis ce dossier :
   ```bash
   npm install
   npx expo start
   ```
3. Scanner le QR code depuis Expo Go. Si le téléphone et l’ordinateur ne peuvent pas communiquer sur le même réseau, essayer `npx expo start --tunnel`.

TypeScript : `npx tsc --noEmit`.

## Fonctionnalités / données

- L’agenda PGM permet de naviguer entre les mois, sélectionner un jour, consulter ses séances et maintenir un jour (ou utiliser +) pour créer une séance. L’assistant reprend les choix de types/intensité, extérieur/heure/durée/notes et une seconde étape de détails d’exercice. Les séances utilisent l’API backend si configurée ; AsyncStorage sert de repli local si l’API est injoignable. Suppression disponible sur chaque carte.
- WEATHER utilise les API publiques Open-Meteo (géocodage, météo et qualité de l’air) : températures, humidité, vent, précipitations, indicateurs AQI/particules, créneaux de course classés et conseils en français. Une connexion Internet est nécessaire.
- Le fichier `assets/wallpaper.jpg` provient de `WilliamDartois/rdb_py`.
- La page de connexion est un écran d’accueil seulement : comme demandé, elle ne valide pas de compte réel. « Profil » est une entrée de réglages locale sans service de compte.
- Garmin et Strava sont des écrans indicatifs : les widgets sources fournis n’avaient pas de fonctionnalité implémentée.
- Le calendrier source désactivait l’affichage et l’édition des événements JSON. `evenements.json` et sa logique d’événements ne sont donc pas portés.

## Backend PostgreSQL (Node / Express)

Le dossier `../rdb-backend` contient l'API REST TypeScript/PostgreSQL. Le mobile utilise l'API si elle est configurée ; sans connexion à l'API, les opérations de séance retombent sur AsyncStorage local.

### Démarrage du backend

1. La base doit déjà contenir le schéma PostgreSQL réel (`app_user`, `exercise`, `workout`, `workout_item`, etc.). Le backend n'inclut aucun script de recréation des tables. Appliquer une fois la migration additive puis démarrer :
   ```bash
   cd ../rdb-backend
   cp .env.example .env
   # Éditer .env : DATABASE_URL, API_TOKEN (secret aléatoire), éventuellement PORT et DEFAULT_USER_ID
   psql "$DATABASE_URL" -f migration.sql
   npm install
   npm run dev
   ```
   Pour une exécution compilée : `npm run build && npm start`. Ne jamais committer `.env` ni intégrer de secrets réels au dépôt.

2. Les routes protégées attendent `Authorization: Bearer <API_TOKEN>`. Le serveur écoute sur `0.0.0.0:3000` par défaut et active CORS.

### Connexion depuis Expo / un téléphone

Dans `rdb-mobile`, créez `.env` (ne pas le committer) :
```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.42:3000
EXPO_PUBLIC_API_TOKEN=le-meme-token-que-API_TOKEN
```
Remplacez `192.168.1.42` par l'adresse IP LAN de l'ordinateur qui exécute le backend (pas `localhost` ni `127.0.0.1` sur le téléphone). Le téléphone et l'ordinateur doivent être sur le même Wi-Fi ; autorisez le port 3000 dans le pare-feu. Redémarrez Expo après modification des variables, par exemple `npx expo start --clear`. `EXPO_PUBLIC_API_TOKEN` est incorporé au bundle client et n'est donc pas un secret durable : le token partagé convient à un prototype/réseau de confiance, pas à une application publique.

### Endpoints

- `GET /workouts?from=YYYY-MM-DD&to=YYYY-MM-DD` — liste triée par date/heure ; bornes inclusives facultatives.
- `POST /workouts` — crée/remplace une séance par son identifiant mobile ; corps JSON `Workout`.
- `DELETE /workouts/:id` — suppression (204 ; 404 si introuvable).

Le backend utilise les colonnes déjà présentes dans `workout` (`user_id`, `workout_date`, `title`, `type`, `is_outdoor`, `planned_start`, `planned_duration_min`, `intensity`, `status`, `notes`) et stocke les détails dans `workout_item` et `exercise`. La migration `rdb-backend/migration.sql` ajoute uniquement `workout.client_id` et son index unique partiel pour rendre les créations mobiles idempotentes ; elle ne recrée aucune table. `distanceKm` est converti en mètres. L'interface mobile représentant un seul exercice/bloc, l'API lit et écrit l'élément de position 1. Les variables de connexion et le token doivent être configurés côté serveur ; aucun mot de passe n'est codé en dur.

TypeScript mobile : `npx tsc --noEmit`.
