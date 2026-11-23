import { t } from "../../i18n";
import type { CodexModel, ReasoningEffort } from "codex-relay/api-schema";

import { SheetActionRow, SheetSelectedDot } from "@/components/ui/bottom-sheet";

import { AdvancedSummaryRow } from "./AdvancedSummaryRow";
import {
  reasoningDisplayOptions,
  reasoningEffortForModel,
  reasoningTitle,
  shortModelLabel,
  speedDisplayOptions,
} from "./model-picker-options";

export type AdvancedSection = "effort" | "model" | "speed";

export function AdvancedModelOptions({
  activeSection,
  activeModel,
  models,
  onModelSelect,
  onReasoningSelect,
  onSectionChange,
  onServiceTierChange,
  selectedModel,
  selectedReasoningEffort,
  selectedServiceTier,
}: {
  activeSection: AdvancedSection | undefined;
  activeModel: CodexModel | undefined;
  models: CodexModel[];
  onModelSelect: (model: string, reasoningEffort?: ReasoningEffort) => void;
  onReasoningSelect: (reasoningEffort: ReasoningEffort) => void;
  onSectionChange: (section: AdvancedSection | undefined) => void;
  onServiceTierChange: (serviceTier: string | undefined) => void;
  selectedModel: string | undefined;
  selectedReasoningEffort: ReasoningEffort | undefined;
  selectedServiceTier: string | undefined;
}) {
  const reasoningOptions = reasoningDisplayOptions(
    activeModel,
    Boolean(selectedModel && !activeModel),
  );
  const speedOptions = speedDisplayOptions(activeModel, selectedServiceTier);
  const speedLabel =
    speedOptions.find((option) => option.value === selectedServiceTier)?.label ?? t("Standard");

  function toggleSection(section: AdvancedSection) {
    onSectionChange(activeSection === section ? undefined : section);
  }

  return (
    <>
      <AdvancedSummaryRow
        expanded={activeSection === "model"}
        label={t("Model")}
        onPress={() => toggleSection("model")}
        value={shortModelLabel(activeModel, selectedModel)}
      />
      {activeSection === "model"
        ? models.map((model) => {
            const selected = model.model === activeModel?.model;
            return (
              <SheetActionRow
                key={model.model}
                accessibilityLabel={t("Model {0}", model.displayName)}
                icon="model"
                onPress={() =>
                  onModelSelect(
                    model.model,
                    reasoningEffortForModel(model, selectedReasoningEffort),
                  )
                }
                selected={selected}
                subtitle={model.description ?? model.model}
                subtitleNumberOfLines={2}
                title={model.displayName}
                trailing={<SheetSelectedDot selected={selected} />}
              />
            );
          })
        : null}

      <AdvancedSummaryRow
        expanded={activeSection === "effort"}
        label={t("Effort")}
        onPress={() => toggleSection("effort")}
        value={selectedReasoningEffort ? reasoningTitle(selectedReasoningEffort) : t("Default")}
      />
      {activeSection === "effort" && reasoningOptions.length > 0 ? (
        <>
          {reasoningOptions.map((option) => {
            const selected = option.value === selectedReasoningEffort;
            return (
              <SheetActionRow
                key={option.value}
                accessibilityLabel={t("Effort {0}", option.label)}
                icon="controls"
                onPress={() => onReasoningSelect(option.value)}
                selected={selected}
                subtitle={option.subtitle}
                subtitleNumberOfLines={2}
                title={option.label}
                trailing={<SheetSelectedDot selected={selected} />}
              />
            );
          })}
        </>
      ) : null}

      <AdvancedSummaryRow
        expanded={activeSection === "speed"}
        label={t("Speed")}
        onPress={() => toggleSection("speed")}
        value={speedLabel}
      />
      {activeSection === "speed"
        ? speedOptions.map((option) => {
            const selected = option.value === selectedServiceTier;
            return (
              <SheetActionRow
                key={option.value ?? "standard"}
                accessibilityLabel={t("Speed {0}", option.label)}
                icon={option.value ? "fast" : "controls"}
                iconBackgroundColor={option.value ? "rgba(255, 214, 102, 0.11)" : undefined}
                iconTintColor={option.value ? "rgba(255, 214, 102, 0.88)" : undefined}
                onPress={() => onServiceTierChange(option.value)}
                selected={selected}
                selectedTitleColor={option.value ? "rgba(255, 214, 102, 0.95)" : undefined}
                subtitle={option.subtitle}
                subtitleNumberOfLines={2}
                title={option.label}
                trailing={<SheetSelectedDot selected={selected} />}
              />
            );
          })
        : null}
    </>
  );
}
