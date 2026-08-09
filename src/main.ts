import * as djot from "./djot.ts";
import * as templates from "./templates.ts";
import { mkdir } from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import { stat } from "node:fs";
import { join } from "node:path";

async function build() {
  const t = performance.now();
  await mkdir("./out", { recursive: true });

  const paths = [
    "css/*",
    "assets/*",
  ];
  for (const path of paths) {
    await update_path(path);
  }

  // Posts in content/uncategorized/ are listed first, with no category heading.
  const uncategorized = await collect_posts("uncategorized", "");
  const tech_posts = await collect_posts("tech");
  const ramblings = await collect_posts("ramblings");
  await update_file("out/index.html", templates.post_list(["", "tech", "ramblings"], [uncategorized, tech_posts, ramblings]).value);
  for (const post of uncategorized) {
    await update_file(`./out/${post.path}`,
      templates.post(post, false).value,
    )
  }
  for (const post of tech_posts) {
    await update_file(`./out/${post.path}`,
      templates.post(post, false).value,
    )
  }
  for (const post of ramblings) {
    await update_file(`./out/${post.path}`,
      templates.post(post, false).value,
    )
  }

  const curiosities = await collect_curiosities();
  const all_posts = [...uncategorized, ...tech_posts, ...ramblings, ...curiosities].sort((a, b) => b.date - a.date);
  await update_file("out/feed.xml", templates.feed(all_posts));

  const pages = ["about", "favourites", "photos", "curiosities"];
  for (const page of pages) {
    const file = Bun.file(`content/${page}.dj`);
    const text = await file.text();
    const ast = await djot.parse(text);
    const html = djot.render(ast, {});
    await update_file(`out/${page}.html`, templates.page(page, html).value);
  }
}

async function update_path(path: string) {
  if (path.endsWith("*")) {
    const dir = path.replace("*", "");
    const futs = [];

    const dir_entries = await readdirSync(`./content/${dir}`, { recursive: true, withFileTypes: true, });
    for await (const entry_name of dir_entries.filter(dir_entry => dir_entry.isFile()).map(dir_entry => dir_entry.name)) {
      futs.push(update_path(`${dir}${entry_name}`));
    }
    await Promise.all(futs);
  } else {
    const current = Bun.file(`content/${path}`);
    await update_file(
      `out/${path}`,
      await current.arrayBuffer(),
    );
  }
}


async function update_file(path: string, content: Uint8Array | string) {
  if (!content) return;
  await Bun.write(path, content);
}


export type Post = {
  year: number;
  month: number;
  day: number;
  date: Date;
  path: string;
  guid?: string;
  content: djot.HtmlString;
};
//export type Post = {
//  year: number;
//  month: number;
//  day: number;
//  slug: string;
//  date: Date;
//  title: string;
//  path: string;
//  src: string;
//  content: HtmlString;
//};

async function collect_posts(category: string, url_prefix: string = `/${category}`): Promise<Post[]> {
  const start = performance.now();
  const posts = [];
  if (!existsSync("./content/" + category)) return posts;

  const dir_entries = await readdirSync("./content/" + category, { recursive: true, withFileTypes: true, });
  const end = performance.now() - start;

  for (const f of dir_entries.filter(dir_entry => dir_entry.isFile()).map(dir_entry => dir_entry.name)) {
    const path = join("./content/" + category, f)

    if (stat(path, (err, stats) => { return stats.isDirectory() })) {
      continue;
    }

    const file = Bun.file(path);
    const [y, m, d, ...rest] = f.split(/[-.]/);
    rest.pop();
    const slug = rest.join("-");


    // const [, y, m, d, slug] = path.match(
    //   /^(\d\d\d\d)-(\d\d)-(\d\d)-(.*)\.dj$/,
    // )!;
    const [year, month, day] = [y, m, d].map((it) => parseInt(it, 10));
    const date = new Date(Date.UTC(year, month - 1, day));
    const render_ctx = { date, summary: undefined, title: undefined };

    // TODO: Unfortunately this seems to be the type for .dj files
    if (file.type !== "application/octet-stream") {
      continue;
    }

    const text = await file.text();
    const ast = djot.parse(text);
    const html = djot.render(ast, render_ctx);
    posts.push({
      year,
      month,
      day,
      date,
      path: `${url_prefix}/${y}/${m}/${d}/${slug}.html`,
      title: render_ctx.title,
      content: html,
    });
  }

  return posts.sort((d1, d2) => d2.date - d1.date);
}

async function collect_curiosities(): Promise<Post[]> {
  const text = await Bun.file("content/curiosities.dj").text();
  return parse_curiosity_sections(text);
}

export function parse_curiosity_sections(text: string): Post[] {
  const heading = /^####\s+((\d{1,2})(?:\s+[A-Za-z]+)?-(\d{1,2})\s+([A-Za-z]+),\s+(\d{4}))\s*$/gm;
  const matches = [...text.matchAll(heading)];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return matches.map((match, index) => {
    const label = match[1];
    const end_day = parseInt(match[3], 10);
    const month = months.indexOf(match[4]);
    const year = parseInt(match[5], 10);
    if (month === -1) throw new Error(`Unknown month in Curiosities heading: ${match[4]}`);

    const start = match.index!;
    const end = matches[index + 1]?.index ?? text.length;
    const section_source = text.slice(start, end).trim();
    const content = djot.render(djot.parse(section_source), {});
    const anchor = label.replace(/,/g, "").replace(/\s+/g, "-");
    const date = new Date(Date.UTC(year, month, end_day));

    return {
      year,
      month: month + 1,
      day: end_day,
      date,
      path: "/curiosities.html",
      guid: `/curiosities.html#${anchor}`,
      title: `curiosities: ${label}`,
      content,
    };
  });
}

async function serve() {
  const BASE_PATH = "./out";
  Bun.serve({
    port: 3000,
    async fetch(req) {
      var path = BASE_PATH + new URL(req.url).pathname;
      if (path.endsWith("/")) {
        path += "index.html";
      }
      const file = Bun.file(path);
      return new Response(file);
    },
  })
}


async function main() {
  const subcommand = Bun.argv[2];

  if (subcommand === "build") {
    build();
  } else if (subcommand === "serve") {
    serve();
  }
}

if (Bun.main) await main();
