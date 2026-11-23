import { useTheme } from "@/hooks/use-theme";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ThemedText } from "@/components/themed-text";

import { Icon, type AppIconName } from "./icon";

export type EmptyStateProps = {
  title: string;
  description?: string;
  // Icon for the React Native rendering.
  icon: AppIconName;
  // SF Symbol for the SwiftUI rendering on iOS.
  systemImage: string;
  action?: { label: string; onPress: () => void };
};

// Centered unavailable-content message; iOS renders it with SwiftUI.
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Icon name={icon} size={36} tintColor={theme.textSecondary} />
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      ) : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <ThemedText type="smallBold">{action.label}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: { marginTop: 8, textAlign: "center" },
  description: { textAlign: "center" },
  button: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  pressed: { opacity: 0.7 },
}));
