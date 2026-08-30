# Tutorial: Initializing the React App

This walks through how the base of this project — a notes & tasks app similar to
Obsidian/a TODO app — was created: a Vite-powered React app (JavaScript, no
TypeScript) with a top navbar and client-side routing.

## 1. Scaffold the project with Vite

[Vite](https://vite.dev/) is a fast frontend build tool. It replaces older
tools like Create React App: it starts a dev server in milliseconds using
native ES modules and bundles for production with [Rollup](https://rollupjs.org/).
We used Vite's [React template](https://vite.dev/guide/#scaffolding-your-first-vite-project)
(JavaScript variant, not TypeScript, per the project requirements).

```bash
npm create vite@latest app -- --template react
cd app
npm install
```

This generates the `app/` folder with:

- `index.html` — the single HTML page the app mounts into (`<div id="root">`).
- `src/main.jsx` — the entry point; uses [`react-dom/client`](https://react.dev/reference/react-dom/client/createRoot)'s
  `createRoot` to render the app into `#root`.
- `src/App.jsx` — the root React component.
- `vite.config.js` — Vite configuration (uses the
  [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) plugin
  for JSX support and Fast Refresh).

## 2. Add client-side routing

The app needs multiple pages (a home screen, a note editor) without full page
reloads, so we added [React Router](https://reactrouter.com/), the standard
routing library for React.

```bash
npm install react-router-dom
```

Key concepts introduced:

- [`<BrowserRouter>`](https://reactrouter.com/api/declarative-routers/BrowserRouter) —
  wraps the app and enables routing using the browser's History API. It's
  applied once, in `src/main.jsx`, around `<App />`.
- [`<Routes>` / `<Route>`](https://reactrouter.com/api/components/Routes) —
  declares which component renders for a given URL path. Defined in
  `src/App.jsx`.
- [`<Link>`](https://reactrouter.com/api/components/Link) — renders an `<a>`
  that navigates client-side (no full page reload) instead of a plain anchor
  tag. Used in the navbar and the "New Note" button.

```jsx
// src/main.jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

```jsx
// src/App.jsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/notes/new" element={<NoteEditor />} />
</Routes>
```

## 3. Project structure

Components and pages were split for clarity, a common convention in React
projects (not enforced by React itself, but recommended as apps grow — see
[Thinking in React](https://react.dev/learn/thinking-in-react)):

```
src/
  components/   # reusable UI pieces (e.g. the top navbar)
    Topbar.jsx
    Topbar.css
  pages/        # one component per route
    Home.jsx
    Home.css
    NoteEditor.jsx
    NoteEditor.css
  App.jsx       # route definitions
  main.jsx      # app entry point, mounts <App /> with the router
  index.css     # global styles / CSS custom properties (theme colors, fonts)
```

- **`Topbar.jsx`** — the top navbar shown on every page, with a link back to
  home.
- **`Home.jsx`** — the landing page with a "+ New Note" button that links to
  `/notes/new`.
- **`NoteEditor.jsx`** — the page where markdown notes will be created and
  edited. Currently a plain [`<textarea>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea)
  bound to React state via [`useState`](https://react.dev/reference/react/useState),
  the standard hook for local component state. Markdown rendering/parsing
  will be added in a later step.

## 4. Responsive styling

No CSS framework was introduced yet — plain CSS with
[media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries)
(e.g. `@media (max-width: 600px)`) keeps the navbar and buttons usable on both
desktop and mobile, per the project's responsiveness requirement. Vite's
`index.html` already includes the standard responsive viewport meta tag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

## 5. Run the app

The Vite project (`package.json`, scripts, etc.) lives inside `app/`, not at
the repository root, so `npm` commands must be run from that directory:

```bash
cd app
npm run dev     # start the local dev server (hot reload)
npm run build   # produce an optimized production build in app/dist
```

The dev server prints a local URL (e.g. `http://localhost:5173`) to open in
the browser.

> See [`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
> for what happens if `npm run dev` is run from the repo root instead, and for
> convenience scripts that start the app from anywhere.

## Commands reference

| Command | Purpose |
| --- | --- |
| `npm create vite@latest app -- --template react` | Scaffold a new Vite + React (JS) project in `app/` |
| `npm install` | Install the scaffolded project's dependencies |
| `npm install react-router-dom` | Add client-side routing |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the app for production |
