import { describe, expect, it, vi } from "vitest";
import { createMMKV } from "react-native-mmkv";

import {
  completeSecurePairing,
  createSecurePairingAttempt,
  decryptResponsePayload,
} from "../../../apps/mobile/src/lib/secure-transport.js";
import {
  createSecurePairing,
  createServerIdentity,
  encryptForMobile,
} from "../src/secure-transport.js";

vi.mock("react-native-get-random-values", () => ({}));

const invalidPayload = "服务器返回了无效的加密数据。";

function pair() {
  const serverIdentity = createServerIdentity();
  const serverUrl = "https://relay.example.test";
  const attempt = createSecurePairingAttempt({
    serverPublicKey: serverIdentity.publicKey,
    serverUrl,
  });
  const { response, session } = createSecurePairing({
    approvalCode: "",
    clientEphemeralPublicKey: attempt.clientEphemeralPublicKey,
    clientNonce: attempt.clientNonce,
    clientToken: "test-token",
    clientTokenExpiresAt: "2030-01-01T00:00:00.000Z",
    keyEpoch: 1,
    serverIdentity,
    serverUrl,
  });
  completeSecurePairing(attempt, { secure: response });
  return (payload: string) => encryptForMobile(session, JSON.stringify(payload));
}

describe("mobile secure Relay responses", () => {
  it("accepts late responses within the receive window once", () => {
    const send = pair();
    const delayed = send("delayed stream event");
    const current = send("quick HTTP response");

    expect(decryptResponsePayload(current)).toBe("quick HTTP response");
    expect(decryptResponsePayload(delayed)).toBe("delayed stream event");
    expect(() => decryptResponsePayload(delayed)).toThrow(invalidPayload);
    expect(() => decryptResponsePayload(current)).toThrow(invalidPayload);
  });

  it("rejects responses from before the receive window", () => {
    const send = pair();
    const tooOld = send("too old");
    const lastInWindow = send("last in window");
    let latest = lastInWindow;
    for (let i = 0; i < 1023; i++) {
      latest = send("latest");
    }

    expect(decryptResponsePayload(latest)).toBe("latest");
    expect(decryptResponsePayload(lastInWindow)).toBe("last in window");
    expect(() => decryptResponsePayload(tooOld)).toThrow(invalidPayload);
  });

  it("does not trust the counter of an unauthenticated response", () => {
    const send = pair();
    const late = send("late");
    const latest = send("latest");

    expect(() => decryptResponsePayload({ ...late, counter: 10_000 })).toThrow(/invalid tag/i);
    expect(() => decryptResponsePayload({ ...latest, keyEpoch: 2 })).toThrow(invalidPayload);
    expect(() => decryptResponsePayload({ ...latest, sender: "mobile" })).toThrow(invalidPayload);
    expect(decryptResponsePayload(latest)).toBe("latest");
    expect(decryptResponsePayload(late)).toBe("late");
  });

  it("continues an old pairing without reopening its previously rejected counters", () => {
    const send = pair();
    const old = send("old");
    const lastBeforeUpgrade = send("before upgrade");
    const firstAfterUpgrade = send("after upgrade");
    const latest = send("latest");
    const storage = createMMKV({ id: "codex-relay-secure" });
    storage.remove("server-receive-window");
    storage.set("last-server-counter", lastBeforeUpgrade.counter);

    expect(decryptResponsePayload(latest)).toBe("latest");
    expect(decryptResponsePayload(firstAfterUpgrade)).toBe("after upgrade");
    expect(() => decryptResponsePayload(old)).toThrow(invalidPayload);
    expect(() => decryptResponsePayload(lastBeforeUpgrade)).toThrow(invalidPayload);
  });
});
