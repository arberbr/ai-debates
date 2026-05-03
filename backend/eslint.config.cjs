const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const legacy = require('./.eslintrc.js');

module.exports = [...compat.config(legacy)];
