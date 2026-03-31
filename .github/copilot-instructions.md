<!-- .github/copilot-instructions.md
Purpose: concise, project-specific guidance for AI coding agents (Copilot/GPT/assistants).
Keep this file ~20–50 lines and only include discoverable patterns from the repo.
-->

# Copilot / AI Agent Instructions for crm-jst

Brief: This is a small React + Vite single-page app that uses Supabase as its primary data source and Leaflet for map visualizations. Aim to make small, well-scoped edits that match existing patterns (JSX files under `src/`, Tailwind utility classes, route-driven pages).

**Architecture**:
- **Frontend:** React + Vite (file entry: `src/main.jsx`). Routes defined in `src/App.jsx` (`/`, `/data`, `/map`).
- **Pages:** `src/pages/*` contains the app pages. Examples: `src/pages/Data.jsx` (queries `atm_data`), `src/pages/Map.jsx` (combines `atm_data` + `preventives`).
- **Data:** Supabase is the remote DB. Client created in `src/supabaseClient.js` and used directly from pages (e.g., `supabase.from('atm_data').select('*')`).

**Developer workflows / commands**:
- Install: `npm install` (project root).
- Dev server: `npm run dev` → starts Vite HMR.
- Build: `npm run build`.
- Preview production build: `npm run preview`.
- Lint: `npm run lint` (uses ESLint configuration in repo).

**Integration & patterns to follow**:
- Queries against Supabase use `supabase.from(...).select(...)` (see `src/pages/Data.jsx`). Keep the simple async/await + `{ data, error }` pattern used in code.
- The Map page performs a manual merge: it queries `atm_data` and `preventives` and then maps `preventive` to an ATM by `atm.id === preventive.atm_id` (see `src/pages/Map.jsx`). Preserve that merging style when adding features.
- UI styling: Tailwind utility classes applied via `className` in JSX. `vite.config.js` includes the Tailwind plugin; add styles to `src/index.css` if needed.
- Icons: Map uses remote Google Maps marker icons (hard-coded URLs). Keep consistent icon usage or add similar icons if required.

**Files & examples (explicit references)**:
- Routes: `src/App.jsx` — register new pages/components here.
- Supabase client: `src/supabaseClient.js` — contains the current project Supabase URL + anon key. Agents should _not_ replace or leak credentials; if you must change keys, ask first.
- Data list: `src/pages/Data.jsx` — example table UI and `supabase.from('atm_data')` usage.
- Map logic & filtering: `src/pages/Map.jsx` — example of SLA-based marker color logic and month-range queries.

**Conventions & notes**:
- Files use `.jsx` modules with default exports; follow that pattern for new components.
- Comments and some UI text are in Indonesian — keep translations consistent if editing copy.
- Routing uses `react-router-dom` (v7). Use `<Routes>` / `<Route path=... element=.../>` as in `src/App.jsx`.
- Avoid introducing large runtime dependencies; prefer using existing packages in `package.json` (React, Leaflet, Supabase, Tailwind).

**Secrets & safety**:
- The Supabase URL/key are currently committed in `src/supabaseClient.js`. Do not commit new secrets. If migrating to environment variables, update `src/supabaseClient.js` and ensure `.gitignore` contains env files.

If anything in this file is unclear or you want more examples (tests, CI, or DB schema), tell me which area to expand.
