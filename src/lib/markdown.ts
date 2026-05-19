/**
 * Markdown + frontmatter helpers. The generators emit a lot of frontmatter'd
 * markdown — centralizing the format avoids drift.
 */

export interface Frontmatter {
  [key: string]: string | string[] | undefined;
}

/** Render YAML frontmatter + body into a single string. */
export function withFrontmatter(fm: Frontmatter, body: string): string {
  const lines: string[] = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      lines.push(`${k}: ${v.join(', ')}`);
    } else {
      // Quote if value contains a colon or starts with a YAML-significant char
      const needsQuote = /[:#\[\]{}&*!|>'"%@`]/.test(v) || /^[\s-]/.test(v);
      lines.push(`${k}: ${needsQuote ? JSON.stringify(v) : v}`);
    }
  }
  lines.push('---', '', body.trimEnd(), '');
  return lines.join('\n');
}

/**
 * Build a markdown table from an array of rows. The header is also the column
 * order; rows must have matching keys.
 */
export function table<T extends Record<string, string>>(
  headers: (keyof T)[],
  rows: T[]
): string {
  if (rows.length === 0) return '';
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((r) => `| ${headers.map((h) => String(r[h] ?? '')).join(' | ')} |`)
    .join('\n');
  return [head, sep, body].join('\n');
}

/** Indent every line by N spaces (used inside list items). */
export function indent(s: string, n: number): string {
  const pad = ' '.repeat(n);
  return s.split('\n').map((l) => (l ? pad + l : l)).join('\n');
}

/** Join non-empty strings with double newlines. */
export function paragraphs(...parts: (string | undefined | null | false)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join('\n\n');
}

/** Render a heading + body, omitting both if body is empty. */
export function section(title: string, body: string | null | undefined): string {
  if (!body || !body.trim()) return '';
  return `## ${title}\n\n${body.trim()}`;
}

/** Sentence-case a kebab-case or camelCase identifier. */
export function humanize(s: string): string {
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}
