import js from "@eslint/js";
import json from "@eslint/json";
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const obsidianRulesOffForJson = Object.fromEntries(
	Object.keys(obsidianmd.rules).map((ruleName) => [
		`obsidianmd/${ruleName}`,
		"off",
	])
);
const typescriptRulesOffForJson = Object.fromEntries(
	Object.keys(tseslint.plugin.rules).map((ruleName) => [
		`@typescript-eslint/${ruleName}`,
		"off",
	])
);

export default defineConfig([
	{
		ignores: [
			"main.js",
			"node_modules/**",
			"package-lock.json",
			"*.config.mjs",
			"esbuild.config.mjs",
			"version-bump.mjs",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.json"],
		plugins: {
			jsonFile: json,
		},
		language: "jsonFile/json",
		rules: {
			...obsidianRulesOffForJson,
			...typescriptRulesOffForJson,
			"jsonFile/no-duplicate-keys": "error",
			"no-irregular-whitespace": "off",
			"obsidianmd/validate-manifest": "error",
		},
	},
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: __dirname,
			},
		},
		rules: {
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
			"obsidianmd/prefer-window-timers": "off",
			"no-prototype-builtins": "off",
			"no-unused-vars": "off",
		},
	},
]);
