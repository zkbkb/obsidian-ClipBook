import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		// Build output and dependencies are not ours to lint.
		ignores: ["main.js", "node_modules/**"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
		},
		rules: {
			// An unused parameter is often documentation — a handler that takes
			// an event it does not read still says what it is handed.
			"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-empty-function": "off",
			"no-prototype-builtins": "off",
		},
	},
	{
		// Config and build scripts run in Node, not in Obsidian.
		files: ["*.mjs", "*.config.*"],
		languageOptions: {
			globals: { process: "readonly", console: "readonly" },
		},
	}
);
