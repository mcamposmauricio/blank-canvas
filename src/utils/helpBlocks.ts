// ─── Help Center Block Types & Converters ─────────────────────────────────

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'image'
  | 'gif'
  | 'button'
  | 'callout'
  | 'divider'
  | 'steps'
  | 'table'
  | 'icon_text';

export interface HeadingData { level: 2 | 3; text: string }
export interface ParagraphData { html: string }
export interface ListData { ordered: boolean; items: string[] }
export interface ImageData { src: string; alt?: string; caption?: string; link?: string; width?: number; height?: number }
export interface GifData { src: string }
export interface ButtonData { text: string; url: string; variant?: 'primary' | 'secondary' | 'outline' }
export interface CalloutData { type: 'info' | 'warn' | 'success' | 'error'; text: string }
export interface DividerData {}
export interface StepData { title: string; description: string }
export interface StepsData { steps: StepData[] }
export interface TableData { headers: string[]; rows: string[][] }
export interface IconTextData { icon: string; title: string; description: string }

export type BlockData =
  | HeadingData
  | ParagraphData
  | ListData
  | ImageData
  | GifData
  | ButtonData
  | CalloutData
  | DividerData
  | StepsData
  | TableData
  | IconTextData;

export interface EditorBlock {
  id: string;
  type: BlockType;
  data: BlockData;
}

export interface EditorSchema {
  blocks: EditorBlock[];
}

// ─── Generate unique block id ─────────────────────────────────────────────
export function generateBlockId(): string {
  return crypto.randomUUID();
}

// ─── Create default block by type ─────────────────────────────────────────
export function createDefaultBlock(type: BlockType): EditorBlock {
  const id = generateBlockId();
  switch (type) {
    case 'heading': return { id, type, data: { level: 2, text: '' } as HeadingData };
    case 'paragraph': return { id, type, data: { html: '' } as ParagraphData };
    case 'list': return { id, type, data: { ordered: false, items: [''] } as ListData };
    case 'image': return { id, type, data: { src: '', alt: '' } as ImageData };
    case 'gif': return { id, type, data: { src: '' } as GifData };
    case 'button': return { id, type, data: { text: 'Clique aqui', url: '', variant: 'primary' } as ButtonData };
    case 'callout': return { id, type, data: { type: 'info', text: '' } as CalloutData };
    case 'divider': return { id, type, data: {} as DividerData };
    case 'steps': return { id, type, data: { steps: [{ title: '', description: '' }] } as StepsData };
    case 'table': return { id, type, data: { headers: ['Coluna 1', 'Coluna 2'], rows: [['', '']] } as TableData };
    case 'icon_text': return { id, type, data: { icon: '💡', title: '', description: '' } as IconTextData };
  }
}

// ─── Sanitize HTML ────────────────────────────────────────────────────────
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript\s*:/gi, '');
}

// ─── Blocks → HTML ───────────────────────────────────────────────────────
export function blocksToHtml(blocks: EditorBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'heading': {
        const d = block.data as HeadingData;
        const tag = `h${d.level}`;
        return `<${tag}>${sanitizeHtml(d.text)}</${tag}>`;
      }
      case 'paragraph': {
        const d = block.data as ParagraphData;
        return sanitizeHtml(d.html);
      }
      case 'list': {
        const d = block.data as ListData;
        const tag = d.ordered ? 'ol' : 'ul';
        const items = d.items.map(i => `<li>${sanitizeHtml(i)}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      case 'image': {
        const d = block.data as ImageData;
        const img = `<img src="${d.src}" alt="${d.alt || ''}"${d.width ? ` width="${d.width}"` : ''}${d.height ? ` height="${d.height}"` : ''} />`;
        const withLink = d.link ? `<a href="${d.link}" target="_blank" rel="noopener">${img}</a>` : img;
        return `<figure>${withLink}${d.caption ? `<figcaption>${sanitizeHtml(d.caption)}</figcaption>` : ''}</figure>`;
      }
      case 'gif': {
        const d = block.data as GifData;
        return `<figure><img src="${d.src}" alt="GIF" /></figure>`;
      }
      case 'button': {
        const d = block.data as ButtonData;
        return `<div class="help-cta"><a href="${d.url}" class="help-btn help-btn--${d.variant || 'primary'}" target="_blank" rel="noopener">${sanitizeHtml(d.text)}</a></div>`;
      }
      case 'callout': {
        const d = block.data as CalloutData;
        return `<div class="help-callout help-callout--${d.type}">${sanitizeHtml(d.text)}</div>`;
      }
      case 'divider':
        return '<hr />';
      case 'steps': {
        const d = block.data as StepsData;
        const items = d.steps.map((s, i) => `<li><strong>Passo ${i + 1}: ${sanitizeHtml(s.title)}</strong><p>${sanitizeHtml(s.description)}</p></li>`).join('');
        return `<ol class="help-steps">${items}</ol>`;
      }
      case 'table': {
        const d = block.data as TableData;
        const ths = d.headers.map(h => `<th>${sanitizeHtml(h)}</th>`).join('');
        const trs = d.rows.map(row => `<tr>${row.map(c => `<td>${sanitizeHtml(c)}</td>`).join('')}</tr>`).join('');
        return `<table class="help-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
      }
      case 'icon_text': {
        const d = block.data as IconTextData;
        return `<div class="help-icon-text"><span class="icon">${d.icon}</span><div><strong>${sanitizeHtml(d.title)}</strong><p>${sanitizeHtml(d.description)}</p></div></div>`;
      }
      default:
        return '';
    }
  }).join('\n');
}

// ─── HTML → Blocks (for import) ──────────────────────────────────────────
export function htmlToBlocks(htmlString: string): EditorBlock[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const blocks: EditorBlock[] = [];

  const processNode = (node: Element) => {
    const tag = node.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const level = tag === 'h3' ? 3 : 2;
      blocks.push({ id: generateBlockId(), type: 'heading', data: { level, text: node.textContent || '' } as HeadingData });
    } else if (tag === 'h4') {
      // h4 treated as heading level 3
      blocks.push({ id: generateBlockId(), type: 'heading', data: { level: 3, text: node.textContent || '' } as HeadingData });
    } else if (tag === 'p') {
      // Check if it's just an image wrapper
      const img = node.querySelector('img');
      if (img && node.children.length === 1) {
        processImageElement(img, node);
      } else {
        blocks.push({ id: generateBlockId(), type: 'paragraph', data: { html: `<p>${sanitizeHtml(node.innerHTML)}</p>` } as ParagraphData });
      }
    } else if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.querySelectorAll(':scope > li')).map(li => li.innerHTML);
      blocks.push({ id: generateBlockId(), type: 'list', data: { ordered: tag === 'ol', items: items.map(sanitizeHtml) } as ListData });
    } else if (tag === 'img') {
      processImageElement(node, null);
    } else if (tag === 'a' && node.querySelector('img')) {
      const img = node.querySelector('img')!;
      processImageElement(img, node);
    } else if (tag === 'figure') {
      const img = node.querySelector('img');
      if (img) processImageElement(img, node);
    } else if (tag === 'hr') {
      blocks.push({ id: generateBlockId(), type: 'divider', data: {} as DividerData });
    } else if (tag === 'table') {
      const headers = Array.from(node.querySelectorAll('thead th, thead td')).map(th => th.textContent || '');
      const rows = Array.from(node.querySelectorAll('tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent || '')
      );
      if (headers.length > 0 || rows.length > 0) {
        blocks.push({ id: generateBlockId(), type: 'table', data: { headers: headers.length ? headers : rows[0]?.map(() => ''), rows: headers.length ? rows : rows.slice(1) } as TableData });
      }
    } else if (tag === 'div' || tag === 'section' || tag === 'article') {
      // Recurse into container elements
      Array.from(node.children).forEach(child => processNode(child as Element));
    } else if (node.innerHTML?.trim()) {
      blocks.push({ id: generateBlockId(), type: 'paragraph', data: { html: `<p>${sanitizeHtml(node.innerHTML)}</p>` } as ParagraphData });
    }
  };

  const processImageElement = (img: Element, wrapper: Element | null) => {
    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    const width = img.getAttribute('width') ? parseInt(img.getAttribute('width')!) : undefined;
    const height = img.getAttribute('height') ? parseInt(img.getAttribute('height')!) : undefined;
    let link: string | undefined;

    // Check if wrapped in <a>
    const parentA = wrapper?.tagName?.toLowerCase() === 'a' ? wrapper : img.closest('a');
    if (parentA) link = parentA.getAttribute('href') || undefined;

    const caption = wrapper?.querySelector('figcaption')?.textContent || undefined;

    blocks.push({ id: generateBlockId(), type: 'image', data: { src, alt, caption, link, width, height } as ImageData });
  };

  Array.from(doc.body.children).forEach(child => processNode(child as Element));

  return blocks;
}

// ─── Extract article metadata from HTML ──────────────────────────────────
export function extractArticleMetadata(htmlString: string): { title: string; subtitle: string; bodyBlocks: EditorBlock[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Title: first h1, or <title>, or empty
  const h1 = doc.querySelector('h1');
  const title = h1?.textContent?.trim() || doc.title?.trim() || '';

  // Subtitle: first h4 after h1
  let subtitle = '';
  if (h1) {
    let next = h1.nextElementSibling;
    if (next?.tagName?.toLowerCase() === 'h4') {
      subtitle = next.textContent?.trim() || '';
      next.remove();
    }
    h1.remove();
  }

  // If no subtitle, use first <p> up to 180 chars
  if (!subtitle) {
    const firstP = doc.querySelector('p');
    if (firstP) {
      const text = firstP.textContent?.trim() || '';
      if (text.length <= 180) {
        subtitle = text;
        firstP.remove();
      } else {
        subtitle = text.slice(0, 180) + '…';
      }
    }
  }

  const bodyBlocks = htmlToBlocks(doc.body.innerHTML);
  return { title, subtitle, bodyBlocks };
}

// ─── Editor Schema → HTML (supports both legacy blocks and new HTML format) ──
export function editorSchemaToHtml(schema: any): string {
  if (!schema) return '';
  // New format: { html: "..." }
  if (typeof schema.html === 'string') return schema.html;
  // Legacy format: { blocks: [...] }
  if (Array.isArray(schema.blocks) && schema.blocks.length > 0) return blocksToHtml(schema.blocks);
  return '';
}
