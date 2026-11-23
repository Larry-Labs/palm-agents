const markdownMathTokens = new RegExp(
  [
    // Fenced examples can stay in a Markdown segment, including incomplete fences.
    /^(?: {0,3})(?<fence>\x60{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\k<fence>[\x60~]*[ \t]*(?=\n|$)|(?![\s\S]))/
      .source,
    /(?<!\x60)(?<code>\x60+)(?!\x60)[\s\S]*?(?<!\x60)\k<code>(?!\x60)/.source,
    /(?<!\$)(?<dollars>\${1,2})(?!\$)(?!\s)(?:\\[\s\S]|[^\\$])+?\k<dollars>(?!\$)/.source,
    /\\\\/.source,
    /\\\[(?<block>(?:\\(?!\])[\s\S]|[^\\])*?)\\\]/.source,
    /\\\((?<inline>(?:\\(?!\))[^\r\n]|[^\\\r\n])+?)\\\)/.source,
  ].join("|"),
  "gm",
);

export function messageMarkdownContentForRender(content: string) {
  if (!content.includes("\\(") && !content.includes("\\[")) {
    return content || " ";
  }

  // The native Markdown parser accepts dollar delimiters. Only normalize complete
  // Codex formulas, leaving escapes, code spans, and native math spans untouched.
  return content.replace(markdownMathTokens, (match, _fence, _code, _dollars, block, inline) => {
    if (typeof block === "string" && block.trim()) {
      return "$$" + block.trim() + "$$";
    }
    if (typeof inline === "string" && inline.trim()) {
      return "$" + inline.trim() + "$";
    }
    return match;
  });
}

export function messageCodeContentForRender(content: string) {
  return content;
}
