/**
 * Splits text into masked spans so it can rise or fade in letter by letter.
 *
 * The split runs on the client only, after the first paint, and the original
 * markup is restored on teardown so React's hydration output is never
 * disturbed.
 */

const ORIGINAL = new WeakMap<Element, string>();

type SplitMode = "chars" | "words";

function wrap(text: string, className: string): HTMLSpanElement {
  const outer = document.createElement("span");
  outer.className = className;
  const inner = document.createElement("span");
  inner.className = `${className}__inner`;
  inner.textContent = text;
  outer.append(inner);
  return outer;
}

/** Splits an element's text into per-character masked spans. */
export function splitChars(element: Element): HTMLElement[] {
  const text = element.textContent ?? "";
  if (!text.trim()) return [];
  if (!ORIGINAL.has(element)) ORIGINAL.set(element, element.innerHTML);
  const fragment = document.createDocumentFragment();
  const parts: HTMLElement[] = [];
  for (const character of text) {
    if (character === " ") {
      fragment.append(document.createTextNode(" "));
      continue;
    }
    const span = wrap(character, "split-char");
    fragment.append(span);
    parts.push(span);
  }
  element.replaceChildren(fragment);
  return parts;
}

/** Splits an element's text into per-word masked spans. */
export function splitWords(element: Element): HTMLElement[] {
  const text = element.textContent ?? "";
  if (!text.trim()) return [];
  if (!ORIGINAL.has(element)) ORIGINAL.set(element, element.innerHTML);
  const fragment = document.createDocumentFragment();
  const parts: HTMLElement[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  words.forEach((word, index) => {
    if (index > 0) fragment.append(document.createTextNode(" "));
    const span = wrap(word, "split-word");
    fragment.append(span);
    parts.push(span);
  });
  element.replaceChildren(fragment);
  return parts;
}

export function splitElement(element: Element, mode: SplitMode): HTMLElement[] {
  return mode === "words" ? splitWords(element) : splitChars(element);
}

/** Restores the markup an element had before it was split. */
export function restoreSplit(element: Element): void {
  const original = ORIGINAL.get(element);
  if (original === undefined) return;
  element.innerHTML = original;
  ORIGINAL.delete(element);
}
