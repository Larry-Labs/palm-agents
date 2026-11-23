import { t } from "../../i18n";
import {
  Button,
  DisclosureGroup,
  Form,
  Gauge,
  Host,
  HStack,
  Image,
  Label,
  LabeledContent,
  Section,
  Spacer,
  Text,
  Toggle,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  disabled,
  font,
  foregroundStyle,
  gaugeStyle,
  listRowBackground,
  onTapGesture,
  scrollContentBackground,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useTheme } from "@/hooks/use-theme";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  appUpdateStatusSuffix,
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
import { MaxContentWidth } from "@/constants/theme";
import { hotUpdater, hotUpdaterBaseUrl } from "@/lib/hot-updater";
import { clearHotUpdaterLogs, formatHotUpdaterLogTime } from "@/lib/hot-updater-logs";
import { formatRateLimitRemaining } from "@/lib/rate-limits";

const secondaryText = [foregroundStyle("secondary")];
const footnote = [font({ textStyle: "footnote" }), foregroundStyle("secondary")];
const monospaced = [font({ textStyle: "footnote", design: "monospaced" })];

// Native SwiftUI Form; the hook owns every piece of state and every action.
export function SettingsScreen() {
  const theme = useTheme();
  const [showDiscoveredAddresses, setShowDiscoveredAddresses] = useState(false);
  const settings = useSettingsScreen();
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
    signOut,
    switchingServerUrl,
    updatePushNotificationPreference,
  } = settings;
  function renderAddress(candidate: Parameters<typeof selectServerAddress>[0]) {
    const switchButton = (
      <Button
        onPress={() => void selectServerAddress(candidate)}
        modifiers={[buttonStyle("borderless"), disabled(Boolean(switchingServerUrl))]}
      >
        <HStack spacing={10}>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[foregroundStyle("primary")]}>{candidate.label}</Text>
            <Text modifiers={footnote}>{candidate.url}</Text>
          </VStack>
          <Spacer />
          {switchingServerUrl === candidate.url ? (
            <Text modifiers={footnote}>{t("Checking")}</Text>
          ) : null}
        </HStack>
      </Button>
    );
    return (
      <HStack key={candidate.url} spacing={12}>
        {switchButton}
        {candidate.manual ? (
          <Button
            label={t("Edit address")}
            onPress={() => editServerAddress(candidate.url)}
            modifiers={[
              accessibilityLabel(t("Edit address {0}", candidate.url)),
              buttonStyle("borderless"),
              disabled(Boolean(switchingServerUrl)),
            ]}
          />
        ) : null}
      </HStack>
    );
  }

  const notificationsDisabled = pushNotificationsLoading || pushNotificationsUpdating;
  const updateSuffix = appUpdateStatusSuffix(appUpdate.status);
  const versionLine = [
    t("Version {0}", releaseVersionLabel),
    updateSuffix,
    appliedBundleSuffix ? `bundle ${appliedBundleSuffix}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Back to threads")}
            hitSlop={8}
            onPress={closeSettings}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Icon name="back" size={19} tintColor={theme.text} />
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            {t("Settings")}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>
        <Host colorScheme={theme.isDark ? "dark" : "light"} style={styles.host}>
          <Form modifiers={[scrollContentBackground("hidden")]}>
            <Section
              title={t("Relay connection")}
              footer={
                hasPairedSession ? undefined : (
                  <Text>
                    {t("Pair this device from the main screen to choose a relay server.")}
                  </Text>
                )
              }
              modifiers={[listRowBackground(theme.surface)]}
            >
              <LabeledContent label={<Label title={computerName} systemImage="desktopcomputer" />}>
                <HStack spacing={6}>
                  <Image
                    systemName="circle.fill"
                    size={8}
                    color={
                      connection === "connected"
                        ? "#2CA36F"
                        : connection === "offline"
                          ? "#FF9B8D"
                          : theme.textSecondary
                    }
                  />
                  <Text modifiers={monospaced}>{connectionLabel(connection)}</Text>
                </HStack>
              </LabeledContent>
              {hasPairedSession ? (
                <>
                  <HStack spacing={12}>
                    <VStack alignment="leading" spacing={2}>
                      <Text>{t("Current connection address")}</Text>
                      <Text modifiers={footnote}>{serverUrl}</Text>
                    </VStack>
                    <Spacer />
                    <Button
                      label={t("Edit address")}
                      onPress={() => editServerAddress(serverUrl)}
                      modifiers={[
                        accessibilityLabel(t("Edit address {0}", serverUrl)),
                        buttonStyle("borderless"),
                        disabled(Boolean(switchingServerUrl)),
                      ]}
                    />
                  </HStack>
                  <Button
                    label={t("Add connection address")}
                    onPress={addServerAddress}
                    modifiers={[disabled(Boolean(switchingServerUrl))]}
                  />
                  {manualServerAddresses.map(renderAddress)}
                  {discoveredServerAddresses.length > 0 ? (
                    <DisclosureGroup
                      isExpanded={showDiscoveredAddresses}
                      label={t("Other addresses")}
                      onIsExpandedChange={setShowDiscoveredAddresses}
                    >
                      {discoveredServerAddresses.map(renderAddress)}
                    </DisclosureGroup>
                  ) : null}
                </>
              ) : null}
            </Section>

            <Section title={t("Usage Limits")} modifiers={[listRowBackground(theme.surface)]}>
              {rateLimitRows.length > 0 ? (
                rateLimitRows.map((row) => (
                  <RateLimitGauge
                    key={row.id}
                    label={row.label}
                    remainingPercent={row.window.remainingPercent}
                    remainingText={formatRateLimitRemaining(row.window)}
                    usedPercent={row.window.usedPercent}
                  />
                ))
              ) : (
                <LabeledContent label={t("Rate limits")}>
                  <Text modifiers={secondaryText}>
                    {rateLimitsFetching
                      ? t("Checking current usage")
                      : t("Unavailable from this runtime")}
                  </Text>
                </LabeledContent>
              )}
            </Section>

            {hasPairedSession ? (
              <Section
                title={t("Notifications")}
                footer={
                  <Text>
                    {pushNotificationsSupported
                      ? t("Generic alerts only. Chat content stays on your paired computer.")
                      : t("Push notifications are available in the iOS and Android apps.")}
                  </Text>
                }
                modifiers={[listRowBackground(theme.surface)]}
              >
                {pushNotificationsSupported ? (
                  <>
                    <NotificationToggle
                      disabled={notificationsDisabled}
                      isOn={pushNotificationPreferences.turnTerminal}
                      onChange={(value) =>
                        void updatePushNotificationPreference("turnTerminal", value)
                      }
                      subtitle={t("When Codex completes or fails a turn")}
                      title={t("Turn complete")}
                    />
                    <NotificationToggle
                      disabled={notificationsDisabled}
                      isOn={pushNotificationPreferences.includeRemainingUsage}
                      onChange={(value) =>
                        void updatePushNotificationPreference("includeRemainingUsage", value)
                      }
                      subtitle={t("Show the lowest remaining Codex limit after a turn")}
                      title={t("Remaining usage")}
                    />
                    <NotificationToggle
                      disabled={notificationsDisabled}
                      isOn={pushNotificationPreferences.actionRequired}
                      onChange={(value) =>
                        void updatePushNotificationPreference("actionRequired", value)
                      }
                      subtitle={t("When Codex needs approval or input")}
                      title={t("Action required")}
                    />
                  </>
                ) : null}
              </Section>
            ) : null}

            {hasPairedSession ? (
              <Section title={t("Session")} modifiers={[listRowBackground(theme.surface)]}>
                <Button
                  label={t("Sign out")}
                  systemImage="rectangle.portrait.and.arrow.right"
                  // eslint-disable-next-line jsx-a11y/aria-role -- SwiftUI button role, not ARIA
                  role="destructive"
                  onPress={signOut}
                />
              </Section>
            ) : null}

            <Section
              modifiers={[listRowBackground(theme.surface)]}
              footer={
                isAppUpdatePending && appUpdate.updateInfo?.message ? (
                  <Text>{appUpdate.updateInfo.message}</Text>
                ) : undefined
              }
            >
              <HStack spacing={8}>
                <Image
                  systemName={isAppUpdatePending ? "arrow.triangle.2.circlepath" : "checkmark.seal"}
                  size={13}
                  color={isAppUpdatePending ? "#93E1B6" : theme.textSecondary}
                />
                <Text modifiers={[...monospaced, onTapGesture(revealHotUpdaterLogs)]}>
                  {versionLine}
                </Text>
                <Spacer />
                {isAppUpdatePending ? (
                  <Button
                    label={appUpdateActionLabel}
                    onPress={() => void applyAppUpdate()}
                    modifiers={[disabled(isAppUpdateActionDisabled)]}
                  />
                ) : null}
              </HStack>
              {settings.showHotUpdaterLogs ? (
                <HotUpdaterLogs
                  logs={settings.hotUpdaterLogs}
                  onHide={() => settings.setShowHotUpdaterLogs(false)}
                />
              ) : null}
            </Section>

            <Section title={t("Project")} modifiers={[listRowBackground(theme.surface)]}>
              <Button onPress={() => openProjectLink(codexRelayRepositoryUrl)}>
                <LabeledContent
                  label={
                    <Label title="GitHub" systemImage="chevron.left.forwardslash.chevron.right" />
                  }
                >
                  <Text modifiers={footnote}>{codexRelayRepositoryLabel}</Text>
                </LabeledContent>
              </Button>
              <Button onPress={() => openProjectLink(codexRelaySponsorUrl)}>
                <LabeledContent
                  label={<Label title={t("Sponsor")} systemImage="heart.fill" color="#FF9FC0" />}
                >
                  <Text modifiers={footnote}>{codexRelaySponsorLabel}</Text>
                </LabeledContent>
              </Button>
            </Section>
          </Form>
        </Host>
      </View>
    </SafeAreaView>
  );
}

function RateLimitGauge({
  label,
  remainingPercent,
  remainingText,
  usedPercent,
}: {
  label: string;
  remainingPercent: number;
  remainingText: string;
  usedPercent: number;
}) {
  const used = clampPercent(usedPercent);
  const remaining = clampPercent(remainingPercent);
  return (
    <VStack alignment="leading" spacing={6}>
      <HStack>
        <Text>{label}</Text>
        <Spacer />
        <Text modifiers={[...monospaced, foregroundStyle(rateLimitProgressColor(remaining))]}>
          {remaining}%
        </Text>
      </HStack>
      <Gauge
        value={used / 100}
        modifiers={[gaugeStyle("linearCapacity"), tint(rateLimitProgressColor(remaining))]}
      />
      <HStack>
        <Text modifiers={footnote}>
          {remainingText} {t("left")}
        </Text>
        <Spacer />
        <Text modifiers={footnote}>
          {t("Used")}
          {used}%
        </Text>
      </HStack>
    </VStack>
  );
}

function NotificationToggle({
  disabled: isDisabled,
  isOn,
  onChange,
  subtitle,
  title,
}: {
  disabled: boolean;
  isOn: boolean;
  onChange: (value: boolean) => void;
  subtitle: string;
  title: string;
}) {
  return (
    <Toggle isOn={isOn} onIsOnChange={onChange} modifiers={[disabled(isDisabled)]}>
      <VStack alignment="leading" spacing={2}>
        <Text>{title}</Text>
        <Text modifiers={footnote}>{subtitle}</Text>
      </VStack>
    </Toggle>
  );
}

// Revealed by five taps on the version line.
function HotUpdaterLogs({
  logs: hotUpdaterLogs,
  onHide,
}: {
  logs: ReturnType<typeof useSettingsScreen>["hotUpdaterLogs"];
  onHide: () => void;
}) {
  return (
    <DisclosureGroup label={t("Logs ({0})", hotUpdater?.getCohort() ?? "none")} isExpanded>
      <HStack spacing={12}>
        <Button label={t("Clear")} onPress={clearHotUpdaterLogs} />
        <Button label={t("Hide")} onPress={onHide} />
      </HStack>
      <LabeledContent label={t("Base URL")}>
        <Text modifiers={[...monospaced, foregroundStyle(hotUpdaterBaseUrl ? "primary" : "red")]}>
          {hotUpdaterBaseUrl ? "configured" : "missing"}
        </Text>
      </LabeledContent>
      {hotUpdater?.remoteConfig ? (
        <RemoteConfigRows remoteConfig={hotUpdater.remoteConfig} />
      ) : null}
      {hotUpdaterLogs.length > 0 ? (
        hotUpdaterLogs.map((entry) => (
          <VStack key={entry.id} alignment="leading" spacing={2}>
            <Text modifiers={[...monospaced, foregroundStyle("secondary")]}>
              {formatHotUpdaterLogTime(entry.timestamp)} · {entry.level.toUpperCase()}
            </Text>
            <Text>{entry.message}</Text>
            {entry.details ? <Text modifiers={footnote}>{entry.details}</Text> : null}
          </VStack>
        ))
      ) : (
        <Text modifiers={footnote}>{t("No OTA download events captured in this session.")}</Text>
      )}
    </DisclosureGroup>
  );
}

function RemoteConfigRows({ remoteConfig }: { remoteConfig: HotUpdaterRemoteConfig }) {
  const { fetchNow, fetching, fetchedAtMs, notice, values } = useRemoteConfigPanel(remoteConfig);
  return (
    <>
      <HStack>
        <Text>Remote Config v{remoteConfig.activeVersion}</Text>
        <Spacer />
        <Button
          label={fetching ? t("Fetching") : t("Fetch")}
          onPress={() => void fetchNow()}
          modifiers={[disabled(fetching)]}
        />
      </HStack>
      <Text modifiers={footnote}>
        {remoteConfig.lastFetchStatus}
        {fetchedAtMs === null ? "" : ` · ${formatHotUpdaterLogTime(fetchedAtMs)}`}
      </Text>
      {notice ? <Text>{notice}</Text> : null}
      {Object.entries(values).map(([key, value]) => (
        <LabeledContent key={key} label={key}>
          <Text modifiers={[...monospaced, foregroundStyle("secondary")]}>
            {value.asString() === "" ? '""' : value.asString()} · {value.getSource()}
          </Text>
        </LabeledContent>
      ))}
    </>
  );
}

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
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  title: {
    color: theme.text,
  },
  pressed: {
    opacity: 0.6,
  },
  host: {
    flex: 1,
  },
}));
