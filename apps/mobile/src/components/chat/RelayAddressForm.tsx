import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";
import { checkRelayAddress } from "@/lib/codex-relay-api";
import { parseRelayAddress } from "@/lib/relay-address";

type RelayAddressFormProps = { onBack: () => void } & (
  | {
      mode: "pair";
      pairing: boolean;
      onScan: (address: string) => void;
      onPairWithLink: (link: string, address: string) => void;
    }
  | {
      mode: "save";
      initialAddress?: string;
      onSave: (address: string, signal: AbortSignal) => Promise<void>;
    }
);

export function RelayAddressForm(props: RelayAddressFormProps) {
  const theme = useTheme();
  const [input, setInput] = useState(props.mode === "save" ? (props.initialAddress ?? "") : "");
  const [verifiedAddress, setVerifiedAddress] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState("");
  const pending = useRef<AbortController | undefined>(undefined);
  const pairing = props.mode === "pair" && props.pairing;
  const busy = checking || pairing;

  useEffect(() => () => pending.current?.abort(), []);

  async function checkAddress() {
    if (busy || pending.current) {
      return;
    }
    Keyboard.dismiss();
    const address = parseRelayAddress(input);
    if (!address) {
      setError(t("Enter a valid Relay IP address or domain."));
      return;
    }
    setChecking(true);
    setError(undefined);
    const attempt = new AbortController();
    pending.current = attempt;
    try {
      if (props.mode === "save") {
        await props.onSave(address, attempt.signal);
      } else {
        await checkRelayAddress(address);
        if (!attempt.signal.aborted) {
          setVerifiedAddress(address);
        }
      }
    } catch (caught) {
      if (!attempt.signal.aborted) {
        setError(
          props.mode === "save" && caught instanceof Error
            ? caught.message
            : t(
                "Could not reach the relay. Check that it is running and its address is reachable from your phone.",
              ),
        );
      }
    } finally {
      pending.current = undefined;
      if (!attempt.signal.aborted) {
        setChecking(false);
      }
    }
  }

  function submitLink(address: string) {
    if (props.mode !== "pair" || busy) {
      return;
    }
    const pairingLink = link.trim();
    if (!pairingLink.startsWith("codex-relay://pair?")) {
      setError(t("Paste the full pairing link shown in the Relay terminal."));
      return;
    }
    setError(undefined);
    Keyboard.dismiss();
    props.onPairWithLink(pairingLink, address);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Button
          accessibilityRole="button"
          variant="ghost"
          style={styles.back}
          onPress={() => {
            pending.current?.abort();
            props.onBack();
          }}
          disabled={pairing}
        >
          <Text>{t("Back")}</Text>
        </Button>
        <ThemedText type="subtitle">
          {props.mode === "pair"
            ? t("Manual connection")
            : t(props.initialAddress ? "Edit connection address" : "Add connection address")}
        </ThemedText>
        <View style={styles.field}>
          <ThemedText type="smallBold">{t("Relay address")}</ThemedText>
          <TextInput
            accessibilityLabel={t("Relay address")}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            keyboardType="url"
            onChangeText={(value) => {
              setInput(value);
              setVerifiedAddress(undefined);
              setError(undefined);
            }}
            onSubmitEditing={() => void checkAddress()}
            placeholder="192.168.1.10:8787"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="go"
            style={styles.input}
            value={input}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t("Enter the IP and port or domain your phone uses to reach the Relay.")}
          </ThemedText>
        </View>
        {props.mode === "pair" && verifiedAddress ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {t(
                "Relay reachable. Scan its pairing QR or paste its pairing link, then approve in its terminal.",
              )}
            </ThemedText>
            <Button
              accessibilityRole="button"
              disabled={busy}
              onPress={() => props.onScan(verifiedAddress)}
            >
              <Text>{t("Scan QR")}</Text>
            </Button>
            {showLink ? (
              <>
                <TextInput
                  accessibilityLabel={t("Pairing link")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  keyboardType="url"
                  onChangeText={setLink}
                  onSubmitEditing={() => submitLink(verifiedAddress)}
                  placeholder="codex-relay://pair?…"
                  placeholderTextColor={theme.textSecondary}
                  style={styles.input}
                  value={link}
                />
                <Button
                  accessibilityRole="button"
                  disabled={busy || !link.trim()}
                  onPress={() => submitLink(verifiedAddress)}
                  variant="outline"
                >
                  <Text>{t("Verify pairing link")}</Text>
                </Button>
              </>
            ) : (
              <Button
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setShowLink(true)}
                variant="outline"
              >
                <Text>{t("Paste pairing link")}</Text>
              </Button>
            )}
          </>
        ) : (
          <Button
            accessibilityRole="button"
            disabled={!input.trim() || busy}
            onPress={() => void checkAddress()}
          >
            {checking ? <ActivityIndicator color={theme.onPrimary} /> : null}
            <Text>
              {t(
                checking ? "Checking" : props.mode === "save" ? "Test and save" : "Test connection",
              )}
            </Text>
          </Button>
        )}
        {error ? (
          <ThemedText accessibilityLiveRegion="polite" type="small">
            {error}
          </ThemedText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: { flex: 1, backgroundColor: theme.background },
  content: {
    alignSelf: "center",
    gap: 15,
    maxWidth: 480,
    padding: 20,
    width: "100%",
  },
  back: { alignSelf: "flex-start", marginLeft: -12 },
  field: { gap: 7 },
  input: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    color: theme.text,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
}));
