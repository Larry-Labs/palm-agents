import { describe, expect, it } from "vitest";

import { previewModels } from "./chat-preview-models";
import { normalizeRuntimePreferencesForModels, reasoningTitle } from "./model-picker-options";

const model = {
  ...previewModels[0],
  model: "limited-model",
  supportedReasoningEfforts: ["low", "medium"] as const,
  defaultReasoningEffort: "medium" as const,
};
const models = [{ ...model, supportedReasoningEfforts: [...model.supportedReasoningEfforts] }];

describe("model preference normalization", () => {
  it("replaces an unsupported saved effort after switching models", () => {
    expect(
      normalizeRuntimePreferencesForModels(models, {
        model: model.model,
        reasoningEffort: "max",
        runtimeMode: "default",
      }),
    ).toMatchObject({ model: model.model, reasoningEffort: "medium" });
  });

  it("preserves an effort supported by the selected model", () => {
    expect(
      normalizeRuntimePreferencesForModels(models, {
        model: model.model,
        reasoningEffort: "low",
        runtimeMode: "default",
      }).reasoningEffort,
    ).toBe("low");
  });

  it("clears saved effort for models without reasoning support", () => {
    expect(
      normalizeRuntimePreferencesForModels(
        [{ ...models[0], supportedReasoningEfforts: [], defaultReasoningEffort: undefined }],
        { reasoningEffort: "max", runtimeMode: "default" },
      ).reasoningEffort,
    ).toBeUndefined();
  });

  it("keeps protocol effort values separate from Chinese display labels", () => {
    expect(reasoningTitle("high")).toBe("高");
    expect(
      normalizeRuntimePreferencesForModels(models, {
        reasoningEffort: "low",
        runtimeMode: "default",
      }).reasoningEffort,
    ).toBe("low");
  });
});
