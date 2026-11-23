import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const appDirectory = fileURLToPath(new URL("../apps/mobile/", import.meta.url));
const publicKey = readFileSync(
  new URL("../apps/mobile/keys/public-key.pem", import.meta.url),
  "utf8",
);

for (const format of ["module", "commonjs"]) {
  for (const configured of [false, true]) {
    test(`Hot Updater ${configured ? "reads the configured signing key" : "stays disabled by default"} through its ${format} entry`, () => {
      const load =
        format === "module"
          ? 'import { getExpoBundleSigningPublicKey } from "@hot-updater/expo";'
          : 'const { getExpoBundleSigningPublicKey } = require("@hot-updater/expo");';
      // A real Node process exercises package exports; a test bundler can hide
      // the Expo 58 resolution failure that otherwise blocks OTA deployment.
      const output = execFileSync(
        process.execPath,
        [
          `--input-type=${format}`,
          "--eval",
          `${load}\ngetExpoBundleSigningPublicKey(process.cwd()).then(value => console.log(JSON.stringify(value)));`,
        ],
        {
          cwd: appDirectory,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            EXPO_PUBLIC_HOT_UPDATER_BASE_URL: configured ? "https://updates.example.invalid" : "",
            HOT_UPDATER_PUBLIC_KEY_PATH: configured ? "./keys/public-key.pem" : "",
          },
        },
      );

      const result = JSON.parse(output);
      if (configured) {
        assert.equal(result.publicKey.trim(), publicKey.trim());
      } else {
        assert.equal(result, null);
      }
    });
  }
}
