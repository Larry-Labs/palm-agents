import { t } from "../../i18n";
import type { ChatMessage } from "codex-relay/api-schema";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Text as NativeText,
  Pressable,
  ScrollView,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { dfetchDownload } from "react-native-direct-fetch";
import { EnrichedMarkdownText, type MarkdownStyle } from "react-native-enriched-markdown";
import { StyleSheet } from "react-native-unistyles";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { bundledLanguages } from "shiki/langs";
import { bundledThemes } from "shiki/themes";
import type { HighlighterCore, ThemedToken } from "shiki/types";

import { ThemedText } from "@/components/themed-text";
import { Icon } from "@/components/ui/icon";
import { Fonts, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { codexRelayImageRequestHeaders, resolveCodexRelayImageUrl } from "@/lib/codex-relay-api";
import { hapticSelection } from "@/lib/haptics";

import { PromptMarkdownText } from "./PromptMarkdownText";
import { ProtocolActivityCard } from "./ProtocolActivityCard";
import { CodeWrapToggle } from "./code-wrap-toggle";
import { messageSegmentRenderKey } from "./message-segment-key";
import {
  messageCodeContentForRender,
  messageMarkdownContentForRender,
} from "./message-markdown-content";
import type { WorkspaceMarkdownPreviewTarget } from "./workspace-preview/markdown-target";

const DATA_URI_PATTERN = /data:[^;\s]+;base64,[A-Za-z0-9+/=\n\r]+/g;
const FENCED_CODE_FENCE_PATTERN = /^```([^`]*)\s*$/;
const MAX_DISPLAY_LENGTH = 4000;
const MAX_LINE_LENGTH = 220;
const SHIKI_CODE_BLOCK_FONT_SIZE = 11;
const SHIKI_CODE_BLOCK_LINE_HEIGHT = 16;
const SHIKI_MAX_HIGHLIGHT_LENGTH = 8000;
const SHIKI_THEME = "github-dark-default";
const SHIKI_LIGHT_THEME = "github-light-default";
const SHIKI_FALLBACK_LANGUAGE = "text";
const MARKDOWN_ATTACHMENT_EXTENSIONS = new Set(["markdown", "md", "mdx"]);
const IMAGE_ATTACHMENT_EXTENSIONS = new Set(["gif", "heic", "heif", "jpg", "jpeg", "png", "webp"]);
const SHIKI_LANGUAGE_BY_ALIAS: Record<string, keyof typeof bundledLanguages> = {
  bash: "bash",
  css: "css",
  diff: "diff",
  dockerfile: "dockerfile",
  go: "go",
  html: "html",
  java: "java",
  js: "javascript",
  javascript: "javascript",
  json: "json",
  jsx: "jsx",
  kotlin: "kotlin",
  kt: "kotlin",
  markdown: "markdown",
  md: "markdown",
  py: "python",
  python: "python",
  rb: "ruby",
  rs: "rust",
  ruby: "ruby",
  rust: "rust",
  sh: "shellscript",
  shell: "shellscript",
  shellscript: "shellscript",
  swift: "swift",
  ts: "typescript",
  tsx: "tsx",
  typescript: "typescript",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
};
const SHIKI_LANGUAGE_LOADERS = Array.from(new Set(Object.values(SHIKI_LANGUAGE_BY_ALIAS))).map(
  (language) => bundledLanguages[language],
);
const messageTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
let shikiHighlighterPromise: Promise<HighlighterCore> | null = null;
const imageDownloadPromises = new Map<string, Promise<void>>();

const userPromptMarkdownStyle = {
  link: {
    color: "#7CC7FF",
    fontFamily: Fonts.sansSemiBold,
    underline: false,
  },
  paragraph: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 0,
    marginTop: 0,
  },
} satisfies MarkdownStyle;

type MarkdownSegment =
  | { content: string; kind: "markdown" }
  | { code: string; kind: "code"; language: string };

export const MessageBubble = memo(function MessageBubble({
  followsTurnActivity = false,
  isThreadRunning,
  message,
  onMessageCopied,
  onMessageRewind,
  onOpenMarkdownAttachment,
}: {
  followsTurnActivity?: boolean;
  isThreadRunning: boolean;
  message: ChatMessage;
  onMessageCopied?: () => void;
  onMessageRewind?: (message: ChatMessage) => void;
  onOpenMarkdownAttachment?: (target: WorkspaceMarkdownPreviewTarget) => void;
}) {
  const theme = useTheme();
  const promptMarkdownStyle = useMemo(
    () => ({
      ...userPromptMarkdownStyle,
      link: { ...userPromptMarkdownStyle.link, color: theme.link },
    }),
    [theme.link],
  );
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isError = message.role === "error";
  const isMeta =
    message.role === "status" || message.role === "tool" || message.role === "reasoning";
  const messageContent = message.content;
  const messageAttachments = message.details?.attachments;
  const supportsAttachments = isUser || isAssistant;
  const imageUris = useMemo(
    () => (supportsAttachments ? messageImageUris(messageAttachments) : []),
    [supportsAttachments, messageAttachments],
  );
  const markdownAttachments = useMemo(
    () =>
      supportsAttachments
        ? messageMarkdownAttachments(messageAttachments, isAssistant ? message.content : "")
        : [],
    [isAssistant, supportsAttachments, message.content, messageAttachments],
  );
  const displayContent = useMemo(
    () => (isUser ? formatUserContent(messageContent, imageUris.length > 0) : messageContent),
    [isUser, messageContent, imageUris.length],
  );
  const copyMarkdown = useMemo(
    () => messageMarkdownForClipboard(message.role, message.content, imageUris.length > 0),
    [imageUris.length, message.content, message.role],
  );
  const goalPrompt = useMemo(
    () => (isUser ? parseGoalPrompt(displayContent) : undefined),
    [isUser, displayContent],
  );
  const markdownSegments = useMemo(
    () => (isAssistant ? parseMarkdownSegments(message.content || " ") : []),
    [isAssistant, message.content],
  );
  const timestamp = useMemo(() => formatMessageTime(message.createdAt), [message.createdAt]);
  const [isCopied, setCopied] = useState(false);
  const handleCopyPress = useCallback(() => {
    if (!copyMarkdown) {
      return;
    }

    hapticSelection();
    setCopied(true);
    onMessageCopied?.();
    Clipboard.setStringAsync(copyMarkdown).catch((caught: unknown) => {
      setCopied(false);
      Alert.alert(t("Copy failed"), copyFailureMessage(caught));
    });
  }, [copyMarkdown, onMessageCopied]);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const assistantMarkdownStyle = useMemo<MarkdownStyle>(
    () => ({
      blockquote: {
        backgroundColor: "rgba(95, 167, 255, 0.08)",
        borderColor: "#5fa7ff",
        borderWidth: 2,
        color: theme.text,
        fontFamily: Fonts.sans,
        fontSize: 14,
        gapWidth: 8,
        lineHeight: 21,
        marginBottom: 10,
        marginTop: 0,
      },
      code: {
        backgroundColor: theme.subtle,
        borderColor: theme.border,
        color: theme.text,
        fontFamily: Fonts.monoMedium,
        fontSize: 13,
      },
      codeBlock: {
        backgroundColor: theme.backgroundSelected,
        borderColor: "rgba(132, 145, 165, 0.25)",
        borderRadius: 8,
        borderWidth: 1,
        color: theme.text,
        fontFamily: Fonts.mono,
        fontSize: 13,
        lineHeight: 19,
        padding: 10,
      },
      h1: {
        color: theme.text,
        fontFamily: Fonts.sansSemiBold,
        fontSize: 18,
        lineHeight: 24,
        marginBottom: 10,
        marginTop: 0,
      },
      h2: {
        color: theme.text,
        fontFamily: Fonts.sansSemiBold,
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 6,
        marginTop: 10,
      },
      h3: {
        color: theme.text,
        fontFamily: Fonts.sansSemiBold,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 5,
        marginTop: 8,
      },
      link: {
        color: theme.link,
        fontFamily: Fonts.sans,
        underline: false,
      },
      inlineMath: {
        color: theme.text,
      },
      list: {
        color: theme.text,
        fontFamily: Fonts.sans,
        fontSize: 14,
        gapWidth: 8,
        lineHeight: 21,
        markerColor: theme.textSecondary,
        markerMinWidth: 14,
        marginBottom: 8,
        marginLeft: 16,
        marginTop: 0,
      },
      paragraph: {
        color: theme.text,
        fontFamily: Fonts.sans,
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 8,
        marginTop: 0,
      },
      math: {
        backgroundColor: "transparent",
        color: theme.text,
        fontSize: 16,
        marginBottom: 8,
        marginTop: 4,
      },
      strong: {
        color: theme.text,
        fontFamily: Fonts.sansSemiBold,
        fontWeight: "normal",
      },
    }),
    [
      theme.backgroundSelected,
      theme.text,
      theme.textSecondary,
      theme.subtle,
      theme.border,
      theme.link,
    ],
  );

  if (isProtocolActivity(message)) {
    return (
      <View style={styles.protocolRow}>
        <ProtocolActivityCard message={message} isThreadRunning={isThreadRunning} />
      </View>
    );
  }

  if (isMeta) {
    return (
      <View style={styles.metaRow}>
        <ThemedText type="code" themeColor="textSecondary" numberOfLines={4}>
          {displayContent}
        </ThemedText>
      </View>
    );
  }

  if (goalPrompt) {
    return (
      <View style={[styles.row, styles.userRow]}>
        <View style={styles.goalPromptStack}>
          <View style={styles.goalLabelPill}>
            <Icon name="goal" size={12} tintColor={theme.textSecondary} strokeWidth={2} />
            <NativeText allowFontScaling={false} maxFontSizeMultiplier={1} style={styles.goalLabel}>
              {t("Goal")}
            </NativeText>
          </View>
          <View style={styles.goalValueBubble}>
            <PromptMarkdownText
              color={theme.text}
              fontSize={14}
              lineHeight={20}
              markdownStyle={promptMarkdownStyle}
              prompt={goalPrompt}
              selectable
              skills={[]}
            />
          </View>
          <MessageAttachments
            imageUris={imageUris}
            markdownAttachments={markdownAttachments}
            messageId={message.id}
            onOpenMarkdownAttachment={onOpenMarkdownAttachment}
          />
          <MessageFooter
            canCopy={copyMarkdown.length > 0}
            isCopied={isCopied}
            onCopyPress={handleCopyPress}
            onRewindPress={
              onMessageRewind && message.turnId ? () => onMessageRewind(message) : undefined
            }
            timestamp={timestamp}
            variant="user"
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.userRow : styles.assistantRow,
        followsTurnActivity && styles.replyAfterActivity,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser && styles.userBubble,
          isAssistant && styles.assistantBubble,
          isError && styles.errorBubble,
        ]}
      >
        {isAssistant ? (
          <View style={styles.assistantContent}>
            <ThemedText
              type="code"
              themeColor="textSecondary"
              style={[styles.assistantLabel, followsTurnActivity && styles.activityReplyLabel]}
            >
              Codex
            </ThemedText>
            <View style={styles.assistantBody}>
              {markdownSegments.map((segment, index) =>
                segment.kind === "code" ? (
                  <HighlightedCodeBlock
                    key={messageSegmentRenderKey(segment, index)}
                    code={segment.code}
                    deferHighlight={message.state === "streaming"}
                    language={segment.language}
                    style={styles.inlineCodeBlock}
                  />
                ) : (
                  <EnrichedMarkdownText
                    allowFontScaling={false}
                    flavor="github"
                    key={messageSegmentRenderKey(segment, index)}
                    maxFontSizeMultiplier={1}
                    markdown={messageMarkdownContentForRender(segment.content)}
                    selectable
                    // Tiny Codex deltas restart the native fade before intermediate text is presented.
                    streamingAnimation={false}
                    markdownStyle={assistantMarkdownStyle}
                  />
                ),
              )}
            </View>
            <MessageAttachments
              imageUris={imageUris}
              markdownAttachments={markdownAttachments}
              messageId={message.id}
              onOpenMarkdownAttachment={onOpenMarkdownAttachment}
            />
            <MessageFooter
              canCopy={copyMarkdown.length > 0}
              isCopied={isCopied}
              onCopyPress={handleCopyPress}
              timestamp={timestamp}
              variant="assistant"
            />
          </View>
        ) : (
          <View style={styles.userContent}>
            {displayContent ? (
              <PromptMarkdownText
                color={theme.text}
                fontSize={14}
                lineHeight={20}
                markdownStyle={promptMarkdownStyle}
                prompt={displayContent}
                selectable
                skills={[]}
              />
            ) : null}
            <MessageAttachments
              imageUris={imageUris}
              markdownAttachments={markdownAttachments}
              messageId={message.id}
              onOpenMarkdownAttachment={onOpenMarkdownAttachment}
            />
          </View>
        )}
        {!isAssistant ? (
          <MessageFooter
            canCopy={copyMarkdown.length > 0}
            isCopied={isCopied}
            onCopyPress={handleCopyPress}
            onRewindPress={
              isUser && onMessageRewind && message.turnId
                ? () => onMessageRewind(message)
                : undefined
            }
            timestamp={timestamp}
            variant={isUser ? "user" : "assistant"}
          />
        ) : null}
      </View>
    </View>
  );
});

function MessageFooter({
  canCopy,
  isCopied,
  onCopyPress,
  onRewindPress,
  timestamp,
  variant,
}: {
  canCopy: boolean;
  isCopied: boolean;
  onCopyPress: () => void;
  onRewindPress?: () => void;
  timestamp: string;
  variant: "assistant" | "user";
}) {
  const theme = useTheme();
  const isUser = variant === "user";
  const iconTint = theme.textSecondary;

  return (
    <View style={[styles.messageFooter, isUser && styles.userMessageFooter]}>
      <ThemedText
        type="code"
        themeColor={isUser ? undefined : "textSecondary"}
        style={[styles.timestamp, isUser && styles.userTimestamp]}
      >
        {timestamp}
      </ThemedText>
      <Pressable
        accessibilityLabel={isCopied ? t("Copied message Markdown") : t("Copy message Markdown")}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canCopy }}
        disabled={!canCopy}
        hitSlop={8}
        onPress={onCopyPress}
        style={({ pressed }) => [
          styles.copyButton,
          isUser && styles.userCopyButton,
          isCopied && styles.copyButtonCopied,
          !canCopy && styles.copyButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Icon name={isCopied ? "check" : "copy"} size={12} tintColor={iconTint} strokeWidth={2.2} />
      </Pressable>
      {onRewindPress ? (
        <Pressable
          accessibilityLabel={t("Rewind chat to before this message")}
          accessibilityRole="button"
          hitSlop={11}
          onPress={onRewindPress}
          style={({ pressed }) => [
            styles.copyButton,
            isUser && styles.userCopyButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="rewind" size={12} tintColor={iconTint} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

function formatUserContent(content: string, hasImages = false) {
  if (!content) {
    return "";
  }

  const normalizedLines = normalizeUserMarkdownContent(content, hasImages, true);

  if (normalizedLines.length <= MAX_DISPLAY_LENGTH) {
    return normalizedLines;
  }

  return t(
    "{0}\n\n[Message preview truncated]",
    normalizedLines.slice(0, MAX_DISPLAY_LENGTH).trimEnd(),
  );
}

function formatUserCopyMarkdown(content: string, hasImages = false) {
  return normalizeUserMarkdownContent(content, hasImages, false).trimEnd();
}

function normalizeUserMarkdownContent(content: string, hasImages: boolean, truncateLines: boolean) {
  let attachmentIndex = 0;
  const replacedDataUris = content
    .replace(/\n*Attached image \d+(?: \([^)]+\))?:\n?data:[^;\s]+;base64,[A-Za-z0-9+/=\n\r]+/g, "")
    .replace(/\n*Attached image \d+(?: \([^)]+\))?(?=\n|$)/g, "")
    .replace(DATA_URI_PATTERN, () => {
      attachmentIndex += 1;
      return `[Embedded image ${attachmentIndex}]`;
    });

  const normalizedLines = replacedDataUris
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (truncateLines ? truncateLine(line) : line))
    .join("\n")
    .trim();

  if (hasImages && normalizedLines === "Please use the attached image(s) as context.") {
    return "";
  }

  return normalizedLines;
}

function messageMarkdownForClipboard(
  role: ChatMessage["role"],
  messageContent: string,
  hasImages: boolean,
) {
  if (role === "user") {
    const content = formatUserCopyMarkdown(messageContent, hasImages);
    return parseGoalPrompt(content) ?? content;
  }

  return messageContent.trimEnd();
}

function copyFailureMessage(error: unknown) {
  return error instanceof Error ? error.message : t("The message could not be copied.");
}

function parseGoalPrompt(content: string) {
  const match = content.match(/^\/goal(?:\s+)([\s\S]*\S)\s*$/i);
  return match?.[1]?.trim();
}

function messageImageUris(attachments: unknown) {
  const uris = attachmentImageUris(attachments);
  return [...new Set(uris)];
}

function messageMarkdownAttachments(attachments: unknown, content = "") {
  const attachmentTargets = attachmentMarkdownTargets(attachments);
  const targets = attachmentTargets.length > 0 ? attachmentTargets : markdownLinkTargets(content);
  const seen = new Set<string>();
  return targets.filter((target) => {
    if (seen.has(target.path)) {
      return false;
    }
    seen.add(target.path);
    return true;
  });
}

function markdownLinkTargets(content: string): WorkspaceMarkdownPreviewTarget[] {
  const targets: WorkspaceMarkdownPreviewTarget[] = [];
  for (const match of content.matchAll(/\[([^\]]+)]\(([^)]+)\)/g)) {
    if (match.index !== undefined && content[match.index - 1] === "!") {
      continue;
    }

    const destination = markdownLinkDestination(match[2] ?? "");
    if (!destination || !MARKDOWN_ATTACHMENT_EXTENSIONS.has(fileExtension(destination) ?? "")) {
      continue;
    }

    targets.push({
      name: markdownLinkLabel(match[1] ?? "") || fileNameFromPath(destination),
      path: destination,
    });
  }
  return targets;
}

function markdownLinkDestination(value: string) {
  const trimmed = value.trim().replace(/^<|>$/g, "");
  const destination = trimmed.match(/^(\S+)/)?.[1] ?? "";
  if (/^https?:\/\//i.test(destination)) {
    return undefined;
  }
  return destination;
}

function markdownLinkLabel(value: string) {
  return value
    .replace(/\\([\\[\]()`*_{}#+\-.!])/g, "$1")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .trim();
}

function attachmentImageUris(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((attachment) => {
    if (!attachment || typeof attachment !== "object") {
      return [];
    }
    if (!isImageAttachment(attachment)) {
      return [];
    }
    const url = "url" in attachment ? attachment.url : undefined;
    return typeof url === "string" && url.length > 0 ? [resolveCodexRelayImageUrl(url)] : [];
  });
}

function attachmentMarkdownTargets(value: unknown): WorkspaceMarkdownPreviewTarget[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((attachment) => {
    if (!attachment || typeof attachment !== "object" || !isMarkdownAttachment(attachment)) {
      return [];
    }

    const path =
      attachmentStringValue(attachment, "path") ?? attachmentStringValue(attachment, "url");
    if (!path) {
      return [];
    }

    return [
      {
        name: attachmentStringValue(attachment, "name") ?? fileNameFromPath(path),
        path,
      },
    ];
  });
}

function isMarkdownAttachment(attachment: object) {
  if (isImageAttachment(attachment)) {
    return false;
  }

  const type = attachmentStringValue(attachment, "type")?.toLowerCase();
  const mimeType = attachmentStringValue(attachment, "mimeType")?.toLowerCase();
  const name = attachmentStringValue(attachment, "name");
  const path = attachmentStringValue(attachment, "path");
  const url = attachmentStringValue(attachment, "url");
  const extension = fileExtension(name ?? path ?? url ?? "");

  return (
    type === "document" ||
    type === "file" ||
    type === "localfile" ||
    mimeType === "text/markdown" ||
    mimeType === "text/x-markdown" ||
    mimeType === "application/markdown" ||
    (extension ? MARKDOWN_ATTACHMENT_EXTENSIONS.has(extension) : false)
  );
}

function isImageAttachment(attachment: object) {
  const type = attachmentStringValue(attachment, "type")?.toLowerCase();
  const mimeType = attachmentStringValue(attachment, "mimeType")?.toLowerCase();
  const name = attachmentStringValue(attachment, "name");
  const path = attachmentStringValue(attachment, "path");
  const url = attachmentStringValue(attachment, "url");
  const extension = fileExtension(name ?? path ?? url ?? "");

  return (
    type === "image" ||
    Boolean(mimeType?.startsWith("image/")) ||
    Boolean(url?.startsWith("data:image/")) ||
    (extension ? IMAGE_ATTACHMENT_EXTENSIONS.has(extension) : false)
  );
}

function attachmentStringValue(attachment: object, key: string) {
  const value = (attachment as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function fileNameFromPath(path: string) {
  const withoutQuery = path.split("?")[0] ?? path;
  const normalized = withoutQuery.replace(/\\/g, "/");
  const name = normalized.split("/").filter(Boolean).pop();
  return name ? decodeFilePathSegment(name) : t("Markdown document");
}

function fileExtension(path: string) {
  const name = fileNameFromPath(path);
  const extension = name.match(/\.([^.]+)$/)?.[1];
  return extension?.toLowerCase();
}

function decodeFilePathSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function ensureImageCacheDirectory(cacheDirectory: string) {
  await FileSystem.makeDirectoryAsync(cacheDirectory, { intermediates: true }).catch(
    (error: unknown) => {
      if (!String(error).includes("already exists")) {
        throw error;
      }
    },
  );
}

async function downloadImageFile(fileUri: string, uri: string, cacheDirectory: string) {
  const existingDownload = imageDownloadPromises.get(fileUri);
  if (existingDownload) {
    return existingDownload;
  }

  const downloadPromise = downloadImageFileToCache(fileUri, uri, cacheDirectory).finally(() => {
    if (imageDownloadPromises.get(fileUri) === downloadPromise) {
      imageDownloadPromises.delete(fileUri);
    }
  });
  imageDownloadPromises.set(fileUri, downloadPromise);
  return downloadPromise;
}

async function downloadImageFileToCache(fileUri: string, uri: string, cacheDirectory: string) {
  const tempFileUri = `${fileUri}.tmp`;
  try {
    await ensureImageCacheDirectory(cacheDirectory);
    await FileSystem.deleteAsync(tempFileUri, { idempotent: true });
    const response = await dfetchDownload(uri, tempFileUri, {
      headers: codexRelayImageRequestHeaders(),
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(t("Image request failed with {0}", response.status));
    }
    const tempFileInfo = await FileSystem.getInfoAsync(tempFileUri);
    if (!tempFileInfo.exists || tempFileInfo.size === 0) {
      throw new Error(t("Image download produced an empty file"));
    }
    await ensureImageCacheDirectory(cacheDirectory);
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    await FileSystem.moveAsync({ from: tempFileUri, to: fileUri });
  } finally {
    await FileSystem.deleteAsync(tempFileUri, { idempotent: true }).catch(() => undefined);
  }
}

function MessageAttachments({
  imageUris,
  markdownAttachments,
  messageId,
  onOpenMarkdownAttachment,
}: {
  imageUris: string[];
  markdownAttachments: WorkspaceMarkdownPreviewTarget[];
  messageId: string;
  onOpenMarkdownAttachment?: (target: WorkspaceMarkdownPreviewTarget) => void;
}) {
  if (imageUris.length === 0 && markdownAttachments.length === 0) {
    return null;
  }

  return (
    <>
      {imageUris.length > 0 ? (
        <View style={styles.messageImageGrid}>
          {imageUris.map((uri, index) => (
            <AttachmentImage
              accessibilityLabel={t("Open attached image {0}", index + 1)}
              key={`${messageId}-image-${uri}`}
              uri={uri}
              style={styles.messageImage}
            />
          ))}
        </View>
      ) : null}
      {markdownAttachments.length > 0 ? (
        <View style={styles.messageDocumentStack}>
          {markdownAttachments.map((attachment) => (
            <MarkdownAttachmentCard
              key={`${messageId}-markdown-${attachment.path}`}
              attachment={attachment}
              onOpen={onOpenMarkdownAttachment}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

function MarkdownAttachmentCard({
  attachment,
  onOpen,
}: {
  attachment: WorkspaceMarkdownPreviewTarget;
  onOpen?: (target: WorkspaceMarkdownPreviewTarget) => void;
}) {
  const theme = useTheme();
  const extension = fileExtension(attachment.name ?? attachment.path)?.toUpperCase() ?? "MD";

  return (
    <Pressable
      accessibilityLabel={t("Open {0}", attachment.name ?? attachment.path)}
      accessibilityRole="button"
      disabled={!onOpen}
      onPress={() => {
        if (!onOpen) {
          return;
        }
        hapticSelection();
        onOpen(attachment);
      }}
      style={({ pressed }) => [
        styles.messageDocumentCard,
        !onOpen && styles.messageDocumentCardDisabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.messageDocumentIcon}>
        <Icon name="file" size={18} tintColor={theme.text} />
      </View>
      <View style={styles.messageDocumentTextGroup}>
        <ThemedText type="smallBold" style={styles.messageDocumentName} numberOfLines={1}>
          {attachment.name ?? fileNameFromPath(attachment.path)}
        </ThemedText>
        <ThemedText type="code" style={styles.messageDocumentMeta} numberOfLines={1}>
          {t("Document ·")}
          {extension}
        </ThemedText>
      </View>
      <View style={styles.messageDocumentOpenButton}>
        <ThemedText type="smallBold" style={styles.messageDocumentOpenLabel}>
          {t("Open")}
        </ThemedText>
        <Icon name="expand" size={13} tintColor={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

function AttachmentImage({
  accessibilityLabel,
  style,
  uri,
}: {
  accessibilityLabel: string;
  style: object;
  uri: string;
}) {
  const { push } = useRouter();
  const [localUri, setLocalUri] = useState(uri.startsWith("file:") ? uri : "");

  useEffect(() => {
    if (uri.startsWith("file:")) {
      setLocalUri(uri);
      return;
    }

    let cancelled = false;

    async function loadImage() {
      let fileUri = "";
      try {
        if (!FileSystem.cacheDirectory) {
          throw new Error(t("File system cache directory is unavailable"));
        }

        const cacheDirectory = `${FileSystem.cacheDirectory}codex-relay-images/`;
        fileUri = `${cacheDirectory}${stableImageCacheKey(uri)}${imageFileExtension(uri)}`;
        await ensureImageCacheDirectory(cacheDirectory);
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists || fileInfo.size === 0) {
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
          }
          await downloadImageFile(fileUri, uri, cacheDirectory);
        }
        if (!cancelled) {
          setLocalUri(fileUri);
        }
      } catch (error) {
        if (fileUri) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => undefined);
        }
        if (__DEV__) {
          console.warn(t("Image attachment download failed"), { error, uri });
        }
        if (!cancelled) {
          setLocalUri("");
        }
      }
    }

    setLocalUri("");
    void loadImage();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={!localUri}
      onPress={() => {
        if (!localUri) {
          return;
        }
        push({
          pathname: "/image-viewer",
          params: {
            title: accessibilityLabel,
            uri: localUri,
          },
        });
      }}
      style={styles.messageImageButton}
    >
      {localUri ? (
        <Image contentFit="cover" source={{ uri: localUri }} style={style} />
      ) : (
        <View style={style} />
      )}
    </Pressable>
  );
}

function stableImageCacheKey(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return `image-${(hash >>> 0).toString(16)}`;
}

function imageFileExtension(uri: string) {
  const path = uri.split("?")[0] ?? "";
  const match = path.match(/\.(png|jpe?g|gif|webp|heic|heif)$/i);
  return match ? `.${match[1].toLowerCase()}` : ".img";
}

function truncateLine(line: string) {
  if (line.length <= MAX_LINE_LENGTH) {
    return line;
  }

  const head = line.slice(0, 160).trimEnd();
  const tail = line.slice(-48).trimStart();
  return `${head} ... ${tail}`;
}

function parseMarkdownSegments(markdown: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  const markdownLines: string[] = [];
  const codeLines: string[] = [];
  let codeLanguage = "";
  let isInCodeBlock = false;

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const fenceMatch = line.match(FENCED_CODE_FENCE_PATTERN);
    if (fenceMatch) {
      if (isInCodeBlock) {
        segments.push({
          code: messageCodeContentForRender(codeLines.join("\n")),
          kind: "code",
          language: codeLanguage,
        });
        codeLines.length = 0;
        codeLanguage = "";
        isInCodeBlock = false;
      } else {
        if (markdownLines.some((line) => line.trim())) {
          segments.push({
            content: markdownLines.join("\n"),
            kind: "markdown",
          });
        }
        markdownLines.length = 0;
        codeLanguage = normalizeCodeLanguage(fenceMatch[1] ?? "");
        isInCodeBlock = true;
      }

      continue;
    }

    if (isInCodeBlock) {
      codeLines.push(line);
    } else {
      markdownLines.push(line);
    }
  }

  if (isInCodeBlock) {
    segments.push({
      code: messageCodeContentForRender(codeLines.join("\n")),
      kind: "code",
      language: codeLanguage,
    });
  }

  if (markdownLines.some((line) => line.trim())) {
    segments.push({
      content: markdownLines.join("\n"),
      kind: "markdown",
    });
  }

  return segments.length > 0 ? segments : [{ content: markdown, kind: "markdown" }];
}

function normalizeCodeLanguage(value: string) {
  return value.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

export const HighlightedCodeBlock = memo(function HighlightedCodeBlock({
  code,
  deferHighlight = false,
  language,
  style,
}: {
  code: string;
  deferHighlight?: boolean;
  language: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const [wrapped, setWrapped] = useState(false);
  const codeText = (
    <HighlightedCodeText
      code={code}
      deferHighlight={deferHighlight}
      language={language}
      selectable
    />
  );

  return (
    <View
      style={[
        styles.codeBlockFrame,
        {
          backgroundColor: theme.backgroundSelected,
          borderColor: "rgba(132, 145, 165, 0.25)",
        },
        style,
      ]}
    >
      <View style={styles.codeBlockHeader}>
        {language ? (
          <NativeText
            allowFontScaling={false}
            maxFontSizeMultiplier={1}
            style={[styles.codeBlockLanguage, { color: theme.textSecondary }]}
          >
            {language}
          </NativeText>
        ) : null}
        <CodeWrapToggle wrapped={wrapped} onToggle={() => setWrapped((value) => !value)} />
      </View>
      {wrapped ? (
        codeText
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {codeText}
        </ScrollView>
      )}
    </View>
  );
});

export const HighlightedCodeText = memo(function HighlightedCodeText({
  code,
  deferHighlight = false,
  language,
  selectable,
  style,
}: {
  code: string;
  deferHighlight?: boolean;
  language: string;
  selectable?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const shikiLanguage = getShikiLanguage(language);
  const plainLines = useMemo(() => code.split("\n"), [code]);

  useEffect(() => {
    if (
      deferHighlight ||
      shikiLanguage === SHIKI_FALLBACK_LANGUAGE ||
      code.length > SHIKI_MAX_HIGHLIGHT_LENGTH
    ) {
      setTokens(null);
      return;
    }

    let isMounted = true;
    setTokens(null);

    getHighlightedCodeTokens(code, shikiLanguage, theme.isDark)
      .then((nextTokens) => {
        if (isMounted) {
          setTokens(nextTokens);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTokens(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [code, deferHighlight, shikiLanguage, theme.isDark]);

  return (
    <NativeText
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      selectable={selectable}
      style={[styles.codeBlockText, { color: theme.text }, style]}
    >
      {tokens
        ? tokens.map((lineTokens, lineIndex) => (
            <NativeText key={`line-${lineIndex}`} style={styles.codeBlockTextFragment}>
              {lineTokens.map((token, tokenIndex) => (
                <NativeText
                  key={`${lineIndex}-${tokenIndex}-${token.offset}`}
                  style={[styles.codeBlockTextFragment, { color: token.color ?? theme.text }]}
                >
                  {token.content}
                </NativeText>
              ))}
              {lineIndex < tokens.length - 1 ? "\n" : ""}
            </NativeText>
          ))
        : plainLines.map((line, lineIndex) => (
            <NativeText key={`plain-line-${lineIndex}`} style={styles.codeBlockTextFragment}>
              {line}
              {lineIndex < plainLines.length - 1 ? "\n" : ""}
            </NativeText>
          ))}
    </NativeText>
  );
});

function getShikiLanguage(language: string): string {
  return SHIKI_LANGUAGE_BY_ALIAS[language] ?? SHIKI_FALLBACK_LANGUAGE;
}

async function getHighlightedCodeTokens(code: string, language: string, isDark: boolean) {
  if (language === SHIKI_FALLBACK_LANGUAGE || code.length > SHIKI_MAX_HIGHLIGHT_LENGTH) {
    return null;
  }

  const highlighter = await getShikiHighlighter();
  return highlighter.codeToTokens(code, {
    lang: language,
    theme: isDark ? SHIKI_THEME : SHIKI_LIGHT_THEME,
  }).tokens;
}

function getShikiHighlighter() {
  shikiHighlighterPromise ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    langs: SHIKI_LANGUAGE_LOADERS,
    themes: [bundledThemes[SHIKI_THEME], bundledThemes[SHIKI_LIGHT_THEME]],
  });

  return shikiHighlighterPromise;
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return messageTimeFormatter.format(date);
}

const styles = StyleSheet.create((theme) => ({
  row: {
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
  },
  replyAfterActivity: {
    marginTop: 0,
  },
  userRow: {
    alignItems: "flex-end",
  },
  assistantRow: {
    alignItems: "stretch",
  },
  bubble: {
    borderRadius: 18,
    maxWidth: "92%",
    overflow: "hidden",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  userBubble: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderWidth: 1,
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  assistantBubble: {
    maxWidth: "100%",
    overflow: "visible",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  assistantContent: {
    paddingHorizontal: 0,
  },
  assistantBody: {
    gap: Spacing.two,
  },
  errorBubble: {
    backgroundColor: "rgba(216, 79, 79, 0.16)",
    borderColor: "rgba(216, 79, 79, 0.38)",
    borderWidth: 1,
  },
  userContent: {
    gap: Spacing.two,
  },
  goalPromptStack: {
    alignItems: "flex-end",
    gap: 7,
    maxWidth: "82%",
  },
  goalLabelPill: {
    alignItems: "center",
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    height: 28,
    paddingLeft: 10,
    paddingRight: 12,
  },
  goalLabel: {
    color: theme.text,
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    includeFontPadding: false,
    lineHeight: 16,
  },
  goalValueBubble: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  messageImageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  messageImage: {
    backgroundColor: theme.subtle,
    borderRadius: 12,
    height: 156,
    overflow: "hidden",
    width: 156,
  },
  messageImageButton: {
    borderRadius: 12,
  },
  messageDocumentStack: {
    gap: Spacing.one,
    marginBottom: 3,
    marginTop: 9,
  },
  messageDocumentCard: {
    alignItems: "center",
    backgroundColor: theme.subtle,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 58,
    padding: Spacing.two,
  },
  messageDocumentCardDisabled: {
    opacity: 0.72,
  },
  messageDocumentIcon: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  messageDocumentTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  messageDocumentName: {
    color: theme.text,
    fontSize: 13,
    lineHeight: 18,
  },
  messageDocumentMeta: {
    color: theme.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  messageDocumentOpenButton: {
    alignItems: "center",
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 3,
    minHeight: 30,
    paddingHorizontal: 10,
  },
  messageDocumentOpenLabel: {
    color: theme.text,
    fontSize: 12,
    lineHeight: 16,
  },
  assistantLabel: {
    marginBottom: Spacing.one,
    opacity: 0.7,
  },
  activityReplyLabel: {
    marginBottom: 0,
  },
  messageFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  userMessageFooter: {
    alignSelf: "flex-end",
  },
  timestamp: {
    opacity: 0.55,
  },
  userTimestamp: {
    color: theme.textSecondary,
    fontSize: 10,
  },
  copyButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 22,
    justifyContent: "center",
    marginLeft: -1,
    width: 22,
  },
  userCopyButton: {
    marginRight: -4,
  },
  copyButtonCopied: {
    backgroundColor: theme.subtle,
  },
  copyButtonDisabled: {
    opacity: 0.36,
  },
  protocolRow: {
    alignSelf: "stretch",
    marginVertical: 3,
  },
  metaRow: {
    alignSelf: "center",
    backgroundColor: theme.subtle,
    borderRadius: 14,
    marginVertical: Spacing.one,
    maxWidth: "90%",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  codeBlockFrame: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    marginTop: 2,
    overflow: "hidden",
  },
  inlineCodeBlock: {
    marginBottom: 0,
    marginTop: 0,
  },
  codeBlockHeader: {
    alignItems: "center",
    borderBottomColor: "rgba(132, 145, 165, 0.18)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  codeBlockLanguage: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 8,
    textTransform: "uppercase",
  },
  codeBlockText: {
    fontFamily: Fonts.mono,
    fontSize: SHIKI_CODE_BLOCK_FONT_SIZE,
    lineHeight: SHIKI_CODE_BLOCK_LINE_HEIGHT,
    minWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  codeBlockTextFragment: {
    fontFamily: Fonts.mono,
    fontSize: SHIKI_CODE_BLOCK_FONT_SIZE,
    lineHeight: SHIKI_CODE_BLOCK_LINE_HEIGHT,
  },
}));

function isProtocolActivity(message: ChatMessage) {
  return (
    message.kind === "commandExecution" ||
    message.kind === "fileChange" ||
    message.kind === "plan" ||
    message.kind === "approvalRequest" ||
    message.kind === "structuredUserInput" ||
    message.kind === "subagentAction" ||
    message.kind === "thinking" ||
    message.kind === "toolActivity" ||
    (message.kind === "unknown" && message.details?.type === "dynamicToolCall") ||
    message.kind === "webSearch"
  );
}
