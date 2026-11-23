import { useTheme } from "@/hooks/use-theme";
import { t } from "../../i18n";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { CopyableCommand } from "@/components/ui/copyable-command";
import { Icon } from "@/components/ui/icon";
import { workspaceName } from "@/lib/workspace-name";

import { relayStartCommand } from "./pairing-commands";

export function ConnectionBanner({
  connection,
  error,
  hasPairedSession,
  onManualConnect,
  onRefresh,
  onScanConnect,
  serverUrl,
  workspacePath,
}: {
  connection: "checking" | "connected" | "offline";
  error?: string;
  hasPairedSession: boolean;
  onManualConnect: () => void;
  onRefresh: () => void;
  onScanConnect: () => void;
  serverUrl: string;
  workspacePath?: string;
}) {
  const theme = useTheme();
  const [showConnectionHelp, setShowConnectionHelp] = useState(false);
  const isConnected = connection === "connected";
  const statusText = isConnected
    ? t("Connected · {0}", workspaceName(workspacePath) ?? compactServer(serverUrl))
    : connection === "checking"
      ? t("Checking · {0}", compactServer(serverUrl))
      : (error ?? t("Offline · {0}", compactServer(serverUrl)));

  if (hasPairedSession && !isConnected) {
    return (
      <Animated.View
        entering={connectionBannerEnterTransition}
        exiting={connectionBannerExitTransition}
        layout={connectionBannerLayoutTransition}
        style={styles.container}
      >
        <Animated.View layout={connectionBannerLayoutTransition} style={styles.pairPanel}>
          <View style={styles.pairHeader}>
            <View
              style={[
                styles.pairStatusDot,
                connection === "checking" && styles.pairStatusDotChecking,
              ]}
            />
            <View style={styles.pairCopy}>
              <ThemedText type="smallBold" style={styles.pairTitle}>
                {connection === "checking"
                  ? t("Connecting to your computer")
                  : t("Reconnecting to your computer")}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.pairSubtitle}
                numberOfLines={2}
              >
                {connection === "checking"
                  ? t("Checking · {0}", compactServer(serverUrl))
                  : (error ?? t("Waiting for {0}", compactServer(serverUrl)))}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    );
  }

  if (connection === "offline") {
    return (
      <Animated.View
        entering={connectionBannerEnterTransition}
        exiting={connectionBannerExitTransition}
        layout={connectionBannerLayoutTransition}
        style={styles.container}
      >
        <Animated.View layout={connectionBannerLayoutTransition} style={styles.pairPanel}>
          <View style={styles.pairHeader}>
            <View style={styles.pairStatusDot} />
            <View style={styles.pairCopy}>
              <ThemedText type="smallBold" style={styles.pairTitle}>
                {t("Pair with Relay")}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.pairSubtitle}
                numberOfLines={2}
              >
                {hasPairedSession ? statusText : t("No paired relay yet")}
              </ThemedText>
            </View>
          </View>
          <View style={styles.stepList}>
            <PairingStep
              icon="terminal"
              label="1"
              title={t("Start the relay")}
              body={t("Run this command on the device that will host the relay:")}
              command={relayStartCommand}
            />
            <PairingStep
              icon="check"
              label="2"
              title={t("Scan QR")}
              body={t(
                "Scan the QR shown in the relay terminal, then follow the prompts to approve.",
              )}
            />
          </View>
          <View style={styles.pairActions}>
            <Button
              accessibilityRole="button"
              accessibilityLabel={t("Scan connection QR")}
              onPress={onScanConnect}
              size="lg"
              variant="default"
              className="h-11 rounded-lg"
              style={styles.pairButton}
            >
              <Icon name="workspace" size={16} tintColor={theme.onPrimary} />
              <ThemedText type="smallBold" style={styles.primaryActionText}>
                {t("Scan QR")}
              </ThemedText>
            </Button>
            <Pressable
              accessibilityRole="button"
              onPress={onManualConnect}
              style={({ pressed }) => [styles.refreshAction, pressed && styles.pressed]}
            >
              <ThemedText type="smallBold">{t("Manual connection")}</ThemedText>
            </Pressable>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stepBody}>
              {t(
                "Connect directly on the same local network. Across networks, pair using a relay address your phone can reach.",
              )}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showConnectionHelp }}
              hitSlop={6}
              onPress={() => setShowConnectionHelp((visible) => !visible)}
              style={({ pressed }) => [styles.connectionHelpButton, pressed && styles.pressed]}
            >
              <ThemedText type="smallBold" style={styles.stepBody}>
                {t(showConnectionHelp ? "Hide connection help" : "Trouble connecting?")}
              </ThemedText>
            </Pressable>
            {showConnectionHelp ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.stepBody}>
                {t(
                  "Make sure the relay is running. For remote access, you can use a VPN such as Tailscale, a tunnel, or a reverse proxy. Use a pairing QR or link with an address your phone can reach.",
                )}
              </ThemedText>
            ) : null}
            {hasPairedSession ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Refresh connection")}
                onPress={onRefresh}
                style={({ pressed }) => [styles.refreshAction, pressed && styles.pressed]}
              >
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.refreshText}>
                  {t("Refresh connection")}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    );
  }

  return null;
}

function PairingStep({
  body,
  command,
  icon,
  label,
  title,
}: {
  body: string;
  command?: string;
  icon: "check" | "terminal";
  label: string;
  title: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepMarker}>
        <Icon name={icon} size={15} tintColor={theme.text} />
      </View>
      <View style={styles.stepCopy}>
        <View style={styles.stepTitleRow}>
          <ThemedText type="smallBold" style={styles.stepNumber}>
            {label}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.stepTitle}>
            {title}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.stepBody}>
          {body}
        </ThemedText>
        {command ? (
          <CopyableCommand
            command={command}
            copyAccessibilityLabel={t("Copy relay start command")}
          />
        ) : null}
      </View>
    </View>
  );
}

function compactServer(serverUrl: string) {
  return serverUrl.replace(/^https?:\/\//, "");
}

const connectionBannerLayoutTransition = LinearTransition.duration(180);
const connectionBannerEnterTransition = FadeIn.duration(150);
const connectionBannerExitTransition = FadeOut.duration(120);

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingHorizontal: 18,
    paddingVertical: 2,
  },
  statusLine: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    maxWidth: "100%",
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusLineConnected: {
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dot: {
    backgroundColor: "#f2b84b",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  connected: {
    backgroundColor: "#2ca36f",
  },
  offline: {
    backgroundColor: "#d84f4f",
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 15,
  },
  pairPanel: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
    position: "relative",
  },
  pairHeader: {
    minHeight: 37,
    paddingLeft: 17,
  },
  pairStatusDot: {
    backgroundColor: "#d84f4f",
    borderRadius: 4,
    height: 8,
    left: 0,
    position: "absolute",
    top: 6,
    width: 8,
  },
  pairStatusDotChecking: {
    backgroundColor: "#f2b84b",
  },
  pairCopy: {
    gap: 2,
    minWidth: 0,
  },
  pairTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  pairSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  stepList: {
    gap: 10,
  },
  stepRow: {
    backgroundColor: theme.subtle,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10,
  },
  stepMarker: {
    alignItems: "center",
    backgroundColor: theme.subtle,
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  stepCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  stepTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  stepNumber: {
    color: "#B8C7FF",
    fontSize: 11,
    lineHeight: 14,
  },
  stepTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  stepBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  pairActions: {
    gap: 8,
  },
  connectionHelpButton: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 28,
  },
  pairButton: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  primaryActionText: {
    color: theme.onPrimary,
    fontSize: 13,
    lineHeight: 17,
  },
  refreshAction: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
  },
  refreshText: {
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.7,
  },
}));
