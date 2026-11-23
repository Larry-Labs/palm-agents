import { useState } from "react";
import type { ChatMessage } from "codex-relay/api-schema";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ThemedText } from "@/components/themed-text";
import { Icon } from "@/components/ui/icon";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";

import { MessageBubble } from "./MessageBubble";
import { ActivityMarkdown } from "./ProtocolActivityCard";
import { commandText, type TurnActivity } from "./turn-activity";
import type { WorkspaceMarkdownPreviewTarget } from "./workspace-preview/markdown-target";

export function TurnActivityRow({
  activity,
  onMessageCopied,
  onOpenMarkdownAttachment,
}: {
  activity: TurnActivity;
  onMessageCopied?: () => void;
  onOpenMarkdownAttachment?: (target: WorkspaceMarkdownPreviewTarget) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { entries } = activity;
  const showActivity = entries.length > 0;
  const duration =
    activity.durationMs === undefined ? undefined : formatDuration(activity.durationMs);
  const heading = duration ? t("Elapsed {0}", duration) : undefined;
  const preview = activity.isRunning
    ? entries.findLast((entry) => entry.type === "commentary")?.message.content
    : undefined;

  return (
    <View style={styles.container}>
      {showActivity ? (
        <Disclosure
          alignLabelToContent
          expanded={expanded}
          onPress={() => setExpanded(!expanded)}
          label={heading ? t("{0} · View activity", heading) : t("View activity")}
        />
      ) : heading ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.elapsed}>
          {heading}
        </ThemedText>
      ) : null}
      {expanded && showActivity ? (
        <View style={styles.body}>
          {entries.map((entry) => {
            if (entry.type === "commands") {
              return <CommandGroup key={entry.id} commands={entry.commands} />;
            }
            const { message } = entry;
            return message.details?.attachments ? (
              <MessageBubble
                key={message.id}
                message={message}
                isThreadRunning={false}
                onMessageCopied={onMessageCopied}
                onOpenMarkdownAttachment={onOpenMarkdownAttachment}
              />
            ) : (
              <ActivityMarkdown
                key={message.id}
                markdown={message.content}
                selectable
                variant="compact"
              />
            );
          })}
        </View>
      ) : preview ? (
        <ThemedText type="small" numberOfLines={2} style={styles.preview}>
          {preview}
        </ThemedText>
      ) : null}
    </View>
  );
}

function CommandGroup({ commands }: { commands: ChatMessage[] }) {
  const [expanded, setExpanded] = useState(false);
  const running = commands.some((command) => command.state === "streaming");

  return (
    <View>
      <Disclosure
        expanded={expanded}
        icon="terminal"
        label={t(running ? "Running commands" : "Ran commands")}
        onPress={() => setExpanded(!expanded)}
      />
      {expanded ? (
        <View style={styles.commands}>
          {commands.map((command) => (
            <ThemedText key={command.id} selectable themeColor="textSecondary" type="code">
              {commandText(command)}
            </ThemedText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Disclosure({
  alignLabelToContent = false,
  expanded,
  icon,
  label,
  onPress,
}: {
  alignLabelToContent?: boolean;
  expanded: boolean;
  icon?: "terminal";
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      hitSlop={icon ? 6 : 4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.disclosure,
        alignLabelToContent && styles.processDisclosure,
        icon && styles.commandDisclosure,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={15} tintColor={theme.textSecondary} /> : null}
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Icon name={expanded ? "expand" : "chevronRight"} size={13} tintColor={theme.textSecondary} />
    </Pressable>
  );
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? t("{0}m {1}s", minutes, seconds) : t("{0}s", seconds);
}

const styles = StyleSheet.create((theme) => ({
  body: {
    borderLeftColor: theme.border,
    borderLeftWidth: 1,
    gap: Spacing.one,
    marginLeft: Spacing.one,
    paddingLeft: Spacing.three,
  },
  container: {
    paddingTop: Spacing.one,
  },
  commandDisclosure: {
    minHeight: 32,
  },
  commands: {
    gap: Spacing.one,
    paddingLeft: Spacing.two,
  },
  disclosure: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    minHeight: 36,
  },
  elapsed: {
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  processDisclosure: {
    paddingTop: Spacing.two,
  },
  preview: {
    marginBottom: Spacing.two,
  },
}));
