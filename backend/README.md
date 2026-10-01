# Backend

Express + TypeScript + Prisma + PostgreSQL + Redis API.

## Run

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

The seed creates active staff accounts using `<employee-code>@phedikhola.invalid` and `SEED_STAFF_PASSWORD` (default `TempPass123!`). Set real email addresses and passwords when issuing accounts.

API base: `http://localhost:4000/api/v1`

Main route groups:

- `/auth`
- `/public`
- `/citizens`
- `/services`
- `/master`
- `/staff`
- `/dashboard`
- `/data`
- `/sync`
- `/storage`

## Supabase Storage

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`.

`POST /storage/signed-upload` creates a short-lived signed upload token. Browser/mobile clients then upload directly to Supabase. The backend does not use `multer` or a local uploads directory.

## Import/export

`GET /data/export/:resource` and `POST /data/import/:resource` support `citizens`, `services`, `medicines`, `staff`, and `wards`. `all` is available for complete workbook export.
