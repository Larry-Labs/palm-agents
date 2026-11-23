import type { ChatMessage } from "codex-relay/api-schema";
import { describe, expect, it } from "vitest";

import { buildTimelineRows } from "./turn-activity";

function message(
  id: string,
  role: ChatMessage["role"],
  fields: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id,
    threadId: "thread",
    role,
    kind: "chat",
    content: id,
    createdAt: "2026-11-23T00:00:00Z",
    ...fields,
  };
}

describe("buildTimelineRows", () => {
  it.each([[[]], [["Technical summary"]]])(
    "shows elapsed time alone for a turn without user-facing progress (summary: %j)",
    (summary) => {
      const prompt = message("prompt", "user", { turnId: "turn" });
      const thinking = message("thinking", "reasoning", {
        turnId: "turn",
        kind: "thinking",
        content: "",
        details: { summary },
      });
      const tool = message("tool", "tool", { turnId: "turn", kind: "toolActivity" });
      const reply = message("reply", "assistant", {
        turnId: "turn",
        details: { phase: "final_answer", turnDurationMs: 9_000 },
      });

      expect(buildTimelineRows([prompt, thinking, tool], true)).toEqual([
        { type: "message", message: prompt },
      ]);
      expect(buildTimelineRows([prompt, thinking, tool, reply], false)).toEqual([
        { type: "message", message: prompt },
        {
          type: "activity",
          activity: {
            id: "reply",
            entries: [],
            durationMs: 9_000,
            isRunning: false,
          },
        },
        { type: "message", message: reply },
      ]);
    },
  );

  it("preserves progress and command order while hiding other tool calls", () => {
    const prompt = message("prompt", "user", { turnId: "turn" });
    const progress = message("progress", "assistant", {
      turnId: "turn",
      details: { phase: "commentary" },
    });
    const thinking = message("thinking", "reasoning", { turnId: "turn", kind: "thinking" });
    const failedTool = message("failed-tool", "tool", { turnId: "turn", state: "failed" });
    const firstCommand = message("first-command", "tool", {
      turnId: "turn",
      kind: "commandExecution",
      content: "node --version",
    });
    const secondCommand = message("second-command", "tool", {
      turnId: "turn",
      kind: "commandExecution",
      details: { command: "pnpm --version" },
    });
    const followUp = message("follow-up", "assistant", {
      turnId: "turn",
      details: { phase: "commentary" },
    });
    const lastCommand = message("last-command", "tool", {
      turnId: "turn",
      kind: "commandExecution",
      content: "pnpm test",
    });
    const approval = message("approval", "tool", { turnId: "turn", kind: "approvalRequest" });
    const input = message("input", "status", { turnId: "turn", kind: "structuredUserInput" });
    const reply = message("reply", "assistant", {
      turnId: "turn",
      details: { phase: "final_answer", turnDurationMs: 365_000 },
    });
    expect(
      buildTimelineRows(
        [
          prompt,
          progress,
          thinking,
          firstCommand,
          failedTool,
          secondCommand,
          followUp,
          lastCommand,
          approval,
          input,
          reply,
        ],
        false,
      ),
    ).toEqual([
      { type: "message", message: prompt },
      {
        type: "activity",
        activity: {
          id: "progress",
          entries: [
            { type: "commentary", message: progress },
            { type: "commands", id: firstCommand.id, commands: [firstCommand, secondCommand] },
            { type: "commentary", message: followUp },
            { type: "commands", id: lastCommand.id, commands: [lastCommand] },
          ],
          durationMs: 365_000,
          isRunning: false,
        },
      },
      { type: "message", message: approval },
      { type: "message", message: input },
      { type: "message", message: reply },
    ]);
  });

  it("keeps a command-only turn expandable and a command approval directly visible", () => {
    const command = message("command", "tool", {
      turnId: "turn",
      kind: "commandExecution",
      content: "git status",
    });
    const approval = message("approval", "tool", {
      turnId: "turn",
      kind: "commandExecution",
      details: { approvalId: "pending" },
    });
    expect(buildTimelineRows([command, approval], true)).toEqual([
      {
        type: "activity",
        activity: {
          id: command.id,
          entries: [{ type: "commands", id: command.id, commands: [command] }],
          isRunning: true,
        },
      },
      { type: "message", message: approval },
    ]);
  });

  it("keeps legacy and async replies and turn errors visible without routine tool activity", () => {
    const prompt = message("old-prompt", "user");
    const oldTool = message("old-tool", "status", {
      kind: "unknown",
      details: { type: "dynamicToolCall" },
    });
    const legacyReply = message("legacy-reply", "assistant");
    const nextPrompt = message("new-prompt", "user", { turnId: "next" });
    const tool = message("new-tool", "tool", { turnId: "next" });
    const asyncReply = message("async", "assistant", {
      turnId: "background",
      details: { phase: "commentary", delivery: "async" },
    });
    const error = message("error", "error", { turnId: "next" });
    const rows = buildTimelineRows(
      [prompt, oldTool, legacyReply, nextPrompt, tool, asyncReply, error],
      true,
    );

    expect(rows).toEqual([
      { type: "message", message: prompt },
      { type: "message", message: legacyReply },
      { type: "message", message: nextPrompt },
      { type: "message", message: asyncReply },
      { type: "message", message: error },
    ]);
  });
});
