import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // No emojis / text glyphs as interface icons — use GameIcon (Solar BoldDuotone).
      // Allows ✓/✕ inside plain-text sentences via eslint-disable with justification.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/[☀☾◈⚡♛◆◐◫◷⇪⎙👀🏆🎉🎊🔥💡🎯🎲🏅🥇⭐🌟✨💎🔔📣📯🔊🎵🎶⏰⏱⏳⌛🧠👑📱💻⚙️]/u]",
          message: "Use <GameIcon name=\"...\" /> (Solar BoldDuotone) instead of emoji/glyph icons.",
        },
        {
          selector: "JSXText[value=/[☀☾◈⚡♛◆◐◫◷⇪⎙👀🏆🎉🎊🔥💡🎯🎲🏅🥇⭐🌟✨💎🔔📣📯🔊🎵🎶⏰⏱⏳⌛🧠👑📱💻⚙️]/u]",
          message: "Use <GameIcon name=\"...\" /> (Solar BoldDuotone) instead of emoji/glyph icons.",
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
  // The guard must not flag its own pattern literals in this file.
  {
    files: ["eslint.config.mjs"],
    rules: { "no-restricted-syntax": "off" },
  },
]);

export default eslintConfig;
