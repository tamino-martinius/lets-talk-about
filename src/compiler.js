import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import { builtinTemplates } from './templates.js';

const SLIDE_KEYS = new Set(['type', 'build', 'background', 'cover', 'class', 'template']);

function parseFenceInfo(info) {
  const tokens = info.trim().split(/\s+/);
  let lang = '';
  let linenums = false;
  const highlights = new Set();

  for (const token of tokens) {
    if (token === 'linenums') {
      linenums = true;
    } else if (/^h(\d+)-(\d+)$/.test(token)) {
      const [, startStr, endStr] = token.match(/^h(\d+)-(\d+)$/);
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      for (let i = start; i <= end; i++) highlights.add(i);
    } else if (/^h(\d+)$/.test(token)) {
      highlights.add(parseInt(token.slice(1), 10));
    } else if (!lang) {
      lang = token;
    }
  }

  return { lang, linenums, highlights };
}

function wrapLines(html, highlights) {
  const lines = html.split('\n');
  // Drop trailing empty line from hljs output
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const result = [];
  let openTags = []; // stack of open <span ...> tags

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const cls = highlights.has(lineNum) ? 'code-line highlight' : 'code-line';

    // Reopen tags that were open from previous line
    const prefix = openTags.join('');
    let line = prefix + lines[i];

    // Track open/close spans in this line to know what carries over
    let match;
    const tagStack = [...openTags];

    // Scan the original line (without prefix) for tag changes
    const originalLine = lines[i];
    const scanRegex = /<span[^>]*>|<\/span>/g;
    while ((match = scanRegex.exec(originalLine)) !== null) {
      if (match[0] === '</span>') {
        tagStack.pop();
      } else {
        tagStack.push(match[0]);
      }
    }

    // Close all open tags at end of line
    const closeSuffix = '</span>'.repeat(tagStack.length);

    result.push(`<span class="${cls}">${line}${closeSuffix}</span>`);

    // Carry over open tags to next line
    openTags = tagStack;
  }

  return result.join('\n');
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(str, { language: lang }).value;
    }
    return hljs.highlightAuto(str).value;
  },
});

md.renderer.rules.fence = function (tokens, idx) {
  const token = tokens[idx];
  const { lang, linenums, highlights } = parseFenceInfo(token.info);

  if (lang === 'mermaid') {
    return `<pre class="mermaid">${md.utils.escapeHtml(token.content)}</pre>\n`;
  }

  let code;
  if (lang && hljs.getLanguage(lang)) {
    code = hljs.highlight(token.content, { language: lang }).value;
  } else if (lang) {
    code = md.utils.escapeHtml(token.content);
  } else {
    code = hljs.highlightAuto(token.content).value;
  }

  if (linenums || highlights.size > 0) {
    const wrapped = wrapLines(code, highlights);
    const preClass = linenums ? ' class="linenums"' : '';
    const langClass = lang ? ` language-${lang}` : '';
    return `<pre${preClass}><code class="hljs${langClass}">${wrapped}</code></pre>\n`;
  }

  const langClass = lang ? ` language-${lang}` : '';
  return `<pre><code class="hljs${langClass}">${code}</code></pre>\n`;
};

function isSlideOptions(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Try to parse as YAML-like key: value lines
  const lines = trimmed.split('\n');
  const opts = {};
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) return null;
    const [, key, value] = match;
    if (!SLIDE_KEYS.has(key)) return null;
    // Parse booleans
    if (value === 'true') opts[key] = true;
    else if (value === 'false') opts[key] = false;
    else opts[key] = value;
  }
  return Object.keys(opts).length > 0 ? opts : null;
}

function extractInlineOptions(segment) {
  const blankLineIndex = segment.indexOf('\n\n');
  if (blankLineIndex === -1) return null;

  const top = segment.slice(0, blankLineIndex);
  const rest = segment.slice(blankLineIndex + 2).trim();

  const opts = isSlideOptions(top);
  if (opts && rest) {
    return { options: opts, content: rest };
  }
  return null;
}

function parseSlots(content) {
  const slots = {};
  const parts = content.split(/^::(\w+)::\s*$/m);

  // First part is always the default slot
  slots.default = parts[0].trim();

  // Remaining parts alternate: slot name, slot content
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i];
    const body = (parts[i + 1] || '').trim();
    slots[name] = body;
  }

  return slots;
}

function resolveTemplate(name, config) {
  const userTemplates = config.templates || {};
  const all = { ...builtinTemplates, ...userTemplates };
  return all[name] || builtinTemplates.default;
}

function applyLayout(innerHtml, slideIndex, totalSlides, config) {
  const layoutConfig = config.layout || {};

  let regions;
  if (typeof layoutConfig === 'function') {
    regions = layoutConfig(slideIndex + 1, totalSlides);
  } else {
    regions = { ...layoutConfig };
  }

  if (!regions || Object.keys(regions).length === 0) {
    return innerHtml;
  }

  function replacePlaceholders(str) {
    return str
      .replace(/\{\{slideNumber\}\}/g, String(slideIndex + 1))
      .replace(/\{\{totalSlides\}\}/g, String(totalSlides));
  }

  let layoutHtml = '';

  if (regions.header) {
    layoutHtml += `\n        <div class="layout-region layout-header">${replacePlaceholders(regions.header)}</div>`;
  }
  if (regions.footer) {
    layoutHtml += `\n        <div class="layout-region layout-footer">${replacePlaceholders(regions.footer)}</div>`;
  }
  if (regions.watermark) {
    layoutHtml += `\n        <div class="layout-region layout-watermark">${replacePlaceholders(regions.watermark)}</div>`;
  }

  return innerHtml + layoutHtml;
}

function renderSlide(content, options, slideIndex, totalSlides, config) {
  const classes = [''];
  if (options.type === 'section') classes.push('section');
  if (options.build) classes.push('build');
  if (options.class) classes.push(options.class);

  const attrs = [];
  if (options.background) attrs.push(`data-background="${options.background}"`);
  if (options.cover) attrs.push('data-cover="true"');

  const className = classes.filter(Boolean).join(' ');
  const classAttr = className ? ` class="${className}"` : '';
  const extraAttrs = attrs.length ? ' ' + attrs.join(' ') : '';

  // Parse slots from content
  const slots = parseSlots(content);

  // Render markdown for each slot
  const renderedSlots = {};
  for (const [name, markdown] of Object.entries(slots)) {
    renderedSlots[name] = md.render(markdown).trim();
  }

  // Apply template
  const templateName = options.template || 'default';
  const templateFn = resolveTemplate(templateName, config);
  let html = templateFn(renderedSlots);

  // Apply layout
  html = applyLayout(html, slideIndex, totalSlides, config);

  return `      <article${classAttr}${extraAttrs}>\n        ${html}\n      </article>`;
}

export function compile(source, config = {}) {
  const { data: globalData, content } = matter(source);
  const title = globalData.title || config.title || 'Presentation';

  // Split on --- that appears on its own line
  const segments = content.split(/\n---\n/);

  // First pass: collect slide data to determine totalSlides
  const slideData = [];
  let pendingOptions = {};

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const opts = isSlideOptions(trimmed);
    if (opts) {
      // Pure options block (backward compat)
      pendingOptions = opts;
    } else {
      // Try extracting inline options from top of segment
      const inline = extractInlineOptions(trimmed);
      if (inline) {
        const mergedOptions = { ...pendingOptions, ...inline.options };
        slideData.push({ content: inline.content, options: mergedOptions });
      } else {
        slideData.push({ content: trimmed, options: pendingOptions });
      }
      pendingOptions = {};
    }
  }

  const totalSlides = slideData.length;

  // Second pass: render slides with templates and layout
  const slides = slideData.map((slide, index) =>
    renderSlide(slide.content, slide.options, index, totalSlides, config)
  );

  return { title, slides };
}

export function buildHTML(source, config = {}) {
  const { title, slides } = compile(source, config);
  const base = config.base || '/';

  // Build theme style block — always emit all CSS variables so they
  // appear before Vite-injected styles and aren't overridden by defaults
  const themeDefaults = {
    colorTheme: '#6c6',
    colorForeground: '#000',
    colorBackground: '#fff',
    colorVignette: '#765',
    colorSectionForeground: '#fff',
  };
  const merged = { ...themeDefaults, ...(config.theme || {}) };
  const vars = Object.entries(merged)
    .map(([key, value]) => {
      const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `  ${cssVar}: ${value};`;
    })
    .join('\n');
  const themeStyle = `\n    <style>:root {\n${vars}\n    }</style>`;

  // Custom CSS link
  let customCSS = '';
  if (config.styles) {
    customCSS = `\n    <link rel="stylesheet" href="${config.styles}">`;
  }

  const slidesHTML = slides.join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=1100,height=750">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>${title}</title>
    <base href="${base}">${themeStyle}${customCSS}
  </head>
  <body>
    <section class="slides layout-regular template-default">
${slidesHTML}
    </section>
    <script type="module" src="/@lets-talk-about/client"></script>
  </body>
</html>`;
}
