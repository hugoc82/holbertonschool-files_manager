module.exports = {
  env: {
    browser: false,
    es6: true,
    jest: true,
    node: true,
    mocha: true,
  },
  extends: ["airbnb-base", "plugin:jest/all"],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  plugins: ["jest"],
  rules: {
    "max-classes-per-file": "off",
    "no-underscore-dangle": "off",
    "no-console": "off",
    "no-shadow": "off",
    "no-restricted-syntax": ["error", "LabeledStatement", "WithStatement"],
    "jest/prefer-expect-assertions": "off",
  },
  overrides: [
    {
      files: ["babel.config.js"],
      rules: { "import/no-extraneous-dependencies": "off" },
    },
  ],
};
