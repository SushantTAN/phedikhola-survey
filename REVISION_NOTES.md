# Revision Notes — 2026-09-29

This revision updates the initial implementation to match the latest requested admin UX and PRD fields.

## Web admin

- Added 350ms debouncing to Citizens, Service Records, Medicines, Staff and Ward searches.
- Split Citizen create/edit into separate routes while sharing `CitizenForm` with `mode="create" | "edit"`.
- Added admin Service Record create/detail/edit flows.
- Added Ward Management list/detail/create/edit/archive section.
- Added clickable table rows and View/Edit/Delete action menus.
- Added per-resource Import/Export controls on all main admin tables.
- Added a more polished responsive admin shell, dashboard cards and typography using Manrope + Noto Sans Devanagari.
- Replaced native web form controls with reusable shadcn/Radix-style primitives.

## Citizen fields

The shared citizen form now includes:

- Full name
- Date of birth
- Approximate age
- Gender
- Phone
- Citizen category (single dropdown)
- Wards (multi-select)
- Caste/community group + Other
- Marital status
- Occupation + Other
- Living/care status
- Household foreign-employment status
- Citizen photo

## Service records

Admin service entry includes:

- Citizen
- Service ward
- Service date
- Nepali year/month
- Systolic/diastolic blood pressure
- Pulse rate
- Temperature
- Health conditions + Other
- Medicines, quantities and units
- Latitude/longitude/altitude/accuracy
- Service photo
- Notes

## Photo storage

- Replaced backend filesystem/Multer uploads with Supabase Storage.
- Backend issues signed upload tokens.
- Web/mobile clients upload directly to Supabase.
- Removed `multer`, upload middleware, local upload directories and file-asset model usage.

## Offline mobile

- Added citizen ward assignments to SQLite and sync payloads.
- Added additive migration for existing SQLite databases missing `ward_ids`.
- Citizen category sync follows the current single-category web requirement while retaining compatible local JSON storage.
- Photos synchronize to Supabase after the parent server record is available.
