// Monorepo-aware Metro config.
// Without watchFolders + nodeModulesPaths + disableHierarchicalLookup,
// Metro can resolve two copies of React from different package roots
// and crash with "Invalid hook call" or "Invariant Violation".
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const isWorktree = projectRoot.includes("/.claude/worktrees/");
// In a git worktree the real package node_modules live in the main repo root.
const monorepoRoot = isWorktree
  ? path.resolve(projectRoot, "../../../../..")
  : path.resolve(projectRoot, "../..");
const worktreeRoot = isWorktree ? path.resolve(projectRoot, "../..") : null;

const config = getDefaultConfig(projectRoot);

config.watchFolders = worktreeRoot ? [monorepoRoot, worktreeRoot] : [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
  ...(worktreeRoot ? [path.resolve(worktreeRoot, "node_modules")] : []),
];
config.resolver.disableHierarchicalLookup = true;

// Watchman crawls everything under monorepoRoot, which includes sibling
// worktrees in .claude/worktrees/<other>. expo-router's require.context
// then picks up app/ trees from those other worktrees and tries to bundle
// them, blowing up with stale-import errors. Block worktree paths that
// aren't ours.
if (worktreeRoot) {
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const worktreeName = path.basename(worktreeRoot);
  config.resolver.blockList = [
    new RegExp(`${escapeRe(monorepoRoot)}/\\.claude/worktrees/(?!${escapeRe(worktreeName)}/).+`),
  ];
}

module.exports = config;
