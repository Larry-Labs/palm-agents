import { useTheme } from "@/hooks/use-theme";
import { t } from "../../i18n";
import { Heart } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { FaGithub } from "@/assets/icons/fa";
import {
  clampPercent,
  connectionLabel,
  rateLimitProgressColor,
  useRemoteConfigPanel,
  useSettingsScreen,
  type HotUpdaterRemoteConfig,
} from "@/components/settings/use-settings-screen";
import { ThemedText } from "@/components/themed-text";
import { Icon } from "@/components/ui/icon";
import { codexRelayRepositoryLabel, codexRelayRepositoryUrl } from "@/constants/links";
import { Fonts, MaxContentWidth, Spacing } from "@/constants/theme";
import { hotUpdater, hotUpdaterBaseUrl } from "@/lib/hot-updater";
import { clearHotUpdaterLogs, formatHotUpdaterLogTime } from "@/lib/hot-updater-logs";
import { formatRateLimitRemaining } from "@/lib/rate-limits";

const hotUpdaterBaseUrlStatus = hotUpdaterBaseUrl ? "configured" : "missing";
const pushNotificationTrackColor = {
  false: "rgba(255, 255, 255, 0.16)",
  true: "#2CA36F",
};

export function SettingsScreen() {
  const theme = useTheme();
  const {
    addServerAddress,
    appUpdate,
    appUpdateActionLabel,
    appliedBundleSuffix,
    applyAppUpdate,
    closeSettings,
    computerName,
    connection,
    discoveredServerAddresses,
    editServerAddress,
    hasPairedSession,
    hotUpdaterLogs,
    isAppUpdateActionDisabled,
    isAppUpdatePending,
    manualServerAddresses,
    openProjectLink,
    pushNotificationPreferences,
    pushNotificationsLoading,
    pushNotificationsSupported,
    pushNotificationsUpdating,
    rateLimitRows,
    rateLimitsFetching,
    releaseVersionLabel,
    revealHotUpdaterLogs,
    selectServerAddress,
    serverUrl,
    setShowHotUpdaterLogs,
    showHotUpdaterLogs,
    signOut,
    switchingServerUrl,
    updatePushNotificationPreference,
  } = useSettingsScreen();

  const [showDiscoveredAddresses, setShowDiscoveredAddresses] = useState(false);

  function renderEditAddress(address: string) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Edit address {0}", address)}
        disabled={Boolean(switchingServerUrl)}
        onPress={() => editServerAddress(address)}
        style={({ pressed }) => [styles.editAddress, pressed && styles.pressed]}
      >
        <ThemedText type="smallBold">{t("Edit address")}</ThemedText>
      </Pressable>
    );
  }

  function renderAddress(candidate: Parameters<typeof selectServerAddress>[0]) {
    return (
      <View key={candidate.url} style={styles.serverAddressRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Use {0}", candidate.url)}
          disabled={Boolean(switchingServerUrl)}
          onPress={() => void selectServerAddress(candidate)}
          style={({ pressed }) => [styles.serverAddressCopy, pressed && styles.pressed]}
        >
          <ThemedText type="smallBold" style={styles.serverAddressLabel}>
            {candidate.label}
          </ThemedText>
          <ThemedText type="code" themeColor="textSecondary" style={styles.serverAddressValue}>
            {candidate.url}
          </ThemedText>
        </Pressable>
        {switchingServerUrl === candidate.url ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t("Checking")}
          </ThemedText>
        ) : candidate.manual ? (
          renderEditAddress(candidate.url)
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Back to threads")}
            onPress={closeSettings}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Icon name="back" size={19} tintColor={theme.text} />
          </Pressable>
          <View style={styles.titleGroup}>
            <ThemedText type="smallBold" style={styles.title}>
              {t("Settings")}
            </ThemedText>
            <ThemedText type="code" themeColor="textSecondary" style={styles.subtitle}>
              {t("Account")}
            </ThemedText>
          </View>
          <View style={styles.headerButtonPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <Animated.View layout={settingsLayoutTransition} style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              {t("Relay connection")}
            </ThemedText>
            <Animated.View layout={settingsLayoutTransition} style={styles.connectionPanel}>
              <Animated.View layout={settingsFastLayoutTransition} style={styles.connectionHeader}>
                <View
                  style={[
                    styles.connectionDot,
                    connection === "connected" && styles.connectionDotConnected,
                    connection === "offline" && styles.connectionDotOffline,
                  ]}
                />
                <ThemedText type="smallBold" style={styles.connectionTitle} numberOfLines={1}>
                  {computerName}
                </ThemedText>
                <View style={styles.connectionBadge}>
                  <ThemedText type="code" style={styles.connectionBadgeText}>
                    {connectionLabel(connection)}
                  </ThemedText>
                </View>
              </Animated.View>
              {hasPairedSession ? (
                <>
                  <View style={styles.serverAddressList}>
                    <View style={styles.serverAddressRow}>
                      <View style={styles.serverAddressCopy}>
                        <ThemedText type="smallBold" style={styles.serverAddressLabel}>
                          {t("Current connection address")}
                        </ThemedText>
                        <ThemedText
                          type="code"
                          themeColor="textSecondary"
                          style={styles.serverAddressValue}
                        >
                          {serverUrl}
                        </ThemedText>
                      </View>
                      {renderEditAddress(serverUrl)}
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      disabled={Boolean(switchingServerUrl)}
                      onPress={addServerAddress}
                      style={({ pressed }) => [styles.serverAddressRow, pressed && styles.pressed]}
                    >
                      <ThemedText type="smallBold">{t("Add connection address")}</ThemedText>
                    </Pressable>
                    {manualServerAddresses.map(renderAddress)}
                    {discoveredServerAddresses.length > 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: showDiscoveredAddresses }}
                        onPress={() => setShowDiscoveredAddresses((shown) => !shown)}
                        style={({ pressed }) => [
                          styles.serverAddressRow,
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText type="smallBold">{t("Other addresses")}</ThemedText>
                      </Pressable>
                    ) : null}
                    {showDiscoveredAddresses ? discoveredServerAddresses.map(renderAddress) : null}
                  </View>
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.unpairedCopy}>
                  {t("Pair this device from the main screen to choose a relay server.")}
                </ThemedText>
              )}
            </Animated.View>
          </Animated.View>

          <Animated.View layout={settingsLayoutTransition} style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              {t("Usage Limits")}
            </ThemedText>
            <Animated.View layout={settingsLayoutTransition} style={styles.usageCard}>
              {rateLimitRows.length > 0 ? (
                rateLimitRows.map((row, index) => (
                  <RateLimitProgressRow
                    key={row.id}
                    label={row.label}
                    remainingText={formatRateLimitRemaining(row.window)}
                    remainingPercent={row.window.remainingPercent}
                    usedPercent={row.window.usedPercent}
                    showDivider={index < rateLimitRows.length - 1}
                  />
                ))
              ) : (
                <Animated.View
                  key="usage-empty"
                  entering={settingsEnterTransition}
                  exiting={settingsExitTransition}
                  layout={settingsLayoutTransition}
                  style={styles.usageRow}
                >
                  <View style={styles.usageCopy}>
                    <ThemedText type="smallBold" style={styles.usageTitle}>
                      {t("Rate limits")}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.usageSubtitle}
                    >
                      {rateLimitsFetching
                        ? t("Checking current usage")
                        : t("Unavailable from this runtime")}
                    </ThemedText>
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          </Animated.View>

          {hasPairedSession ? (
            <Animated.View layout={settingsLayoutTransition} style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                {t("Notifications")}
              </ThemedText>
              <Animated.View layout={settingsLayoutTransition} style={styles.notificationPanel}>
                {pushNotificationsSupported ? (
                  <>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.notificationIntro}
                    >
                      {t("Generic alerts only. Chat content stays on your paired computer.")}
                    </ThemedText>
                    <PushNotificationToggle
                      accessibilityLabel={t("Notify when a Codex turn ends")}
                      disabled={pushNotificationsLoading || pushNotificationsUpdating}
                      onValueChange={(value) =>
                        void updatePushNotificationPreference("turnTerminal", value)
                      }
                      subtitle={t("When Codex completes or fails a turn")}
                      title={t("Turn complete")}
                      value={pushNotificationPreferences.turnTerminal}
                    />
                    <PushNotificationToggle
                      accessibilityLabel={t(
                        "Include remaining Codex usage in turn-complete notifications",
                      )}
                      disabled={pushNotificationsLoading || pushNotificationsUpdating}
                      onValueChange={(value) =>
                        void updatePushNotificationPreference("includeRemainingUsage", value)
                      }
                      subtitle={t("Show the lowest remaining Codex limit after a turn")}
                      title={t("Remaining usage")}
                      value={pushNotificationPreferences.includeRemainingUsage}
                    />
                    <PushNotificationToggle
                      accessibilityLabel={t("Notify when Codex needs action")}
                      disabled={pushNotificationsLoading || pushNotificationsUpdating}
                      onValueChange={(value) =>
                        void updatePushNotificationPreference("actionRequired", value)
                      }
                      showDivider={false}
                      subtitle={t("When Codex needs approval or input")}
                      title={t("Action required")}
                      value={pushNotificationPreferences.actionRequired}
                    />
                  </>
                ) : (
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.notificationIntro}
                  >
                    {t("Push notifications are available in the iOS and Android apps.")}
                  </ThemedText>
                )}
              </Animated.View>
            </Animated.View>
          ) : null}

          {hasPairedSession ? (
            <Animated.View layout={settingsLayoutTransition} style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                {t("Session")}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Sign out")}
                onPress={signOut}
                style={({ pressed }) => [styles.signOutRow, pressed && styles.pressed]}
              >
                <View style={styles.signOutContent}>
                  <View style={styles.signOutIconSlot}>
                    <Icon name="signOut" size={17} tintColor="#FFB4A8" />
                  </View>
                  <View style={styles.signOutCopy}>
                    <ThemedText type="smallBold" style={styles.signOutTitle}>
                      {t("Sign out")}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.signOutSubtitle}
                    >
                      {t("Pair again on this device")}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          ) : null}

          <Animated.View layout={settingsLayoutTransition} style={styles.versionFooter}>
            <Animated.View layout={settingsLayoutTransition} style={styles.versionRow}>
              <Pressable
                accessible={false}
                hitSlop={12}
                onPress={revealHotUpdaterLogs}
                style={styles.versionTapTarget}
              >
                <View style={styles.versionIcon}>
                  <Icon
                    name={isAppUpdatePending ? "refresh" : "permissionsAuto"}
                    size={12}
                    tintColor={isAppUpdatePending ? "#93E1B6" : theme.textSecondary}
                  />
                </View>
                <ThemedText type="code" themeColor="textSecondary" style={styles.versionText}>
                  {t("Version")}
                  {releaseVersionLabel}
                  {appUpdate.status === "checking" ? " · checking" : null}
                  {appUpdate.status === "current" ? " · current" : null}
                  {appUpdate.status === "downloading" ? " · downloading" : null}
                  {appUpdate.status === "ready" ? " · restart ready" : null}
                  {appUpdate.status === "error" ? " · check failed" : null}
                  {appliedBundleSuffix ? ` · bundle ${appliedBundleSuffix}` : null}
                </ThemedText>
              </Pressable>
              {isAppUpdatePending ? (
                <Animated.View
                  key="app-update-action"
                  entering={settingsEnterTransition}
                  exiting={settingsExitTransition}
                  layout={settingsLayoutTransition}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      appUpdate.status === "ready" ? t("Restart app") : t("Preparing app update")
                    }
                    disabled={isAppUpdateActionDisabled}
                    onPress={() => void applyAppUpdate()}
                    style={({ pressed }) => [
                      styles.versionButton,
                      isAppUpdateActionDisabled && styles.versionButtonDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="code" style={styles.versionButtonText}>
                      {appUpdateActionLabel}
                    </ThemedText>
                  </Pressable>
                </Animated.View>
              ) : null}
            </Animated.View>
            {isAppUpdatePending && appUpdate.updateInfo?.message ? (
              <Animated.View
                key="app-update-message"
                entering={settingsEnterTransition}
                exiting={settingsExitTransition}
                layout={settingsLayoutTransition}
              >
                <ThemedText type="small" themeColor="textSecondary" style={styles.versionMessage}>
                  {appUpdate.updateInfo.message}
                </ThemedText>
              </Animated.View>
            ) : null}
            {showHotUpdaterLogs ? (
              <Animated.View
                key="hot-updater-logs"
                entering={settingsEnterTransition}
                exiting={settingsExitTransition}
                layout={settingsLayoutTransition}
                style={styles.hotUpdaterLogPanel}
              >
                <View style={styles.hotUpdaterLogHeader}>
                  <ThemedText type="smallBold" style={styles.hotUpdaterLogTitle}>
                    {t("Logs (")}
                    {hotUpdater?.getCohort() ?? "none"})
                  </ThemedText>
                  <View style={styles.hotUpdaterLogActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("Clear HotUpdater logs")}
                      onPress={clearHotUpdaterLogs}
                      style={({ pressed }) => [
                        styles.hotUpdaterLogButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText type="code" style={styles.hotUpdaterLogButtonText}>
                        {t("Clear")}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("Hide HotUpdater logs")}
                      onPress={() => setShowHotUpdaterLogs(false)}
                      style={({ pressed }) => [
                        styles.hotUpdaterLogButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText type="code" style={styles.hotUpdaterLogButtonText}>
                        {t("Hide")}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.hotUpdaterConfigRow}>
                  <ThemedText type="code" style={styles.hotUpdaterConfigLabel}>
                    {t("Base URL")}
                  </ThemedText>
                  <ThemedText
                    type="code"
                    style={[
                      styles.hotUpdaterConfigValue,
                      !hotUpdaterBaseUrl && styles.hotUpdaterConfigValueMissing,
                    ]}
                  >
                    {hotUpdaterBaseUrlStatus}
                  </ThemedText>
                </View>
                {hotUpdater?.remoteConfig ? (
                  <RemoteConfigPanel remoteConfig={hotUpdater.remoteConfig} />
                ) : null}
                {hotUpdaterLogs.length > 0 ? (
                  hotUpdaterLogs.map((entry) => (
                    <View key={entry.id} style={styles.hotUpdaterLogRow}>
                      <ThemedText type="code" style={styles.hotUpdaterLogMeta}>
                        {formatHotUpdaterLogTime(entry.timestamp)} · {entry.level.toUpperCase()}
                      </ThemedText>
                      <ThemedText type="small" style={styles.hotUpdaterLogMessage}>
                        {entry.message}
                      </ThemedText>
                      {entry.details ? (
                        <ThemedText
                          type="code"
                          themeColor="textSecondary"
                          style={styles.hotUpdaterLogDetails}
                        >
                          {entry.details}
                        </ThemedText>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.versionMessage}>
                    {t("No OTA download events captured in this session.")}
                  </ThemedText>
                )}
              </Animated.View>
            ) : null}
          </Animated.View>

          <Animated.View layout={settingsLayoutTransition} style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              {t("Project")}
            </ThemedText>
            <Animated.View layout={settingsLayoutTransition} style={styles.projectLinkList}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t("Open Codex Relay GitHub repository")}
                onPress={() => openProjectLink(codexRelayRepositoryUrl)}
                style={({ pressed }) => [styles.projectLinkRow, pressed && styles.pressed]}
              >
                <View style={styles.projectLinkIcon}>
                  <FaGithub size={17} color={theme.text} />
                </View>
                <View style={styles.projectLinkCopy}>
                  <ThemedText type="smallBold" style={styles.projectLinkTitle}>
                    GitHub
                  </ThemedText>
                  <ThemedText
                    type="code"
                    themeColor="textSecondary"
                    style={styles.projectLinkSubtitle}
                    numberOfLines={1}
                  >
                    {codexRelayRepositoryLabel}
                  </ThemedText>
                </View>
                <Icon name="externalLink" size={15} tintColor={theme.textSecondary} />
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t("Open gronxb GitHub Sponsors")}
                onPress={() => openProjectLink(codexRelaySponsorUrl)}
                style={({ pressed }) => [styles.projectLinkRow, pressed && styles.pressed]}
              >
                <View style={[styles.projectLinkIcon, styles.projectLinkIconSponsor]}>
                  <Heart size={16} color="#FF9FC0" fill="#FF9FC0" />
                </View>
                <View style={styles.projectLinkCopy}>
                  <ThemedText type="smallBold" style={styles.projectLinkTitle}>
                    {t("Sponsor")}
                  </ThemedText>
                  <ThemedText
                    type="code"
                    themeColor="textSecondary"
                    style={styles.projectLinkSubtitle}
                    numberOfLines={1}
                  >
                    {codexRelaySponsorLabel}
                  </ThemedText>
                </View>
                <Icon name="externalLink" size={15} tintColor={theme.textSecondary} />
              </Pressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function PushNotificationToggle({
  accessibilityLabel,
  disabled,
  onValueChange,
  showDivider = true,
  subtitle,
  title,
  value,
}: {
  accessibilityLabel: string;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
  showDivider?: boolean;
  subtitle: string;
  title: string;
  value: boolean;
}) {
  return (
    <Animated.View
      entering={settingsEnterTransition}
      exiting={settingsExitTransition}
      layout={settingsLayoutTransition}
      style={[styles.notificationRow, showDivider && styles.notificationRowDivider]}
    >
      <View style={styles.notificationCopy}>
        <ThemedText type="smallBold" style={styles.notificationTitle}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.notificationSubtitle}>
          {subtitle}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onValueChange={onValueChange}
        thumbColor={value ? "#DDF7E7" : "#BEC5C3"}
        trackColor={pushNotificationTrackColor}
        value={value}
      />
    </Animated.View>
  );
}

function RateLimitProgressRow({
  label,
  remainingPercent,
  remainingText,
  showDivider,
  usedPercent,
}: {
  label: string;
  remainingPercent: number;
  remainingText: string;
  showDivider: boolean;
  usedPercent: number;
}) {
  const clampedUsedPercent = clampPercent(usedPercent);
  const clampedRemainingPercent = clampPercent(remainingPercent);
  const progressColor = rateLimitProgressColor(clampedRemainingPercent);

  return (
    <Animated.View
      entering={settingsEnterTransition}
      exiting={settingsExitTransition}
      layout={settingsLayoutTransition}
      style={[styles.usageRow, showDivider && styles.usageRowDivider]}
    >
      <View style={styles.usageHeader}>
        <View style={styles.usageCopy}>
          <ThemedText type="smallBold" style={styles.usageTitle} numberOfLines={1}>
            {label}
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.usageSubtitle}
            numberOfLines={1}
          >
            {remainingText} {t("left")}
          </ThemedText>
        </View>
        <View style={[styles.usagePercentBadge, { borderColor: progressColor }]}>
          <ThemedText type="code" style={[styles.usagePercentText, { color: progressColor }]}>
            {clampedRemainingPercent}%
          </ThemedText>
        </View>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          max: 100,
          min: 0,
          now: clampedUsedPercent,
          text: t("{0}% used", clampedUsedPercent),
        }}
        style={styles.usageProgressTrack}
      >
        <View
          style={[
            styles.usageProgressFill,
            { backgroundColor: progressColor, width: `${clampedUsedPercent}%` },
          ]}
        />
      </View>
      <View style={styles.usageMetaRow}>
        <ThemedText type="code" themeColor="textSecondary" style={styles.usageMetaText}>
          {t("Used")}
          {clampedUsedPercent}%
        </ThemedText>
        <ThemedText type="code" themeColor="textSecondary" style={styles.usageMetaText}>
          {t("Remaining")}
          {clampedRemainingPercent}%
        </ThemedText>
      </View>
    </Animated.View>
  );
}

function RemoteConfigPanel({ remoteConfig }: { remoteConfig: HotUpdaterRemoteConfig }) {
  const { fetchNow, fetching, fetchedAtMs, notice, values } = useRemoteConfigPanel(remoteConfig);

  return (
    <View style={styles.remoteConfigSection}>
      <View style={styles.hotUpdaterLogHeader}>
        <ThemedText type="smallBold" style={styles.hotUpdaterLogTitle}>
          Remote Config v{remoteConfig.activeVersion}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Fetch Remote Config now")}
          disabled={fetching}
          onPress={() => void fetchNow()}
          style={({ pressed }) => [styles.hotUpdaterLogButton, pressed && styles.pressed]}
        >
          <ThemedText type="code" style={styles.hotUpdaterLogButtonText}>
            {fetching ? t("Fetching") : t("Fetch")}
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText type="code" themeColor="textSecondary" style={styles.hotUpdaterLogDetails}>
        {remoteConfig.lastFetchStatus}
        {fetchedAtMs === null ? null : ` · ${formatHotUpdaterLogTime(fetchedAtMs)}`}
      </ThemedText>
      {notice ? (
        <ThemedText type="small" style={styles.hotUpdaterLogMessage}>
          {notice}
        </ThemedText>
      ) : null}
      {Object.entries(values).map(([key, value]) => (
        <View key={key} style={styles.hotUpdaterConfigRow}>
          <ThemedText type="code" style={styles.hotUpdaterConfigLabel}>
            {key}
          </ThemedText>
          <ThemedText type="code" style={styles.hotUpdaterConfigValue} numberOfLines={2}>
            {value.asString() === "" ? '""' : value.asString()} · {value.getSource()}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const settingsLayoutTransition = LinearTransition.duration(180);
const settingsFastLayoutTransition = LinearTransition.duration(120);
const settingsEnterTransition = FadeIn.duration(120);
const settingsExitTransition = FadeOut.duration(90);

const styles = StyleSheet.create((theme) => ({
  screen: {
    alignItems: "center",
    backgroundColor: theme.background,
    flex: 1,
  },
  container: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingBottom: 8,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: theme.subtle,
    borderColor: theme.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerButtonPlaceholder: {
    height: 40,
    width: 40,
  },
  titleGroup: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 14,
    opacity: 0.84,
    textAlign: "center",
  },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.five,
    paddingHorizontal: 18,
    paddingTop: Spacing.three,
  },
  scroll: {
    flex: 1,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.68,
  },
  projectLinkList: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: Spacing.two,
  },
  projectLinkRow: {
    alignItems: "center",
    backgroundColor: theme.subtle,
    borderColor: theme.border,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  projectLinkIcon: {
    alignItems: "center",
    backgroundColor: theme.subtle,
    borderColor: theme.border,
    borderRadius: 15,
    borderWidth: 1,
    flexShrink: 0,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  projectLinkIconSponsor: {
    backgroundColor: "rgba(255, 159, 192, 0.12)",
    borderColor: "rgba(255, 159, 192, 0.22)",
  },
  projectLinkCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  projectLinkTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  projectLinkSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  versionFooter: {
    gap: 3,
    paddingTop: Spacing.two,
  },
  versionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    minHeight: 26,
  },
  versionIcon: {
    alignItems: "center",
    height: 16,
    justifyContent: "center",
    width: 16,
  },
  versionTapTarget: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 26,
    minWidth: 0,
  },
  versionText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    minWidth: 0,
  },
  versionButton: {
    alignItems: "center",
    backgroundColor: "rgba(44, 163, 111, 0.13)",
    borderColor: "rgba(44, 163, 111, 0.28)",
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: "center",
    minHeight: 26,
    paddingHorizontal: 9,
  },
  versionButtonDisabled: {
    opacity: 0.62,
  },
  versionButtonText: {
    color: "#93E1B6",
    fontFamily: Fonts.monoMedium,
    fontSize: 10,
    lineHeight: 13,
  },
  versionMessage: {
    fontSize: 11,
    lineHeight: 15,
  },
  hotUpdaterLogPanel: {
    backgroundColor: theme.subtle,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: Spacing.two,
    marginTop: Spacing.two,
    padding: Spacing.three,
  },
  hotUpdaterLogHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  hotUpdaterLogTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  hotUpdaterLogActions: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  hotUpdaterLogButton: {
    borderColor: theme.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  hotUpdaterLogButtonText: {
    color: theme.textSecondary,
    fontFamily: Fonts.monoMedium,
    fontSize: 9,
    lineHeight: 12,
  },
  remoteConfigSection: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  hotUpdaterConfigRow: {
    backgroundColor: "rgba(140, 199, 255, 0.07)",
    borderColor: "rgba(140, 199, 255, 0.14)",
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  hotUpdaterConfigLabel: {
    color: "#8CC7FF",
    fontFamily: Fonts.monoMedium,
    fontSize: 9,
    lineHeight: 12,
  },
  hotUpdaterConfigValue: {
    color: theme.text,
    fontFamily: Fonts.monoMedium,
    fontSize: 10,
    lineHeight: 14,
  },
  hotUpdaterConfigValueMissing: {
    color: "#FFB4A8",
  },
  hotUpdaterLogRow: {
    borderTopColor: theme.border,
    borderTopWidth: 1,
    gap: 2,
    paddingTop: Spacing.two,
  },
  hotUpdaterLogMeta: {
    color: theme.textSecondary,
    fontFamily: Fonts.monoMedium,
    fontSize: 9,
    lineHeight: 12,
  },
  hotUpdaterLogMessage: {
    color: theme.text,
    fontSize: 12,
    lineHeight: 16,
  },
  hotUpdaterLogDetails: {
    fontSize: 10,
    lineHeight: 14,
  },
  connectionPanel: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  notificationPanel: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  notificationIntro: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  notificationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 70,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  notificationRowDivider: {
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
  },
  notificationCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  notificationTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  notificationSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  usageCard: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  usageRow: {
    gap: Spacing.two,
    minHeight: 84,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  usageRowDivider: {
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
  },
  usageHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  usageCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  usageTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  usageSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  usagePercentBadge: {
    alignItems: "center",
    backgroundColor: theme.subtle,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: "center",
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  usagePercentText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    lineHeight: 15,
  },
  usageProgressTrack: {
    backgroundColor: theme.subtle,
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
    width: "100%",
  },
  usageProgressFill: {
    borderRadius: 999,
    height: "100%",
  },
  usageMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 14,
  },
  usageMetaText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 10,
    lineHeight: 13,
  },
  connectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 24,
  },
  connectionDot: {
    backgroundColor: "#f2b84b",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  connectionDotConnected: {
    backgroundColor: "#2ca36f",
  },
  connectionDotOffline: {
    backgroundColor: "#d84f4f",
  },
  connectionTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    minWidth: 0,
  },
  unpairedCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  connectionBadge: {
    backgroundColor: theme.subtle,
    borderColor: theme.border,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  connectionBadgeText: {
    color: theme.textSecondary,
    fontFamily: Fonts.monoMedium,
    fontSize: 9,
    lineHeight: 12,
  },
  serverAddressList: {
    gap: 7,
    paddingTop: 2,
  },
  serverAddressRow: {
    alignItems: "center",
    backgroundColor: theme.subtle,
    borderColor: theme.border,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  serverAddressCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  editAddress: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  serverAddressLabel: {
    fontSize: 13,
    lineHeight: 17,
  },
  serverAddressValue: {
    fontSize: 11,
    lineHeight: 15,
  },
  signOutRow: {
    backgroundColor: "rgba(216, 79, 79, 0.08)",
    borderColor: "rgba(255, 180, 168, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 64,
    paddingHorizontal: Spacing.three,
  },
  signOutContent: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 62,
    width: "100%",
  },
  signOutIconSlot: {
    alignItems: "center",
    backgroundColor: "rgba(216, 79, 79, 0.16)",
    borderRadius: 15,
    flexShrink: 0,
    height: 30,
    justifyContent: "center",
    marginRight: 12,
    width: 30,
  },
  signOutCopy: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  signOutTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  signOutSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.7,
  },
}));
