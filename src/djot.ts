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
  };
  const result = djot.renderHTML(doc,  { overrides });
  return new HtmlString(result);
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
