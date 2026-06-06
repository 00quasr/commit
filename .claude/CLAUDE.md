# General

- Always pull `main` before starting work on a ticket:
  ```
  git pull origin main
  ```

# Worktrees

- Always create a dedicated worktree for each ticket before starting implementation, unless explicitly told not to
- Always create worktrees from the `main` branch unless explicitly told otherwise
- When creating a worktree, copy all `.env` files and `.claude/settings.json` into it. The `.env` files live in subdirectories — copy them explicitly:
  ```
  WORKTREE=".claude/worktrees/<name>"
  MAIN=$(git worktree list | head -1 | awk '{print $1}')
  cp "$MAIN/apps/mobile/.env" "$WORKTREE/apps/mobile/.env"
  cp "$MAIN/apps/web/.env" "$WORKTREE/apps/web/.env"
  cp "$MAIN/packages/convex/.env.local" "$WORKTREE/packages/convex/.env.local"
  cp "$MAIN/.claude/settings.json" "$WORKTREE/.claude/settings.json"
  ```
- After creating a worktree, run `pnpm install` from the worktree root. pnpm uses hardlinks from its content-addressable store (~20s, minimal extra disk space) and correctly sets up both the root `node_modules` and the `apps/mobile/node_modules/@commit` workspace links pointing to the worktree's own packages:
  ```
  pnpm install
  ```

# Testing

- After implementing a ticket, ask the user whether to test it in the iOS simulator before creating the PR
- Always use the main repo's expo binary (not `npx expo`) and run from `apps/mobile`
- **Always start Metro/Expo on port 8081.** If port 8081 is already in use, kill the process occupying it before starting — do not let Expo fall back to 8082 or any other port. Only use a different port if the user explicitly requests it:
  ```
  lsof -ti:8081 | xargs kill -9 2>/dev/null || true
  ```
- **JS-only changes** (most tickets):
  1. Check if the app is already installed on the simulator. If not, run the native build once from the main repo:
     ```
     MAIN=$(git worktree list | head -1 | awk '{print $1}')
     cd "$MAIN/apps/mobile" && $MAIN/node_modules/.bin/expo run:ios
     ```
  2. Then start Metro from the worktree — the installed app connects and loads the worktree's code:
     ```
     MAIN=$(git worktree list | head -1 | awk '{print $1}')
     lsof -ti:8081 | xargs kill -9 2>/dev/null || true
     cd apps/mobile && $MAIN/node_modules/.bin/expo start --port 8081
     ```
- **Native changes** (new native package, changes to `ios/`): run the full build from the worktree:
  ```
  MAIN=$(git worktree list | head -1 | awk '{print $1}')
  lsof -ti:8081 | xargs kill -9 2>/dev/null || true
  cd apps/mobile && $MAIN/node_modules/.bin/expo run:ios
  ```

# Linear

- Always write Linear tickets in English
- Always create a worktree for each ticket you work on
- Document your progress in the corresponding Linear ticket and keep it up to date

# GitHub

- Branch naming format: `COM-123-short-title`
- Worktree naming format: `COM-123-short-title` (same as branch)
- PR title format: must end with the ticket ID in square brackets — e.g. `"Add login screen [COM-123]"`
