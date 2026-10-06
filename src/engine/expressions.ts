// Helpers to evaluate user-written JavaScript.
// NOTE: this runs code directly in the browser with no sandbox. That's fine for a
// personal tool running locally, but never run flows written by untrusted people.

type AsyncFn = (...args: unknown[]) => Promise<unknown>;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => AsyncFn;

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Evaluates a JS expression such as `input.stars > 100`. */
export function evaluate(expression: string, input: unknown): unknown {
  try {
    const fn = new Function('input', `"use strict"; return (${expression});`);
    return fn(input);
  } catch (err) {
    throw new Error(`Expression "${expression}" failed: ${errorMessage(err)}`);
  }
}

/** Replaces every `{{ expression }}` in a text with its value. */
export function renderTemplate(template: string, input: unknown): string {
  return template.replace(/\{\{([\s\S]+?)\}\}/g, (_, expression: string) => {
    const value = evaluate(expression.trim(), input);
    if (value === undefined || value === null) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

/** Runs the body of an async function that receives `input` and returns a value. */
export async function runCode(code: string, input: unknown): Promise<unknown> {
  const fn = new AsyncFunction('input', code);
  return fn(input);
}
