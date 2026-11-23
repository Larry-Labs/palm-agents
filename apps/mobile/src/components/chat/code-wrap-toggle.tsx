import { Pressable, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { hapticSelection } from "@/lib/haptics";

import { t } from "../../i18n";

export function CodeWrapToggle({ wrapped, onToggle }: { wrapped: boolean; onToggle: () => void }) {
  const label = wrapped ? t("Disable line wrap") : t("Wrap lines");

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={5}
      onPress={() => {
        hapticSelection();
        onToggle();
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 8,
  },
  label: {
    color: theme.textSecondaryStrong,
    fontSize: 12,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.7,
  },
}));
