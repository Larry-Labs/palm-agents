import type { ConfigContext, ExpoConfig } from "expo/config";
import { config } from "dotenv";
import brand from "./brand.json";

config({ path: ".env.local", quiet: true });

const hotUpdaterApiKey =
  process.env.EXPO_PUBLIC_HOT_UPDATER_API_KEY?.trim() || process.env.HOT_UPDATER_API_KEY?.trim();
const easProjectId = process.env.EAS_PROJECT_ID?.trim();
const hotUpdaterPublicKeyPath = process.env.HOT_UPDATER_PUBLIC_KEY_PATH?.trim();
const hotUpdaterEnabled = Boolean(
  process.env.EXPO_PUBLIC_HOT_UPDATER_BASE_URL?.trim() && hotUpdaterPublicKeyPath,
);

export default function appConfig(_context: ConfigContext): ExpoConfig {
  return {
    name: brand.name,
    slug: brand.slug,
    version: "1.6.3",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: brand.scheme,
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/images/icon.png",
      bundleIdentifier: brand.identifier,
      deploymentTarget: "16.4",
      supportsTablet: true,
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
        },
        ITSAppUsesNonExemptEncryption: false,
        NSLocalNetworkUsageDescription: "通过本地网络连接电脑上的 Codex Relay 服务器。",
        "UISupportedInterfaceOrientations~ipad": [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight",
        ],
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#191919",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      package: brand.identifier,
      permissions: ["android.permission.CAMERA", "android.permission.POST_NOTIFICATIONS"],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-dev-client",
        {
          launchMode: "most-recent",
        },
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: "#191919",
          image: "./assets/images/splash-icon.png",
          imageWidth: 112,
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 112,
          },
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "使用相机扫描电脑上的 Relay 配对二维码。",
          microphonePermission: false,
          recordAudioAndroid: false,
          barcodeScannerEnabled: true,
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "选择照片或截图作为聊天附件。",
          microphonePermission: false,
        },
      ],
      "expo-font",
      "expo-image",
      "expo-notifications",
      "expo-system-ui",
      "expo-web-browser",
      ...(hotUpdaterEnabled && hotUpdaterPublicKeyPath
        ? [
            [
              "@hot-updater/expo",
              {
                channel: "production",
                publicKeyPath: hotUpdaterPublicKeyPath,
              },
            ] as [string, { channel: string; publicKeyPath: string }],
          ]
        : []),
      [
        "expo-secure-store",
        {
          faceIDPermission: false,
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      hotUpdaterApiKey,
      hotUpdaterEnabled,
      router: {},
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
    },
  };
}
