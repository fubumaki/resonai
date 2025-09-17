import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Use Next.js core web vitals rules; TypeScript support is auto-detected
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'scripts/**', 'tools/**'],
  },
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style'] JSXExpressionContainer[expression.type!='ObjectExpression']",
          message: "Avoid inline styles; use CSS classes or SVG attributes (strict CSP).",
        },
        {
          selector: "JSXAttribute[name.name='style'] JSXExpressionContainer ObjectExpression Property[value.type='Literal'][key.name!='--pitch-position'][key.name!='--meter-width']",
          message: "Avoid inline styles; use CSS custom properties (--*) or CSS classes (strict CSP).",
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Avoid dangerouslySetInnerHTML; sanitize & render safely.",
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
];

export default eslintConfig;
