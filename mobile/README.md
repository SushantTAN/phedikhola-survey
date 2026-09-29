# Mobile app

Android-first Expo / React Native field data collector.

## Run

```bash
cp .env.example .env
npm install
npx expo install --fix
npx expo start --android
```

Configure the backend and Supabase public client values in `.env`.

## Offline design

- SQLite is the operational source while offline.
- Citizens and service records use client-generated UUIDs before any network request.
- Reference data (wards, categories, health conditions, medicines and units) is cached locally.
- Citizens may carry multiple ward assignments; existing SQLite databases receive an additive `ward_ids` migration on initialization.
- Sync pushes citizens before dependent service records, then pulls server changes.
- Each record tracks `pending`, `syncing`, `synced`, `failed`, or `conflict` state.
- Photos stay as local URIs until their parent has synchronized, then upload directly to Supabase using a backend-issued signed upload token.
- GPS capture works without mobile data.
