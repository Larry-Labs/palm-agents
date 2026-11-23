import { useTheme } from "@/hooks/use-theme";
import { t } from "../../i18n";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ThemedText } from "@/components/themed-text";
import { Icon } from "@/components/ui/icon";
import { Fonts } from "@/constants/theme";
import { hapticSelection } from "@/lib/haptics";

const copiedIndicatorDurationMs = 1400;

export function CopyableCommand({
  command,
  copyAccessibilityLabel = t("Copy command"),
  style,
  textStyle,
}: {
  command: string;
  copyAccessibilityLabel?: string;
  style?: ViewProps["style"];
  textStyle?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  const [isCopied, setCopied] = useState(false);
  const handleCopyPress = useCallback(() => {
    hapticSelection();
    setCopied(true);
    Clipboard.setStringAsync(command).catch((error: unknown) => {
      setCopied(false);
      Alert.alert(t("Copy failed"), copyFailureMessage(error));
    });
  }, [command]);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), copiedIndicatorDurationMs);
    return () => clearTimeout(timer);
  }, [isCopied]);

  return (
    <View style={[styles.container, style]}>
      <ThemedText selectable type="code" style={[styles.commandText, textStyle]}>
        {command}
      </ThemedText>
      <Pressable
        accessibilityHint={t("Copies this command to the clipboard")}
        accessibilityLabel={isCopied ? t("Command copied") : copyAccessibilityLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleCopyPress}
        style={({ pressed }) => [
          styles.copyButton,
          isCopied && styles.copyButtonCopied,
          pressed && styles.pressed,
        ]}
      >
        <Icon
          name={isCopied ? "check" : "copy"}
          size={12}
          strokeWidth={2.2}
          tintColor={theme.text}
        />
        <ThemedText type="smallBold" style={styles.copyButtonText}>
          {isCopied ? t("Copied") : t("Copy")}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function copyFailureMessage(error: unknown) {
  return error instanceof Error ? error.message : t("The command could not be copied.");
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.24)",
    borderColor: theme.border,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
    paddingBottom: 5,
    paddingLeft: 9,
    paddingRight: 5,
    paddingTop: 5,
  },
  commandText: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 16,
    minWidth: 0,
  },
  copyButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: theme.subtle,
    borderColor: theme.border,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 30,
    minWidth: 68,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  copyButtonCopied: {
    backgroundColor: "rgba(86, 196, 134, 0.16)",
    borderColor: "rgba(86, 196, 134, 0.3)",
  },
  copyButtonText: {
    color: theme.text,
    fontSize: 11,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.7,
  },
}));
