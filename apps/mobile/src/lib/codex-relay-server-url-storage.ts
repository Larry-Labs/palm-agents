import { t } from "../i18n";
import { createMMKV } from "react-native-mmkv";

const defaultServerUrl = "http://localhost:8787";
const manualServerUrlsStorageKey = "codex-relay.manual-server-urls";
const serverUrlCandidatesStorageKey = "codex-relay.server-url-candidates";
const serverUrlStorageKey = "codex-relay.server-url";

export const codexRelayStorage = createMMKV({ id: "codex-relay" });

export type CodexRelayServerUrlCandidate = {
  label: string;
  url: string;
  manual: boolean;
};

export const fallbackCodexRelayServerUrl =
  process.env.EXPO_PUBLIC_CODEX_RELAY_SERVER_URL?.replace(/\/$/, "") ?? defaultServerUrl;

export function getCodexRelayServerUrl() {
  return codexRelayStorage.getString(serverUrlStorageKey) ?? fallbackCodexRelayServerUrl;
}

export function getCodexRelayServerUrlCandidates(): CodexRelayServerUrlCandidate[] {
  const manual = new Set(readStoredUrls(manualServerUrlsStorageKey));
  return dedupeServerUrls([
    getCodexRelayServerUrl(),
    ...manual,
    ...readStoredUrls(serverUrlCandidatesStorageKey),
  ]).map((url) => ({
    label: manual.has(url) ? t("Custom address") : serverUrlCandidateLabel(url),
    url,
    manual: manual.has(url),
  }));
}

export function setCodexRelayServerUrl(url: string) {
  const normalizedUrl = normalizeServerUrl(url);
  codexRelayStorage.set(serverUrlStorageKey, normalizedUrl);
  return normalizedUrl;
}

export function clearCodexRelayServerUrlState() {
  codexRelayStorage.remove(serverUrlStorageKey);
  codexRelayStorage.remove(serverUrlCandidatesStorageKey);
  clearManualCodexRelayAddresses();
}

export function clearManualCodexRelayAddresses() {
  codexRelayStorage.remove(manualServerUrlsStorageKey);
}

export function saveCodexRelayServerUrlCandidates(urls: string[]) {
  codexRelayStorage.set(serverUrlCandidatesStorageKey, JSON.stringify(dedupeServerUrls(urls)));
}

export function saveManualCodexRelayAddress(url: string, replaces?: string) {
  const previous = readStoredUrls(manualServerUrlsStorageKey);
  const urls = [url, ...previous.filter((candidate) => candidate !== replaces)];
  const discovered = readStoredUrls(serverUrlCandidatesStorageKey);
  const currentUrl = getCodexRelayServerUrl();
  saveCodexRelayServerUrlCandidates(
    [currentUrl, ...discovered].filter((candidate) => candidate !== replaces),
  );
  codexRelayStorage.set(manualServerUrlsStorageKey, JSON.stringify(dedupeServerUrls(urls)));
}

export function normalizeServerUrl(url: string) {
  const trimmed = url.trim().replace(/\/$/, "");
  if (!trimmed) {
    throw new Error(t("Server URL is empty."));
  }

  const parsed = new URL(trimmed);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(t("Server URL must start with http:// or https://."));
  }

  return parsed.toString().replace(/\/$/, "");
}

export function dedupeServerUrls(urls: string[]) {
  const deduped = new Set<string>();
  for (const url of urls) {
    try {
      deduped.add(normalizeServerUrl(url));
    } catch {
      continue;
    }
  }
  return [...deduped];
}

export function isPrivateIPv4Host(host: string) {
  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }
  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 169 && octets[1] === 254)
  );
}

export function isCarrierGradePrivateIPv4Host(host: string) {
  const octets = host.split(".").map(Number);
  return octets.length === 4 && octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127;
}

export function isLocalIPv6Host(host: string) {
  const normalized = host.replace(/^\[/, "").replace(/\]$/, "");
  return (
    normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")
  );
}

function readStoredUrls(key: string) {
  const stored = codexRelayStorage.getString(key);
  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((url): url is string => typeof url === "string")
      : [];
  } catch {
    return [];
  }
}

function serverUrlCandidateLabel(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return t("Localhost");
    }
    if (host.endsWith(".local")) {
      return t("Local network");
    }
    if (host.endsWith(".ts.net") || host.endsWith(".beta.tailscale.net")) {
      return t("Tailscale DNS");
    }
    if (isCarrierGradePrivateIPv4Host(host)) {
      return t("Tailscale IP");
    }
    if (isPrivateIPv4Host(host) || isLocalIPv6Host(host)) {
      return t("LAN IP");
    }
    return t("Server");
  } catch {
    return t("Server");
  }
}
