const site_url = "https://spiral-ladder.github.io";
const blurb = "spiral ladder";

export class HtmlString {
  constructor(public value: string) {
  }
  push(other: HtmlString) {
    this.value = `${this.value}\n${other.value}`;
  }
}

export const base = (
  { content, src, title, path, description, extra_css }: {
    content: HtmlString;
    src: string;
    title: string;
    description: string;
    path: string;
    extra_css?: string;
  },
): HtmlString =>
 html` 
<!DOCTYPE html>
<html lang='en-US'>
<head>
  <meta charset='utf-8'>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <link rel="icon" href="/favicon.png" type="image/png">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="${site_url}${path}">
  <link rel="alternate" type="application/rss+xml" title="bh" href="${site_url}/feed.xml">
  <style>
  @font-face {
    font-family: 'Open Sans'; src: url('/css/OpenSans-300-Normal.woff2') format('woff2');
    font-weight: 300; font-style: normal;
  }
  @font-face {
    font-family: 'JetBrains Mono'; src: url('/css/JetBrainsMono-400-Normal.woff2') format('woff2');
    font-weight: 400; font-style: normal;
  }
  @font-face {
    font-family: 'JetBrains Mono'; src: url('/css/JetBrainsMono-700-Normal.woff2') format('woff2');
    font-weight: 700; font-style: normal;
  }
  @font-face {
    font-family: 'EB Garamond'; src: url('/css/EBGaramond-400-Normal.woff2') format('woff2');
    font-weight: 400; font-style: normal;
  }
  @font-face {
    font-family: 'EB Garamond'; src: url('/css/EBGaramond-400-Italic.woff2') format('woff2');
    font-weight: 400; font-style: italic;
  }
  @font-face {
    font-family: 'EB Garamond'; src: url('/css/EBGaramond-700-Normal.woff2') format('woff2');
    font-weight: 700; font-style: normal;
  }
  @font-face {
    font-family: 'EB Garamond'; src: url('/css/EBGaramond-700-Italic.woff2') format('woff2');
    font-weight: 700; font-style: italic;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; margin-block-start: 0; margin-block-end: 0; }

  body {
    max-width: 80ch;
    padding: 2ch;
    margin-left: auto;
    margin-right: auto;
  }

  header { margin-bottom: 2rem; }
  header > nav { display: flex; column-gap: 2ch; align-items: baseline; flex-wrap: wrap; }
  header a { font-style: normal; color: rgba(0, 0, 0, .7); text-decoration: none; }
  header a:hover { font-style: normal; color: rgba(0, 0, 0, 1); text-decoration: none; }
  header .title { font-size: 1.25em; flex-grow: 2; }

  footer { margin-top: 2rem; }
  footer > p { display: flex; column-gap: 2ch; justify-content: center; flex-wrap: wrap; }
  footer a { color: rgba(0, 0, 0, .8); text-decoration: none; white-space: nowrap; }
  footer i { vertical-align: middle; color: rgba(0, 0, 0, .8) }

  </style>

  <link rel="stylesheet" href="/css/site.css">
  ${extra_css ? html`<link rel="stylesheet" href="/css/${extra_css}">` : ""}
</head>

<body>
  <header>
    <nav>
      <a class="title" href="/">bing</a>
      <a href="/about.html">About</a>
      <a href="/favourites.html">Favourites</a>
    </nav>
  </header>

  <main>
  ${content}
  </main>

  <footer>
  </footer>
</body>

</html>
`;

export const post_list = (categories: string[], posts_: Post[][]): HtmlString => {
  var lists = [] 
  for (var i=0; i < posts_.length; i+=1) {
    const list_items = posts_[i].map((post) =>
      html`
  <li>
    <a href="${post.path}">${post.title}</a> ${time(post.date, "meta")}
  </li>`
    );
    lists.push(list_items)
  }

  var posts_by_category = []
  for (var i=0; i < categories.length; i+=1) {
    if (lists[i].length == 0) continue;
    const list = html`
<h2>${categories[i]}</h2>
<ul class="post-list">${lists[i]}</ul>
`
    posts_by_category.push(list)
  }

  return base({
    path: "",
    title: "bing",
    description: blurb,
    src: "/src/templates.ts",
    content: html`
${posts_by_category}
`,
  });
};

export function post(post: Post, spellcheck: boolean): HtmlString {
  return base({
    src: post.src,
    title: post.title,
    description: post.summary,
    path: post.path,
    content: html`<article ${
      spellcheck ? 'contentEditable="true"' : ""
    }>\n${post.content}</article>`,
  });
}

export function page(name: string, content: HtmlString) {
  return base({
    path: `/${name}`,
    title: "bing",
    description: blurb,
    src: `/content/${name}.dj`,
    extra_css: undefined,
    content,
  });
}

export function time(date: Date, cls?: string): HtmlString {
  const human = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const machine = yyyy_mm_dd(date);
  return html`<time ${
    cls ? `class="${cls}"` : ""
  } datetime="${machine}">${human}</time>`;
}

function yyyy_mm_dd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function html(
  strings: ArrayLike<string>,
  ...values: any[]
): HtmlString {
  function content(value: any): string[] {
    if (value === undefined) return [];
    if (value instanceof HtmlString) return [value.value];
    if (Array.isArray(value)) return value.flatMap(content);
    return [escapeHtml(value)];
  }
  return new HtmlString(
    String.raw({ raw: strings }, ...values.map((it) => content(it).join(""))),
  );
}

function escapeHtml(data: any): string {
  return `${data}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
