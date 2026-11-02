import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import swiftdrop from "./eslint-rules/swiftdrop.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // SwiftDrop guard rails (CLAUDE.md "Structure" and "Design").
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { swiftdrop },
    rules: {
      // Colours and font sizes come only from the DESIGN.md tokens in src/app/globals.css.
      "swiftdrop/no-raw-colours": "error",
      // Features are used only through their index.ts; ui, lib, types and hooks never import features.
      "swiftdrop/feature-boundaries": "error",
      // Radix primitives are wrapped once, in components/ui.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "radix-ui",
              message: "Use the wrapped components in @/components/ui. If one is missing, add it there first.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // Pages and features build screens from components/ui, never from raw form controls.
    files: ["src/app/**/*.tsx", "src/features/**/*.tsx"],
    rules: {
      "react/forbid-elements": [
        "error",
        {
          forbid: [
            { element: "button", message: "Use Button, IconButton or TextButton from @/components/ui." },
            { element: "input", message: "Use Input, PasswordInput, PhoneInput, Checkbox or CodeInput from @/components/ui." },
            { element: "select", message: "Use Select from @/components/ui/select." },
            { element: "textarea", message: "Use Textarea from @/components/ui/textarea." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
