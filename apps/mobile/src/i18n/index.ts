import { zhCN } from "./zh-CN";

export type MessageKey = keyof typeof zhCN;

// Only app-owned UI messages pass through here; conversation content stays intact.
export function t(key: MessageKey, ...values: (string | number | undefined)[]): string {
  return zhCN[key].replace(/\{(\d+)\}/g, (match, index: string) => {
    const value = values[Number(index)];
    return Number(index) >= values.length ? match : String(value ?? "");
  });
}
