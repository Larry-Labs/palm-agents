import { randomBytes, timingSafeEqual } from "node:crypto";
import { describe, expect, it } from "vitest";

import { apiPaths, relayAddressProof } from "../src/api-schema.js";
import { createApp } from "../src/app.js";
import { createTursoPairingSessionStore } from "../src/pairing-store.js";
import { createServerIdentity } from "../src/secure-transport.js";

const origin = "https://relay.example.com";

async function fixture() {
  const clientSessionId = "paired-phone";
  const session = {
    keyEpoch: 1,
    mobileToServerKey: randomBytes(32),
    serverToMobileKey: randomBytes(32),
    lastMobileCounter: 7,
    nextServerCounter: 10,
  };
  const sessions = await createTursoPairingSessionStore(":memory:");
  await sessions.createSession("test-token", { clientSessionId, secureSession: session });
  const app = createApp({
    pairing: {
      createClientToken: () => "unused",
      hashClientToken: (token) => token,
      serverIdentity: createServerIdentity(),
      sessions,
    },
  });

  const challenge = randomBytes(32).toString("hex");
  const proof = relayAddressProof(
    session.mobileToServerKey,
    "mobile",
    clientSessionId,
    origin,
    challenge,
  );
  const body = { clientSessionId, challenge, proof };
  function verify(
    requestBody = body,
    forwardedHost = "relay.example.com",
    forwardedProto = "https",
  ) {
    return app.request(`http://127.0.0.1:8787${apiPaths.relayAddressVerify}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-host": forwardedHost,
        "x-forwarded-proto": forwardedProto,
      },
      body: JSON.stringify(requestBody),
    });
  }

  return { app, body, session, sessions, verify };
}

describe("relay address verification", () => {
  it("proves a new proxy origin with the existing pairing, without rotating the session", async () => {
    const { app, body, session, sessions, verify } = await fixture();
    const response = await verify();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      proof: relayAddressProof(
        session.serverToMobileKey,
        "server",
        body.clientSessionId,
        origin,
        body.challenge,
      ),
    });
    expect(await sessions.countActive()).toBe(1);
    const stored = (await sessions.getValidSession("test-token"))?.secureSession;
    expect(stored).toMatchObject({ keyEpoch: 1, lastMobileCounter: 7, nextServerCounter: 10 });
    expect(stored && timingSafeEqual(stored.mobileToServerKey, session.mobileToServerKey)).toBe(
      true,
    );
    expect(stored && timingSafeEqual(stored.serverToMobileKey, session.serverToMobileKey)).toBe(
      true,
    );

    const status = await app.request(apiPaths.status, {
      headers: { authorization: "Bearer test-token" },
    });
    expect(status.status).toBe(200);
    expect(await status.json()).toMatchObject({ sender: "server", counter: 10 });
  });

  it("rejects a wrong relay, a changed challenge, a mismatched origin, and a revoked session", async () => {
    const { body, sessions, verify } = await fixture();
    const wrongRelay = await fixture();

    expect((await wrongRelay.verify(body)).status).toBe(403);
    expect((await verify({ ...body, challenge: randomBytes(32).toString("hex") })).status).toBe(
      403,
    );
    expect((await verify(body, "other.example.com")).status).toBe(403);
    expect((await verify(body, "relay.example.com", "http")).status).toBe(403);
    expect((await verify({ ...body, proof: "short" })).status).toBe(400);
    await sessions.deleteSession("test-token");
    expect((await verify()).status).toBe(403);
  });
});
