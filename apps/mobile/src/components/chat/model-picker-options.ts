import { t } from "../../i18n";
import type { CodexModel, ReasoningEffort, RuntimePreferences } from "codex-relay/api-schema";

export type ModelPickerOption<Value extends string = string> = {
  label: string;
  subtitle?: string;
  value: Value;
};

export type PowerSelection = {
  id: string;
  model: string;
  modelLabel: string;
  powerSettingIndex: number;
  reasoningEffort: ReasoningEffort;
};

export type SpeedDisplayOption = Omit<ModelPickerOption, "value"> & {
  subtitle: string;
  value: string | undefined;
};

export function modelPickerSheetPresentation(showAdvanced: boolean, hasCompactPower = false) {
  return showAdvanced
    ? {
        enableDynamicSizing: true,
        expandedSnapPercent: 94,
        initialSnapIndex: 0,
        scrollable: true,
        showBackButton: hasCompactPower,
      }
    : {
        enableDynamicSizing: true,
        expandedSnapPercent: undefined,
        initialSnapIndex: 0,
        scrollable: false,
        showBackButton: false,
      };
}

const genericReasoningEfforts: ReasoningEffort[] = [
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];
const knownReasoningEfforts = new Set<ReasoningEffort>([...genericReasoningEfforts, "ultra"]);
const reasoningSubtitles = new Map<ReasoningEffort, string>([
  ["minimal", t("Minimal reasoning for the fastest replies")],
  ["low", t("Fast replies with light reasoning")],
  ["medium", t("Balanced reasoning for everyday work")],
  ["high", t("Deeper reasoning for complex work")],
  ["xhigh", t("Extra reasoning for difficult problems")],
  ["max", t("Maximum reasoning depth for the hardest problems")],
  ["ultra", t("Maximum reasoning with automatic task delegation")],
]);

export function powerSelectionsForModels(models: CodexModel[]) {
  const model =
    models.find((candidate) => candidate.isDefault && hasCompactPower(candidate)) ??
    models.find(hasCompactPower);
  if (!model) {
    return [];
  }

  return model.supportedReasoningEfforts.map((reasoningEffort, powerSettingIndex) => ({
    id: `${model.model}:${reasoningEffort}`,
    model: model.model,
    modelLabel: model.displayName,
    powerSettingIndex,
    reasoningEffort,
  }));
}

export function selectedPowerSelection(
  selections: PowerSelection[],
  model: string | undefined,
  reasoningEffort: ReasoningEffort | undefined,
) {
  return selections.find(
    (selection) => selection.model === model && selection.reasoningEffort === reasoningEffort,
  );
}

export function defaultPowerSelection(selections: PowerSelection[]) {
  return selections.find((selection) => selection.reasoningEffort === "medium") ?? selections[0];
}

export function powerSelectionLabel(selection: PowerSelection) {
  return reasoningTitle(selection.reasoningEffort);
}

export function powerSelectionAccessibilityLabel(selection: PowerSelection) {
  return `${selection.modelLabel} ${powerSelectionLabel(selection)}`;
}

export function modelButtonLabel(
  model: CodexModel | undefined,
  reasoningEffort: ReasoningEffort | undefined,
  fallbackModelLabel?: string,
) {
  const modelLabel = model?.displayName ?? fallbackModelLabel ?? t("No models");
  return modelLabel !== t("No models") && reasoningEffort
    ? `${modelLabel} ${reasoningTitle(reasoningEffort)}`
    : modelLabel;
}

export function modelForSelection(models: CodexModel[], selectedModel: string | undefined) {
  if (selectedModel) {
    return models.find((model) => model.model === selectedModel);
  }
  return models.find((model) => model.isDefault) ?? models[0];
}

export function normalizeRuntimePreferencesForModels(
  models: CodexModel[],
  preferences: RuntimePreferences,
) {
  const model = modelForSelection(models, preferences.model);
  if (!model) {
    return preferences;
  }
  return {
    ...preferences,
    model: model.model,
    reasoningEffort:
      preferences.reasoningEffort && !knownReasoningEfforts.has(preferences.reasoningEffort)
        ? preferences.reasoningEffort
        : reasoningEffortForModel(model, preferences.reasoningEffort),
  };
}

export function fastServiceTierForModel(model: CodexModel | undefined) {
  return model?.serviceTiers.find((tier) => {
    const label = `${tier.id} ${tier.name}`.toLowerCase();
    return label.includes("fast") || label.includes("priority");
  });
}

export function reasoningEffortForModel(
  model: CodexModel | undefined,
  selectedReasoningEffort: ReasoningEffort | undefined,
) {
  const supported = model?.supportedReasoningEfforts ?? [];
  if (supported.length === 0) {
    return undefined;
  }
  if (selectedReasoningEffort && supported.includes(selectedReasoningEffort)) {
    return selectedReasoningEffort;
  }
  if (model?.defaultReasoningEffort && supported.includes(model.defaultReasoningEffort)) {
    return model.defaultReasoningEffort;
  }
  return supported.includes("medium") ? "medium" : supported[0];
}

export function reasoningDisplayOptions(
  model: CodexModel | undefined,
  useGenericFallback = false,
): ModelPickerOption<ReasoningEffort>[] {
  const efforts =
    model?.supportedReasoningEfforts ?? (useGenericFallback ? genericReasoningEfforts : []);
  return efforts.map((effort) => ({
    label: reasoningTitle(effort),
    subtitle:
      effort === "ultra"
        ? t("Consumes usage limits faster")
        : (model?.reasoningEffortOptions.find((option) => option.reasoningEffort === effort)
            ?.description ?? reasoningSubtitle(effort)),
    value: effort,
  }));
}

export function speedDisplayOptions(
  model: CodexModel | undefined,
  selectedServiceTier?: string,
): SpeedDisplayOption[] {
  const fastServiceTier = fastServiceTierForModel(model);
  const options: SpeedDisplayOption[] = [
    {
      label: t("Standard"),
      subtitle: t("Standard speed and usage"),
      value: undefined,
    },
  ];
  if (fastServiceTier) {
    options.push({
      label: t("Fast"),
      subtitle: fastServiceTier.description?.trim() || t("1.5x speed, more usage"),
      value: fastServiceTier.id,
    });
  }
  if (selectedServiceTier && !options.some((option) => option.value === selectedServiceTier)) {
    options.push({
      label: t("Custom"),
      subtitle: t("Service tier: {0}", selectedServiceTier),
      value: selectedServiceTier,
    });
  }
  return options;
}

export function shortModelLabel(model: CodexModel | undefined, fallback?: string) {
  return (model?.displayName ?? fallback ?? t("Default"))
    .replace(/^GPT-/u, "")
    .replace(/-(?=[A-Z])/gu, " ");
}

export function reasoningTitle(effort: ReasoningEffort) {
  const labels: Partial<Record<ReasoningEffort, string>> = {
    minimal: "极低",
    low: "低",
    medium: "中",
    high: "高",
    xhigh: "超高",
    max: "最高",
    ultra: "极致",
  };
  const localizedLabel = Object.hasOwn(labels, effort) ? labels[effort] : undefined;
  if (localizedLabel) {
    return localizedLabel;
  }
  const title = effort
    .replace(/^x[-_\s]*(?=high(?:[-_\s]|$))/u, "extra-")
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
  return title || effort;
}

function reasoningSubtitle(effort: ReasoningEffort) {
  return reasoningSubtitles.get(effort) ?? t("Use {0} reasoning", reasoningTitle(effort));
}

function hasCompactPower(model: CodexModel) {
  return model.supportedReasoningEfforts.length >= 4;
}
