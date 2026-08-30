# Tutorial: Pushing the Project to GitHub

The project was developed locally on the `init_react_app` branch, but the
local repository had no [remote](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes)
configured yet, so nothing had been pushed anywhere.

## Concepts

- **Remote**: a named reference to another copy of the repository (typically
  hosted elsewhere, e.g. GitHub). `origin` is the conventional name for a
  repo's primary remote. See [`git remote`](https://git-scm.com/docs/git-remote).
- **Upstream branch**: the remote branch a local branch tracks, so future
  `git push`/`git pull` (without extra arguments) know where to sync. Set the
  first time with `git push -u <remote> <branch>`. See
  [`git push`](https://git-scm.com/docs/git-push).
- **Staging area**: `git add` stages changes; `git commit` records the staged
  snapshot as a new commit. See [Git Basics: Recording Changes](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository).

## Steps

1. Link the local repository to the GitHub repo as `origin`:

   ```bash
   git remote add origin https://github.com/Alex-Finder-Edu/TaskNotes.git
   ```

2. Stage and commit the work done so far (the app, its documentation, and the
   start scripts):

   ```bash
   git add app commands documentation prompts
   git commit -m "Initialize React app with routing, docs, and start scripts"
   ```

3. Push the branch and set it to track the remote:

   ```bash
   git push -u origin init_react_app
   ```

   After this, plain `git push`/`git pull` on this branch will sync with
   `origin/init_react_app` automatically.

4. (Optional) Open a pull request from `init_react_app` into `main` on GitHub
   once pushed, if `main` is meant to be the stable branch — this repo's
   commits so far have all been made on `init_react_app`, not `main`.

## Commands reference

| Command | Purpose |
| --- | --- |
| `git remote add origin <url>` | Register the GitHub repo as the `origin` remote |
| `git add <paths>` | Stage changes for commit |
| `git commit -m "<message>"` | Record staged changes as a commit |
| `git push -u origin <branch>` | Push a branch and set its upstream tracking remote |
| `git remote -v` | List configured remotes (verify `origin` is set) |
