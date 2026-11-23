import { t } from "../../i18n";
import { useTheme } from "@/hooks/use-theme";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Icon, type AppIconName } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Fonts } from "@/constants/theme";

import type { RuntimePickerOption } from "./RuntimeModeSheet";

export function ChatControlRail({
  isFastModeEnabled,
  modelDisabled,
  modelLabel,
  onModelPress,
  onRuntimePress,
  runtimeOption,
}: {
  isFastModeEnabled: boolean;
  modelDisabled: boolean;
  modelLabel: string;
  onModelPress: () => void;
  onRuntimePress: () => void;
  runtimeOption: RuntimePickerOption;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.controlRail}>
        <ControlPillButton
          accessibilityLabel={t("Runtime mode {0}", runtimeOption.compactLabel)}
          icon={runtimeOption.icon}
          label={runtimeOption.compactLabel}
          onPress={onRuntimePress}
          style={styles.runtimeButton}
          tintColor={runtimeOption.iconTintColor}
        />
        <ControlPillButton
          accessibilityLabel={t("Model {0}", modelLabel)}
          disabled={modelDisabled}
          icon={isFastModeEnabled ? "fast" : undefined}
          label={modelLabel}
          onPress={onModelPress}
          style={styles.modelButton}
          textAlign="center"
          tintColor={isFastModeEnabled ? "rgba(255, 214, 102, 0.9)" : undefined}
        />
      </View>
    </View>
  );
}

function ControlPillButton({
  accessibilityLabel,
  disabled,
  icon,
  label,
  onPress,
  style,
  textAlign,
  tintColor,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon?: AppIconName;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textAlign?: "center";
  tintColor?: string;
}) {
  const theme = useTheme();
  const resolvedTintColor = tintColor ?? theme.textSecondaryStrong;
  return (
    <Pressable
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.controlTouchTarget, style, disabled ? styles.buttonDisabled : null]}
    >
      {({ pressed }) => (
        <View style={[styles.controlButton, pressed ? styles.pressed : null]}>
          <View style={styles.controlButtonContent}>
            {icon ? (
              <View style={styles.controlButtonIconSlot}>
                <Icon name={icon} size={12} strokeWidth={1.9} tintColor={resolvedTintColor} />
              </View>
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                styles.controlButtonLabel,
                { color: resolvedTintColor },
                textAlign === "center" ? styles.controlButtonLabelCentered : null,
              ]}
            >
              {label}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignSelf: "stretch",
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  controlRail: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    height: 44,
    justifyContent: "flex-start",
    minWidth: 0,
    width: "100%",
  },
  controlTouchTarget: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
  },
  controlButton: {
    alignItems: "center",
    backgroundColor: theme.subtle,
    borderColor: theme.border,
    borderCurve: "continuous",
    borderRadius: 12,
    borderWidth: 1,
    height: 23,
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  runtimeButton: {
    flexShrink: 0,
  },
  modelButton: {
    flexShrink: 1,
    maxWidth: "60%",
    minWidth: 0,
    overflow: "hidden",
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  controlButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    height: 23,
    justifyContent: "center",
    minWidth: 0,
  },
  controlButtonIconSlot: {
    alignItems: "center",
    height: 12,
    justifyContent: "center",
    width: 12,
  },
  controlButtonLabel: {
    flexShrink: 1,
    fontFamily: Fonts.sansSemiBold,
    fontSize: 10.5,
    lineHeight: 13,
    minWidth: 0,
  },
  controlButtonLabelCentered: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.72,
  },
}));
