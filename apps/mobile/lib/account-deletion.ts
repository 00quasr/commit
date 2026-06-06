// Shared flag set by the delete-account screen while the destructive flow is
// in flight. The auto-upsert effect in (app)/_layout.tsx reads it to skip
// re-creating the profile in the gap between the purge mutation succeeding
// (which sets `profiles.me` to null on the client) and signOut completing
// (which clears Clerk's cached identity).
//
// Module-level mutable rather than React state because both the writer
// (delete-account.tsx) and the reader (_layout.tsx) sit on different sides of
// the tree, and a context provider would add tree-wide noise for a one-shot
// signal. The flag is reset to false when isSignedIn flips to false.
export const accountDeletion = { inProgress: false };
