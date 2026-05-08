# commit — Phase Roadmap

Lightweight phase roadmap for `commit`. Source of truth for product scope is [VISION.md](../VISION.md). Detailed implementation designs live in plan files when each phase is started — these docs are just the map.

## Status

| Phase                                                    | Status     | Goal                                              | Days      |
| -------------------------------------------------------- | ---------- | ------------------------------------------------- | --------- |
| [0 — Preflight](./phase-0-preflight.md)                  | ✅ Done    | Accounts, integrations, decisions                 | 1–2       |
| [1 — Foundation](./phase-1-foundation.md)                | ✅ Done    | Monorepo + auth + Convex + dev loop on iPhone     | 3–7       |
| [2 — Core data & friendships](./phase-2-core-data.md)    | ✅ Done    | Schema, mutations, queries, domain logic — no UI  | 8–12      |
| [3 — Drop flow + habits](./phase-3-drop-flow.md)         | 🚧 Active  | Habits with cycles, camera, feed, profile heatmap | 13–19     |
| [4 — Social layer](./phase-4-social-layer.md)            | ⏳ Planned | Reactions, push, streaks, onboarding, invites     | 20–26     |
| [5 — Polish & App Store](./phase-5-polish-testflight.md) | ⏳ Planned | Perf, edge cases, EAS Build, App Store submission | 27–33     |
| [6 — Public Beta + App Store](./phase-6-public-beta.md)  | ⏳ Planned | App Store live, listening mode, retention metrics | Weeks 5–6 |

## How to use these docs

- Glance here first to see where the project is.
- Open the next-up phase doc to see its checklist.
- When you start a phase, flip its status to 🚧 in the table above.
- Open a fresh plan-mode session to design the detailed implementation — the design lives in the plan file, not here.
- When the phase ships, flip to ✅ and (if useful) edit that phase's doc to reflect what was actually built.

Update the status table whenever a phase moves between Planned → In progress → Done.
