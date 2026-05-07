import next from "@commit/eslint-config/next";

export default [
  ...next,
  {
    ignores: ["next-env.d.ts", ".next/**"],
  },
];
