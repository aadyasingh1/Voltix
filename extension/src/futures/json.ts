/** End index of the balanced {...} starting at `start`, ignoring braces inside JSON strings. */
function balancedEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/**
 * Finds the first JSON object containing `requiredKey` in model output. Models often wrap JSON
 * in code fences or prose, and a turn's text can include commentary from before a tool call.
 */
export function extractJsonObject(text: string, requiredKey: string): Record<string, unknown> | null {
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    const end = balancedEnd(text, start);
    if (end === -1) continue;
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && requiredKey in parsed) {
        return parsed as Record<string, unknown>;
      }
    } catch { /* not JSON from this brace: try the next one */ }
  }
  return null;
}
