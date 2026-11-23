import { useTheme } from "@/hooks/use-theme";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ThemedText } from "@/components/themed-text";
import { Icon, type AppIconName } from "@/components/ui/icon";

import { hapticSelection } from "@/lib/haptics";

export type ChatShellAction = {
  readonly disabled?: boolean;
  readonly icon: AppIconName;
  readonly label: string;
  readonly onPress: () => void;
};

export function ChatShellHeader({
  leadingAction,
  subtitle,
  title,
  trailingActions,
}: {
  leadingAction: ChatShellAction;
  subtitle: string;
  title: string;
  trailingActions: readonly ChatShellAction[];
}) {
  return (
    <View pointerEvents="box-none" style={styles.header}>
      <HeaderButton action={leadingAction} />
      <View pointerEvents="none" style={styles.titleGroup}>
        <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText
          type="code"
          themeColor="textSecondary"
          style={styles.subtitle}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {subtitle}
        </ThemedText>
      </View>
      <View pointerEvents="box-none" style={styles.headerActions}>
        {trailingActions.map((action) => (
          <HeaderButton key={action.label} action={action} />
        ))}
      </View>
    </View>
  );
}

function HeaderButton({ action }: { action: ChatShellAction }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={action.label}
      accessibilityRole="button"
      disabled={action.disabled}
      hitSlop={8}
      onPress={action.onPress}
      onPressIn={action.disabled ? undefined : hapticSelection}
      pressRetentionOffset={12}
      style={({ pressed }) => [
        styles.headerButton,
        action.disabled && styles.headerButtonDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={action.icon} size={17} tintColor={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    alignItems: "center",
    elevation: 4,
    flexDirection: "row",
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 6,
    zIndex: 4,
  },
  headerActions: {
    elevation: 6,
    flexDirection: "row",
    flexShrink: 0,
    gap: 4,
    zIndex: 6,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 0,
    height: 44,
    justifyContent: "center",
    position: "relative",
    width: 44,
    zIndex: 7,
  },
  headerButtonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 14,
    maxWidth: "100%",
    opacity: 0.84,
    textAlign: "left",
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    textAlign: "left",
  },
  titleGroup: {
    alignItems: "flex-start",
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
}));
