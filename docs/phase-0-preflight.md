# Phase 0 — Preflight

**Status**: ✅ Done
**Estimated days**: 1–2
**Depends on**: nothing
**Goal**: Procure accounts, integrations, and external dependencies before the first line of code.

## Subtasks

1. Clerk EU application created
2. Clerk → Convex integration activated (auto-creates the `convex` JWT template)
3. Google OAuth + email-code strategies enabled in Clerk
4. Convex cloud dev deployment provisioned (`original-puffin-311`, EU-west)
5. `CLERK_JWT_ISSUER_DOMAIN` env var set on the Convex deployment
6. Apple Developer Program — **deferred** (user declined the $99/yr fee for now; Apple Sign-In also deferred)
7. Domain `commit.app` — not yet registered (decide before Phase 5)

## End state

All credentials and third-party setup needed for Phase 1 are in place. The first `pnpm install && npx convex dev && pnpm --filter @commit/mobile dev` flow can run without account-creation interrupts.
