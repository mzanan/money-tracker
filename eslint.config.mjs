import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const solidButtonRule = {
  selector:
    "JSXOpeningElement[name.name=/^(button|a)$/] JSXAttribute[name.name='className'] Literal[value=/rounded-full/][value=/bg-white/]",
  message:
    "Inline solid button/anchor styling, reuse <Button> (@/components/ui/button) instead of hand-written bg-white rounded-full classes.",
};

const rawDbModule = "^(@/lib/|(\\.\\.?/)+(lib/)?)db(/index)?/?$";
const rawDbMessage =
  "Query per-user tables through forUser() and global tables through shared() from @/lib/db/scope.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "no-restricted-syntax": ["error", solidButtonRule],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/db/**", "src/lib/auth.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ regex: rawDbModule, message: rawDbMessage }] },
      ],
      "no-restricted-syntax": [
        "error",
        solidButtonRule,
        {
          selector: `ImportExpression[source.value=/${rawDbModule.replaceAll("/", "\\/")}/]`,
          message: rawDbMessage,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
