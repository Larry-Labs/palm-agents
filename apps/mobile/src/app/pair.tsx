import { useCallback, useMemo } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { ChatScreen } from "@/components/chat/ChatScreen";
import { IpadSplitLayoutProvider } from "@/components/chat/ipad-split-layout";

export default function PairScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const mode = firstParam(params.mode);
  const manualMode = mode === "manual";
  const initialPairingUrl = useMemo(() => pairingUrlFromParams(params), [params]);
  const closeManualPairing = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);
  const completePairing = useCallback(() => {
    if (manualMode) {
      closeManualPairing();
    } else {
      router.replace("/");
    }
  }, [closeManualPairing, manualMode, router]);

  return (
    <IpadSplitLayoutProvider>
      {manualMode ? <Stack.Screen options={{ gestureEnabled: false }} /> : null}
      <ChatScreen
        initialPairingUrl={manualMode ? null : initialPairingUrl}
        manualAddressMode={manualMode}
        onCloseManualPairing={closeManualPairing}
        onPairingComplete={completePairing}
      />
    </IpadSplitLayoutProvider>
  );
}

function pairingUrlFromParams(params: Record<string, string | string[]>) {
  const serverUrl = firstParam(params.serverUrl);
  const serverPublicKey = firstParam(params.serverPublicKey);
  if (!serverUrl || !serverPublicKey) {
    return null;
  }

  const pairingUrl = new URL("codex-relay://pair");
  pairingUrl.searchParams.set("serverUrl", serverUrl);
  pairingUrl.searchParams.set("serverPublicKey", serverPublicKey.replaceAll(" ", "+"));
  for (const key of ["h", "serverHosts", "serverUrls"]) {
    const value = firstParam(params[key]);
    if (value) {
      pairingUrl.searchParams.set(key, value);
    }
  }
  return pairingUrl.toString();
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
