import { describe, expect, it } from "vitest";

import { t } from "./index";

describe("Chinese UI messages", () => {
  it("keeps native input mention indicators available", () => {
    expect(t("Ask Codex anything. Try $skills or @files.")).toContain("$");
    expect(t("Ask Codex anything. Try $skills or @files.")).toContain("@");
  });

  it("inserts user-controlled values literally without interpreting replacement syntax", () => {
    expect(t("Open thread {0}", "$& {1} <project>")).toBe("打开会话 $& {1} <project>");
  });

  it("omits absent optional display metadata", () => {
    expect(t("Subagent {0}", undefined)).toBe("子代理 ");
  });
});
