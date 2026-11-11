/**
 * Lightweight Markdown → HTML renderer.
 * Handles the common subset that an LLM shopping report will produce:
 * headings, bold/italic, tables, lists, blockquotes, code, HR, and links.
 *
 * All text content is HTML-escaped before processing, so the renderer is
 * safe against basic injection. Link hrefs are additionally validated.
 */

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeHref(url: string): string {
  const trimmed = url.trim();
  if (/^javascript:/i.test(trimmed)) return '#';
  return trimmed;
}

function inlineFormat(s: string): string {
  return s
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_([^_]+?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, text, url) => `<a href="${safeHref(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`,
    );
}

export function renderMarkdown(raw: string): string {
  const lines = raw.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escHtml(lines[i]));
        i++;
      }
      out.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
      i++;
      continue;
    }

    // Markdown table (must start with |)
    if (line.trim().startsWith('|') && line.includes('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
        const isSeparator = cells.every(c => /^[-: ]+$/.test(c));
        if (!isSeparator) rows.push(cells);
        i++;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        const th = head.map(c => `<th>${inlineFormat(escHtml(c))}</th>`).join('');
        const tb = body
          .map(row => `<tr>${row.map(c => `<td>${inlineFormat(escHtml(c))}</td>`).join('')}</tr>`)
          .join('');
        out.push(`<table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>`);
      }
      continue;
    }

    // ATX headings
    const heading = line.match(/^(#{1,3}) (.+)$/);
    if (heading) {
      const n = heading[1].length;
      out.push(`<h${n}>${inlineFormat(escHtml(heading[2]))}</h${n}>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(inlineFormat(escHtml(lines[i].slice(2))));
        i++;
      }
      out.push(`<blockquote>${bqLines.join('<br>')}</blockquote>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      out.push('<hr>');
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(`<li>${inlineFormat(escHtml(lines[i].replace(/^[-*+] /, '')))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li>${inlineFormat(escHtml(lines[i].replace(/^\d+\. /, '')))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      out.push('<br>');
      i++;
      continue;
    }

    // Fallback: paragraph
    out.push(`<p>${inlineFormat(escHtml(line))}</p>`);
    i++;
  }

  return out.join('\n');
}
