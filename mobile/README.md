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

## Forms (match the web admin)

- **Citizen** (`app/citizens/new.tsx`, `edit.tsx`): profile, guardian mobile number, category, wards, tole (limited to the selected wards), optional GPS location, household details, photo.
- **Service record** (`app/service/new.tsx`, `edit.tsx`): ward, guardian mobile number (copied from the citizen's profile, editable), service date, Nepali year/month, blood pressure and temperature with a colour-coded status, health conditions, medicines (search and tap to add), location, photo, notes, "needs follow-up".
- Dates are picked on a Bikram Sambat calendar (`src/components/nepali-date-picker.tsx`). They are stored and synced as English `YYYY-MM-DD` dates; the BS calendar data in `src/lib/nepali-calendar-data.ts` is the same as the web app's.
- Both forms work fully offline and can be edited after saving. Edits are queued and uploaded at the next sync.

## Sync notes

- `version` is the server version a record was last synced at. Local edits do not change it; the server uses it to detect that someone else edited the record meanwhile (the server copy then wins at the next pull).
- A record edited while a sync is running stays `pending` and is sent next time.
- Pulling is paged (`/sync/pull?paged=true`), so large datasets are downloaded completely.
- Local changes that have not been sent yet are never overwritten by a pull.
- The short-lived access token is renewed automatically with the stored refresh token.
