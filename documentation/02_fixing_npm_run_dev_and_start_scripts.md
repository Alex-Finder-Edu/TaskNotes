# Tutorial: Fixing `npm run dev` and Adding Start Scripts

## The error

Running `npm run dev` from the **repository root** (instead of `app/`) fails:

```
npm run dev
npm error code ENOENT
npm error syscall open
npm error path C:\workspace\GitProfiles\af_edu\ReactTimelineApp\package.json
npm error errno -4058
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '...\package.json'
```

### Why this happens

[`npm run <script>`](https://docs.npmjs.com/cli/v10/commands/npm-run-script)
looks for a `package.json` in the **current working directory** and reads its
[`scripts`](https://docs.npmjs.com/cli/v10/using-npm/scripts) field to know
what `dev` means. The React app created in
[`01_react_app_initialization.md`](./01_react_app_initialization.md) was
scaffolded into `app/`, so that's where `app/package.json` (with the `dev`,
`build`, etc. scripts defined by the Vite template) lives — not at the repo
root. There is no `package.json` at the repo root by design, since this repo
also contains an unrelated Python project (`pyproject.toml`, `main.py`) at the
top level.

### The fix

Run npm commands from inside `app/`:

```bash
cd app
npm run dev
```

or use one of the start scripts described below, which do this for you from
any working directory.

## Start scripts

To make starting the app less error-prone, two equivalent scripts were added
under [`commands/`](../commands): a [PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/overview)
script for Windows and a POSIX shell script for macOS/Linux/Git Bash. Both:

1. Resolve the repository root relative to the script's own location (so they
   work regardless of the caller's current directory).
2. Verify `app/package.json` exists (fails fast with a clear message
   otherwise — the same class of error this fix addresses).
3. Run `npm install` automatically the first time, if `app/node_modules`
   doesn't exist yet.
4. Run `npm run dev` inside `app/`.

### Windows (PowerShell)

```powershell
powershell -File commands\start-app.ps1
```

Uses [`$PSScriptRoot`](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_automatic_variables)
(the directory containing the running script) to locate `app/` reliably, and
[`Push-Location`/`Pop-Location`](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/push-location)
to temporarily switch into it without permanently changing the caller's shell
directory.

### macOS/Linux/Git Bash

```bash
./commands/start-app.sh
```

Uses `${BASH_SOURCE[0]}` to find the script's own path (more reliable than
`$0` when the script is sourced or symlinked) to locate `app/` the same way.

## Commands reference

| Command | Purpose |
| --- | --- |
| `cd app && npm run dev` | Start the dev server manually (must run from `app/`) |
| `powershell -File commands\start-app.ps1` | Start the dev server from anywhere, on Windows |
| `./commands/start-app.sh` | Start the dev server from anywhere, on macOS/Linux/Git Bash |
