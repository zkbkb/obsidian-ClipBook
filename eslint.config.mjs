import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	{
		ignores: ["main.js", "node_modules/**", "esbuild.config.mjs"],
	},
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: { project: "./tsconfig.json" },
		},
	},
	{
		files: ["src/**/*.ts"],
		rules: {
			// Community review uses prefer-active-window-timers; npm 0.3.0 still maps to window.*.
			"obsidianmd/prefer-window-timers": "off",
		},
	},
]);
