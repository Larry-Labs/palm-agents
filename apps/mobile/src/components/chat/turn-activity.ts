import type { ChatMessage } from "codex-relay/api-schema";

export type TurnActivity = {
  id: string;
  entries: TurnActivityEntry[];
  durationMs?: number;
  isRunning: boolean;
};

type TurnActivityEntry =
  | { type: "commentary"; message: ChatMessage }
  | { type: "commands"; id: string; commands: ChatMessage[] };

export type TimelineRow =
  | { type: "message"; message: ChatMessage }
  | { type: "activity"; activity: TurnActivity };

export function buildTimelineRows(messages: ChatMessage[], isRunning: boolean): TimelineRow[] {
  const rows: TimelineRow[] = [];
  const activities = new Map<string, TurnActivity>();
  let turnKey = "history";

  for (const message of messages) {
    if (message.details?.delivery === "async") {
      rows.push({ type: "message", message });
      continue;
    }
    if (message.turnId && message.turnId !== "turn-live") {
      turnKey = `turn:${message.turnId}`;
    } else if (message.role === "user") {
      turnKey = `prompt:${message.id}`;
    }

    const commentary =
      message.role === "assistant" &&
      message.kind === "chat" &&
      message.details?.phase === "commentary";
    const routineActivity = isRoutineActivity(message);
    const hasCommentary =
      commentary && Boolean(message.content.trim() || message.details?.attachments);
    const hasCommand =
      routineActivity && message.kind === "commandExecution" && Boolean(commandText(message));
    const duration = message.details?.turnDurationMs;
    const hasDuration = typeof duration === "number" && Number.isFinite(duration) && duration >= 0;

    if (hasCommentary || hasCommand || hasDuration) {
      let activity = activities.get(turnKey);
      if (!activity) {
        activity = { id: message.id, entries: [], isRunning: false };
        activities.set(turnKey, activity);
        rows.push({ type: "activity", activity });
      }
      if (hasCommentary) {
        activity.entries.push({ type: "commentary", message });
      } else if (hasCommand) {
        const previous = activity.entries.at(-1);
        if (previous?.type === "commands") {
          previous.commands.push(message);
        } else {
          activity.entries.push({ type: "commands", id: message.id, commands: [message] });
        }
      }
      if (hasDuration) {
        activity.durationMs = duration;
      }
    }
    if (!commentary && !routineActivity) {
      rows.push({ type: "message", message });
    }
  }

  const activeActivity = activities.get(turnKey);
  if (activeActivity && activeActivity.durationMs === undefined) {
    activeActivity.isRunning = isRunning;
  }
  return rows;
}

export function commandText(message: ChatMessage) {
  const command = message.details?.command;
  return (typeof command === "string" && command.trim() ? command : message.content).trim();
}

function isRoutineActivity(message: ChatMessage) {
  if (
    message.role === "error" ||
    message.kind === "plan" ||
    message.kind === "approvalRequest" ||
    message.kind === "structuredUserInput" ||
    message.details?.approvalId
  ) {
    return false;
  }
  return (
    message.role === "reasoning" ||
    message.role === "tool" ||
    message.kind === "thinking" ||
    message.kind === "toolActivity" ||
    message.kind === "commandExecution" ||
    message.kind === "fileChange" ||
    message.kind === "webSearch" ||
    message.kind === "subagentAction" ||
    (message.kind === "unknown" && message.details?.type === "dynamicToolCall")
  );
}
