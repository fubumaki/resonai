import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import legacyConfig from './.eslintrc.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const extendsList = legacyConfig.extends
  ? Array.isArray(legacyConfig.extends)
    ? legacyConfig.extends
    : [legacyConfig.extends]
  : [];

const compatExtends = Array.from(
  new Set([...extendsList, 'next/typescript'])
);

const eslintConfig = [
  ...compat.extends(...compatExtends),
  {
    ignores: legacyConfig.ignorePatterns ?? [],
  },
  {
    rules: legacyConfig.rules ?? {},
  },
];

export default eslintConfig;
