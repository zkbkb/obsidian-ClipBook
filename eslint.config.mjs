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
		// Handing an async function to something that expects `void` throws the
		// promise away: the work is unordered and a rejection surfaces nowhere.
		// Catching that needs type information, so these two rules — and the
		// parser service they depend on — apply to the typed sources only.
		// Everything else here is checked without it, which is why the plugin
		// shipped a settings tab full of `onChange(async ...)`.
		files: ["src/**/*.ts", "tests/**/*.ts"],
		languageOptions: {
			parserOptions: { projectService: true },
		},
		rules: {
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/no-floating-promises": "error",
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
