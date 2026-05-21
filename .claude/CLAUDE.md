# General

- Always pull `main` before starting work on a ticket:
  ```
  git pull origin main
  ```

# Worktrees

- Always create a dedicated worktree for each ticket before starting implementation, unless explicitly told not to
- Always create worktrees from the `main` branch unless explicitly told otherwise
- When creating a worktree, copy all `.env` files and `.claude/settings.json` into it
- When launching the iOS app from a worktree, follow these steps:
  1. Symlink the workspace packages that pnpm places in the main repo (not the worktree root):
     ```
     MAIN=$(git worktree list | head -1 | awk '{print $1}')
     mkdir -p apps/mobile/node_modules/@commit
     for pkg in $(ls "$MAIN/apps/mobile/node_modules/@commit/"); do
       ln -sf "$MAIN/apps/mobile/node_modules/@commit/$pkg" "apps/mobile/node_modules/@commit/$pkg"
     done
     ```
  2. Run expo from `apps/mobile` using the main repo's binary (not `npx expo`):
     ```
     cd apps/mobile && $MAIN/node_modules/.bin/expo run:ios
     ```

# Testing

- After implementing a ticket, ask the user whether to test it in the iOS simulator before creating the PR
- Use `npx expo run` instead of `npx expo start`

# Linear

- Always write Linear tickets in English
- Always create a worktree for each ticket you work on
- Document your progress in the corresponding Linear ticket and keep it up to date

# GitHub

- Branch naming format: `COM-123/short-title`
- PR title format: must end with the ticket ID in square brackets — e.g. `"Add login screen [COM-123]"`
