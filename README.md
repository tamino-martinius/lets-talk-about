# lets-talk-about

Create beautiful slide presentations from Markdown.

## Quick Start

```bash
npx lets-talk-about init my-talk
cd my-talk
npm install
npx lets-talk-about dev
```

## Commands

| Command | Description |
|---|---|
| `lets-talk-about init [name]` | Scaffold a new presentation project |
| `lets-talk-about dev` | Start dev server with hot reload |
| `lets-talk-about build` | Build for production |
| `lets-talk-about deploy` | Deploy to GitHub Pages |

## Slide Format

Write slides in a single Markdown file. Each `---` starts a new slide:

```markdown
---
title: My Presentation
---

# First Slide

Content here

---

# Second Slide

- Point 1
- Point 2

---
type: section

# Section Divider
```

### Per-slide Options

Add options at the top of a slide, right after the `---` separator, followed by a blank line:

```markdown
---
type: section

# Section Title

---
build: true

## Revealed Items

- First
- Second
```

Each `---` starts a new slide. Options at the top clearly belong to that slide.

You can also use the legacy format with options in a separate `---` block (backward compatible):

```markdown
---
type: section
---

# Section Title
```

Available options:

| Option | Values | Description |
|---|---|---|
| `type` | `section` | Section divider slide with theme background |
| `build` | `true` | Progressive reveal of list items |
| `background` | `/assets/bg/1.jpg` | Background image path |
| `cover` | `true` | Use `cover` instead of `contain` for background |
| `class` | any CSS class | Add custom class to the slide |

## Code Blocks

Fenced code blocks support syntax highlighting, line numbers, and line highlighting via the info string:

````markdown
```js
const plain = 'syntax highlighting only';
```

```js linenums
const numbered = 'with line numbers';
```

```js h2
const line1 = 'normal';
const line2 = 'highlighted';
const line3 = 'normal';
```

```js linenums h2 h4-6
function example() {
  const a = 1;       // line 2: highlighted
  const b = 2;
  const c = 3;       // lines 4-6: highlighted
  const d = 4;
  const e = 5;
}
```
````

| Token | Description |
|---|---|
| `linenums` | Show line numbers |
| `hN` | Highlight line N (e.g. `h3`) |
| `hN-M` | Highlight lines N through M (e.g. `h4-6`) |

Combine freely: `` ```js linenums h1 h5-7 ``

## Templates

Templates let you arrange content within a slide using named slots. Use `::slotname::` delimiters to define slots:

```markdown
---
template: two-column

## Left Column

- Item A
- Item B

::right::

## Right Column

- Item C
- Item D
```

Content before any `::slotname::` delimiter becomes the `default` slot.

### Built-in Templates

| Template | Slots | Description |
|---|---|---|
| `default` | `default` | Standard slide (no change) |
| `two-column` | `default`, `right` | Side-by-side flex columns |
| `title-content` | `title`, `default` | Title area with border, content below |

### Custom Templates

Define custom templates in `lets-talk-about.config.js`:

```js
export default {
  templates: {
    'my-layout': (slots) => `
      <div class="sidebar">${slots.sidebar || ''}</div>
      <div class="main">${slots.default || ''}</div>
    `,
  },
};
```

Each template is a function that receives an object of rendered HTML slots and returns HTML.

## Layouts

Layouts add persistent elements (header, footer, watermark) to every slide:

```js
export default {
  layout: {
    header: '<span>My Talk</span>',
    footer: '<span>{{slideNumber}} / {{totalSlides}}</span>',
    watermark: '<span>DRAFT</span>',
  },
};
```

Use `{{slideNumber}}` and `{{totalSlides}}` placeholders for dynamic numbering.

### Function Layout

For dynamic layouts, use a function:

```js
export default {
  layout: (slideNumber, totalSlides) => ({
    footer: `<span>${slideNumber} / ${totalSlides}</span>`,
  }),
};
```

## Theme Customization

### Config Colors

Override CSS variables in `lets-talk-about.config.js`:

```js
export default {
  theme: {
    colorTheme: '#e44',
    colorBackground: '#1a1a2e',
  },
};
```

### Custom CSS

```js
export default {
  styles: './custom.css',
};
```

### Full Override

Import only the JS engine:

```js
import { init } from 'lets-talk-about/client/slides';
```

## Deployment

The scaffolded project includes a GitHub Actions workflow that builds and deploys your slides to GitHub Pages.

### Setup

1. Push your project to GitHub
2. Go to your repo's **Settings > Pages**
3. Under **Build and deployment > Source**, select **GitHub Actions**

The workflow triggers on pushes to the `main` branch. If your default branch has a different name, update `branches:` in `.github/workflows/deploy.yml`.

### Custom Domain

To use a custom domain, add a `CNAME` file to your project root containing the domain:

```
my-slides.example.com
```

The deploy workflow automatically detects the `CNAME` file and adjusts the base path — no manual configuration needed.

## License

MIT
