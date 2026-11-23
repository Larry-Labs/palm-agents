export function parseRelayAddress(input: string): string | undefined {
  const address = input.trim();
  if (!address || /[\s\\@?#]/.test(address)) {
    return undefined;
  }

  const explicitScheme = /^https?:\/\//i.test(address);
  const hostAndPort = address.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  if (!hostAndPort || hostAndPort.includes("/")) {
    return undefined;
  }

  const isIpOrLocalHost =
    /^(?:\[[\da-f:.]+\]|(?:\d{1,3}\.){3}\d{1,3}|localhost|[\w.-]+\.local)(?::\d+)?$/i.test(
      hostAndPort,
    );
  const url = explicitScheme ? address : `${isIpOrLocalHost ? "http" : "https"}://${address}`;
  try {
    const parsed = new URL(url);
    return parsed.port === "0" ? undefined : parsed.origin;
  } catch {
    return undefined;
  }
}
