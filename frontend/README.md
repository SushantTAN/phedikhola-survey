# Frontend

Next.js App Router application containing both the public Citizen Portal and the protected Admin Panel.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Configure:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Admin UX

- shadcn/Radix component primitives
- Manrope + Noto Sans Devanagari fonts
- debounced searches
- clickable table rows
- View/Edit/Delete action menus
- Import/Export toolbars
- shared `CitizenForm` for create/edit via `mode="create" | "edit"`
- shared service form for create/edit
- ward-management section

Next.js handles routing; `react-router-dom` is not installed or used.
