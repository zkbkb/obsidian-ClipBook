/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { makeRowRoving, registerRowControl } from "../src/ui/roving-focus";

function buildRow(): {
	row: HTMLElement;
	controls: HTMLElement[];
} {
	document.body.innerHTML = "";
	const row = document.createElement("div");

	const key = document.createElement("span");
	key.setAttribute("role", "button");
	const value = document.createElement("span");
	value.setAttribute("role", "button");
	const copy = document.createElement("button");
	const remove = document.createElement("button");

	const controls = [key, value, copy, remove];
	for (const [i, control] of controls.entries()) {
		row.appendChild(control);
		registerRowControl(control, i === 0);
	}

	document.body.appendChild(row);
	makeRowRoving(row, "API Token");
	return { row, controls };
}

function press(target: HTMLElement, key: string): void {
	target.dispatchEvent(
		new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
	);
}

describe("roving focus", () => {
	let row: HTMLElement;
	let controls: HTMLElement[];

	beforeEach(() => {
		({ row, controls } = buildRow());
	});

	it("announces the row as a toolbar, named after the entry", () => {
		expect(row.getAttribute("role")).toBe("toolbar");
		expect(row.getAttribute("aria-label")).toBe("API Token");
	});

	// The point of the exercise: four controls, one tab stop.
	it("leaves exactly one control reachable by Tab", () => {
		expect(controls.map((c) => c.tabIndex)).toEqual([0, -1, -1, -1]);
	});

	it("moves right and left with the arrow keys", () => {
		controls[0]?.focus();
		press(controls[0]!, "ArrowRight");
		expect(document.activeElement).toBe(controls[1]);

		press(controls[1]!, "ArrowLeft");
		expect(document.activeElement).toBe(controls[0]);
	});

	it("wraps around at both ends", () => {
		controls[0]?.focus();
		press(controls[0]!, "ArrowLeft");
		expect(document.activeElement).toBe(controls[3]);

		press(controls[3]!, "ArrowRight");
		expect(document.activeElement).toBe(controls[0]);
	});

	it("jumps to the ends with Home and End", () => {
		controls[1]?.focus();
		press(controls[1]!, "End");
		expect(document.activeElement).toBe(controls[3]);

		press(controls[3]!, "Home");
		expect(document.activeElement).toBe(controls[0]);
	});

	// Returning to a row should land where the reader left it.
	it("moves the tab stop to whichever control was last focused", () => {
		controls[2]?.focus();
		expect(controls.map((c) => c.tabIndex)).toEqual([-1, -1, 0, -1]);
	});

	it("leaves other keys alone", () => {
		controls[0]?.focus();
		press(controls[0]!, "Enter");
		expect(document.activeElement).toBe(controls[0]);
	});

	// While a value is being edited its element hosts a text input, and the
	// arrow keys belong to the caret.
	it("does not steal the arrow keys from an input being edited", () => {
		const input = document.createElement("input");
		controls[1]?.appendChild(input);
		input.focus();

		press(input, "ArrowRight");
		expect(document.activeElement).toBe(input);
	});
});
