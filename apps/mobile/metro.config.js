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
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
