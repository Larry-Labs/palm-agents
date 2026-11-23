import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCodexRelayServerUrlState,
  clearManualCodexRelayAddresses,
  fallbackCodexRelayServerUrl,
  getCodexRelayServerUrl,
  getCodexRelayServerUrlCandidates,
  saveCodexRelayServerUrlCandidates,
  saveManualCodexRelayAddress,
  setCodexRelayServerUrl,
} from "../../../apps/mobile/src/lib/codex-relay-server-url-storage.js";
import { requestWithNetworkTimeout } from "../../../apps/mobile/src/lib/network-timeout.js";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  clearCodexRelayServerUrlState();
});

describe("mobile Codex Relay API session storage", () => {
  it("clears the selected server URL, discovered candidates and manual addresses", () => {
    setCodexRelayServerUrl("http://100.103.76.81:8787");
    saveCodexRelayServerUrlCandidates([
      "http://100.103.76.81:8787",
      "http://gronxb-macmini.taild999d7.ts.net:8787",
    ]);
    saveManualCodexRelayAddress("https://relay.example.com");

    clearCodexRelayServerUrlState();

    expect(getCodexRelayServerUrl()).toBe(fallbackCodexRelayServerUrl);
    expect(getCodexRelayServerUrlCandidates()).toEqual([
      {
        label: "本机",
        manual: false,
        url: fallbackCodexRelayServerUrl,
      },
    ]);
  });

  it("keeps saved manual addresses distinct and removes duplicates", () => {
    setCodexRelayServerUrl("http://192.168.1.10:8787");
    saveCodexRelayServerUrlCandidates([
      "https://first.example.com",
      "https://discovered.example.com",
    ]);
    saveManualCodexRelayAddress("https://first.example.com");
    saveManualCodexRelayAddress("https://second.example.com");

    expect(getCodexRelayServerUrlCandidates().map(({ url, manual }) => [url, manual])).toEqual([
      ["http://192.168.1.10:8787", false],
      ["https://second.example.com", true],
      ["https://first.example.com", true],
      ["https://discovered.example.com", false],
    ]);

    clearManualCodexRelayAddresses();
    expect(getCodexRelayServerUrlCandidates().some(({ manual }) => manual)).toBe(false);
  });

  it("keeps the old current address when adding and replaces only the edited address", () => {
    const lanUrl = "http://192.168.1.10:8787";
    const proxyUrl = "https://relay.example.com";
    const editedUrl = "https://relay2.example.com";
    setCodexRelayServerUrl(lanUrl);

    saveManualCodexRelayAddress(proxyUrl);
    setCodexRelayServerUrl(proxyUrl);
    expect(getCodexRelayServerUrlCandidates().map(({ url }) => url)).toEqual([proxyUrl, lanUrl]);

    saveManualCodexRelayAddress(editedUrl, proxyUrl);
    setCodexRelayServerUrl(editedUrl);
    expect(getCodexRelayServerUrlCandidates().map(({ url }) => url)).toEqual([editedUrl, lanUrl]);
  });

  it("rejects bootstrap requests when the network hangs", async () => {
    vi.useFakeTimers();

    const request = requestWithNetworkTimeout(
      new Promise<Response>(() => undefined),
      undefined,
      25,
    );
    const caught = request.catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(25);

    await expect(caught).resolves.toMatchObject({ message: "请求超时。" });
  });
});
