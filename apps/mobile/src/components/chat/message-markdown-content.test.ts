import { describe, expect, it } from "vitest";

import {
  messageCodeContentForRender,
  messageMarkdownContentForRender,
} from "./message-markdown-content";

describe("messageMarkdownContentForRender", () => {
  it.each([
    ["soft break", "first\n"],
    ["blank line", "first\n\n"],
    ["hard break spaces", "first  "],
    ["list indentation", "- parent\n  "],
  ])("preserves trailing Markdown syntax while streaming: %s", (_name, content) => {
    expect(messageMarkdownContentForRender(content)).toBe(content);
  });

  it("keeps an empty streaming message renderable", () => {
    expect(messageMarkdownContentForRender("")).toBe(" ");
  });

  it("renders Codex inline formulas inside Chinese prose", () => {
    expect(
      messageMarkdownContentForRender(String.raw`追上需要 \(7.5 \div 5.5 = \frac{15}{11}\) 分钟。`),
    ).toBe(String.raw`追上需要 $7.5 \div 5.5 = \frac{15}{11}$ 分钟。`);
  });

  it("normalizes display formulas and preserves the enclosing lines", () => {
    expect(messageMarkdownContentForRender("结果\n\\[\n\\frac{720}{11}\n\\]\n分钟")).toBe(
      "结果\n$$\\frac{720}{11}$$\n分钟",
    );
  });

  it.each([
    ["inline code", "`\\(x\\)`"],
    ["fenced code", "~~~latex\n\\(x\\)\n~~~"],
    ["partial fenced code", "~~~latex\n\\(x\\)"],
    ["escaped opener", String.raw`\\(x\)`],
    ["existing math", String.raw`$\left\(x\right\)$`],
    ["incomplete streaming formula", String.raw`追上需要 \(720 \div`],
  ])("preserves %s", (_name, content) => {
    expect(messageMarkdownContentForRender(content)).toBe(content);
  });
});

describe("messageCodeContentForRender", () => {
  it("preserves incomplete fenced-code newlines while streaming", () => {
    expect(messageCodeContentForRender("const first = 1;\n\n")).toBe("const first = 1;\n\n");
  });
});
