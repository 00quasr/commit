# General

- Always pull `main` before starting work on a ticket:
  ```
  git pull origin main
  ```

# Worktrees

- Always create a dedicated worktree for each ticket before starting implementation, unless explicitly told not to
- Always create worktrees from the `main` branch unless explicitly told otherwise
- When creating a worktree, copy all `.env` files and `.claude/settings.json` into it
- After creating a worktree, symlink the workspace packages that pnpm places in the main repo (not the worktree root):
  ```
  MAIN=$(git worktree list | head -1 | awk '{print $1}')
  mkdir -p apps/mobile/node_modules/@commit
  for pkg in $(ls "$MAIN/apps/mobile/node_modules/@commit/"); do
    ln -sf "$MAIN/apps/mobile/node_modules/@commit/$pkg" "apps/mobile/node_modules/@commit/$pkg"
  done
  ```

# Testing

- After implementing a ticket, ask the user whether to test it in the iOS simulator before creating the PR
- Always use the main repo's expo binary (not `npx expo`) and run from `apps/mobile`
- **JS-only changes** (most tickets): no native build needed in the worktree. Start Metro from the worktree — the already-installed app connects and loads the new code:
  ```
  MAIN=$(git worktree list | head -1 | awk '{print $1}')
  cd apps/mobile && $MAIN/node_modules/.bin/expo start
  ```
  If the app is not yet installed, run `expo run:ios` once from the main repo first.
- **Native changes** (new native package, changes to `ios/`): run the full build from the worktree:
  ```
  MAIN=$(git worktree list | head -1 | awk '{print $1}')
  cd apps/mobile && $MAIN/node_modules/.bin/expo run:ios
  ```

# Linear

- Always write Linear tickets in English
- Always create a worktree for each ticket you work on
- Document your progress in the corresponding Linear ticket and keep it up to date

# GitHub

- Branch naming format: `COM-123/short-title`
- PR title format: must end with the ticket ID in square brackets — e.g. `"Add login screen [COM-123]"`
