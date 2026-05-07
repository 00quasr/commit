// Monorepo-aware Metro config.
// Without watchFolders + nodeModulesPaths + disableHierarchicalLookup,
// Metro can resolve two copies of React from different package roots
// and crash with "Invalid hook call" or "Invariant Violation".
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
