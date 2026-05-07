import base from "@commit/eslint-config/base";

export default [
  ...base,
  {
    ignores: ["convex/_generated/**"],
  },
];
