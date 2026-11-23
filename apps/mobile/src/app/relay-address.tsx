import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { RelayAddressForm } from "@/components/chat/RelayAddressForm";
import { t } from "@/i18n";
import {
  getCodexRelayServerUrl,
  getCodexRelayServerUrlCandidates,
  hasCodexRelaySession,
  setCodexRelayServerUrl,
  verifyNewRelayAddress,
} from "@/lib/codex-relay-api";
import { saveManualCodexRelayAddress } from "@/lib/codex-relay-server-url-storage";
import { fetchRateLimitsState, setStatusState } from "@/lib/server-state";
import { setConnection, setServerUrl } from "@/state/chat-store";

export default function RelayAddressScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const currentAddress = getCodexRelayServerUrl();
  const canEdit =
    typeof edit === "string" &&
    getCodexRelayServerUrlCandidates().some(
      ({ url, manual }) => url === edit && (manual || url === currentAddress),
    );

  function close() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/settings");
    }
  }

  async function saveAddress(address: string, signal: AbortSignal) {
    const status = await verifyNewRelayAddress(address, signal);
    if (signal.aborted) {
      return;
    }
    if (!hasCodexRelaySession() || getCodexRelayServerUrl() !== currentAddress) {
      throw new Error(t("The connection changed. Try again."));
    }

    saveManualCodexRelayAddress(address, edit);
    if (!edit || edit === currentAddress) {
      const savedAddress = setCodexRelayServerUrl(address);
      setStatusState(queryClient, status);
      setServerUrl(savedAddress);
      setConnection("connected");
      void fetchRateLimitsState(queryClient).catch(() => undefined);
    }
    close();
  }

  if (!hasCodexRelaySession() || (edit && !canEdit)) {
    return <Redirect href="/settings" />;
  }

  return <RelayAddressForm mode="save" initialAddress={edit} onBack={close} onSave={saveAddress} />;
}
