import * as djot from "@djot/djot";
import { Doc } from "djot/ast.ts";
import { time, HtmlString } from "./templates.ts";


type RenderCtx = {
  date?: Date;
  summary?: string;
  title?: string;
}

export function parse(source: string): Doc {
  const doc = djot.parse(source);
  return doc;
}

export function render(doc: Doc, ctx: RenderCtx): HtmlString {
  let section: Section | undefined = undefined;
  const overrides = {
    heading: (node: Heading, r: djot.HTMLRenderer) => {
      const tag = `h${node.level}`;
      const date = node.level == 1 && ctx.date ? time(ctx.date, "meta").value : "";
      const children = r.renderChildren(node);
      if (node.level == 1) ctx.title = get_string_content(node);
      const id = node.level > 1 && section?.attributes?.id;
      if (id) {
        return `
    <${tag}${r.renderAttributes(node)}>
    <a href="#${id}">${children} ${date}</a>
    </${tag}>\n`;
      } else {
        return `\n<div class="title"><${tag}${
          r.renderAttributes(node)
        }>${children} </${tag}>${date}</div>\n`;
      }
    },
     image: (node: Image, r: HTMLRenderer): string => {
      if (has_class(node, "video")) {
        if (!node.destination) throw "missing destination";
        if (has_class(node, "loop")) {
          return `<video src="${node.destination}" autoplay muted=true loop=true></video>`;
        } else {
          return `<video src="${node.destination}" controls muted=true></video>`;
        }
      }
      return r.renderAstNodeDefault(node);
    },
  };
  const result = djot.renderHTML(doc,  { overrides });
  return new HtmlString(result);
}


function attr(node: HasAttributes, name: string): string | undefined {
  return node.attributes ? node.attributes[name] : undefined;
}

function has_class(node: AstNode, cls: string): boolean {
  const classes = attr(node, "class") ?? "";
  return classes.split(" ").includes(cls);
}

const get_string_content = function (node: AstNode): string {
  const buffer: string[] = [];
  add_string_content(node, buffer);
  return buffer.join("");
};


const add_string_content = function (
  node: AstNode,
  buffer: string[],
): void {
  if ("text" in node) {
    buffer.push(node.text);
  } else if (
    "tag" in node &&
    (node.tag === "soft_break" || node.tag === "hard_break")
  ) {
    buffer.push("\n");
  } else if ("children" in node) {
    for (const child of node.children) {
      add_string_content(child, buffer);
    }
  }
};
