import { describe, expect, it } from "vitest";

import { parseRelayAddress } from "./relay-address";

describe("parseRelayAddress", () => {
  it.each([
    [" 192.168.1.10:8787 ", "http://192.168.1.10:8787"],
    ["[fd00::123]:8787", "http://[fd00::123]:8787"],
    ["relay.local:8787", "http://relay.local:8787"],
    ["relay.example.com", "https://relay.example.com"],
    ["relay.example.com:8443", "https://relay.example.com:8443"],
    ["http://relay.example.com:8787/", "http://relay.example.com:8787"],
  ])("normalizes %s", (input, expected) => {
    expect(parseRelayAddress(input)).toBe(expected);
  });

  it.each([
    "",
    "https://username:password@relay.example.com",
    "https://relay.example.com/path",
    "https://relay.example.com/?q=1",
    "https://relay.example.com/#fragment",
    "ftp://relay.example.com",
    "http:///relay.example.com",
    "relay.example.com:99999",
    "relay.example.com:0",
  ])("rejects %s", (input) => {
    expect(parseRelayAddress(input)).toBeUndefined();
  });
});
