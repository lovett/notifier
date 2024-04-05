module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "varsIgnorePattern": "^_"}]
  },
  ignorePatterns: ["server/types", "node_modules/"],
};
