# Phedikhola Citizen Survey Software

TypeScript monorepo containing three independent applications based on the Phedikhola Citizen Survey PRD:

- `backend/` — Node.js + Express + Prisma + PostgreSQL + Redis
- `frontend/` — Next.js App Router public Citizen Portal + protected Admin Panel
- `mobile/` — Android-first Expo / React Native offline field application using SQLite

The data model deliberately separates the long-lived **Citizen profile** from repeatable **Citizen Service Records** so health measurements, medicines, GPS, photos and visit history are preserved over time.

## Current architecture

```text
Public Citizen Portal + Admin Panel (Next.js)
                    |
                    | REST / HTTPS
                    v
             Express TypeScript API
             /          |           \
      PostgreSQL      Redis      Supabase Storage
             ^                         ^
             | batch push/pull         | signed upload token
             |                         |
       Expo Android app ---------------+
          local SQLite
```

Photos are uploaded directly from the web/mobile client to **Supabase Storage** using a short-lived signed upload token created by the backend. The Supabase service-role key remains backend-only. `multer` and local backend upload folders are not used.

## Included admin functionality

- Public citizen lookup on `/`
- Admin authentication and protected `/admin/*` area
- Dashboard cards/charts
- Citizens: debounced search, add, detail, edit, archive, import/export
- Full citizen demographics: DOB/age, gender, phone, category, multi-ward assignment, caste/group, marital status, occupation, living/care status, household foreign-employment status and photo
- Service records: add from admin, detail, edit, archive, import/export, vitals, health conditions, medicine quantities, GPS and photo
- Medicines: list/detail/add/edit/archive/import/export
- Staff: list/detail/add/edit/disable/import/export
- Ward management: list/detail/add/edit/archive/import/export
- Clickable table rows plus View/Edit/Delete action menus
- Reusable shadcn/Radix UI primitives throughout the web admin
- Manrope + Noto Sans Devanagari typography
- 350ms debounced admin searches

## Included mobile functionality

- Staff login + password reset flow
- Offline-first SQLite database
- Offline citizen creation with category and multi-ward assignment
- Offline service-record entry
- Vital signs, conditions, medicines and quantities
- GPS capture and camera/photo support
- Reference-data caching
- Pending/synced/failed/conflict state
- Client UUIDs for citizens and dependent service records
- Batch sync plus server-version conflict detection
- Supabase Storage photo upload after the parent record exists on the server
- App-version status support
- Translation-ready structure

## 1. Infrastructure

From this folder:

```bash
docker compose up -d
```

This starts PostgreSQL on `5432` and Redis on `6379`.

## 2. Supabase Storage

Create a Supabase project and a storage bucket named, for example:

```text
phedikhola-citizen-media
```

This starter returns persistent public URLs after upload, so configure that bucket as public. For a production deployment containing sensitive citizen photos, consider changing the read path to private-bucket signed URLs as part of the municipality privacy review.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in the frontend or mobile app.

## 3. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

Default API: `http://localhost:4000/api/v1`.

Configure PostgreSQL, Redis, Gmail SMTP and Supabase values in `.env` before running in a real environment.

The seed creates the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, initial wards, citizen categories, health conditions, medicine units and the medicine master list. Change seeded credentials outside local development.

## 4. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

Important routes:

```text
/                              public citizen portal
/citizen/[id]                  public citizen details
/admin/login                   admin login
/admin                         dashboard
/admin/citizens                citizens
/admin/citizens/new            add citizen
/admin/citizens/[id]           citizen detail
/admin/citizens/[id]/edit      edit citizen
/admin/services                service records
/admin/services/new            add service record
/admin/medicines               medicine management
/admin/staff                   staff management
/admin/wards                   ward management
/admin/data                    import/export center
```

Routing uses the Next.js App Router. `react-router-dom` is not used.

## 5. Mobile

```bash
cd mobile
cp .env.example .env
npm install
npx expo install --fix
npx expo start --android
```

For the Android emulator, `10.0.2.2` reaches the development computer. On a physical device, change `EXPO_PUBLIC_API_URL` to the backend computer's LAN address or a deployed HTTPS URL.

## Import/export

The backend exposes XLSX import/export endpoints for:

- citizens
- services
- medicines
- staff
- wards
- complete workbook export

The list-page Import buttons send a workbook to the matching resource import endpoint. Export downloads the current resource workbook.

## Verification performed for this ZIP

- All JSON manifests parse successfully.
- All TypeScript/TSX files pass TypeScript syntax transpilation.
- Internal source imports were checked; the only intentionally unresolved imports before setup are generated Prisma client files, which are created by `npm run prisma:generate`.
- No `multer`, local upload directory, `react-router-dom`, or raw web `<select>`/`<button>` controls remain outside the reusable UI primitive layer.

A full dependency-level build could not be completed in the packaging environment because npm registry installation timed out. Run the install, Prisma generation/migration, and normal project build commands locally before deployment.

## Production checklist

Before storing real citizen/health information, complete a privacy/security review, HTTPS deployment, secrets management, database and storage backup/restore testing, private-photo access strategy if required, device protection policy, automated test coverage, import rollback/preview behavior, audit-log review, and municipality-approved public-portal disclosure rules.
