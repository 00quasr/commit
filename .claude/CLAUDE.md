# General

- Use `npx expo run` instead of `npx expo start`

# Worktrees

- Always create a dedicated worktree for each ticket before starting implementation, unless explicitly told not to
- Always create worktrees from the `main` branch unless explicitly told otherwise
- When creating a worktree, copy all `.env` files and `.claude/settings.json` into it
- When launching the iOS app from a worktree, run `pod install` with locale env vars to avoid a Ruby encoding error caused by the `+` in the worktree path:
  ```
  LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
  ```

# Linear

- Always write Linear tickets in English
- Always create a worktree for each ticket you work on
- Document your progress in the corresponding Linear ticket and keep it up to date

# GitHub

- Branch naming format: `COM-123/short-title`
- PR title format: must end with the ticket ID in square brackets — e.g. `"Add login screen [COM-123]"`
