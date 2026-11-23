import { useTheme } from "@/hooks/use-theme";
import { t } from "../../i18n";
import { Drawer } from "expo-router/drawer";
import { Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { ThreadDrawerContent } from "@/components/chat/ThreadDrawerContent";
import { appName } from "@/constants/brand";
import {
  EXPANDED_DRAWER_BREAKPOINT,
  IpadSplitLayoutProvider,
  useIpadSplitLayout,
} from "@/components/chat/ipad-split-layout";
import { Icon, type AppIconName } from "@/components/ui/icon";

import { hapticMediumImpact } from "@/lib/haptics";

const COMPACT_DRAWER_WIDTH = 320;
const COLLAPSED_DRAWER_WIDTH = 52;

export default function DrawerLayout() {
  return (
    <IpadSplitLayoutProvider>
      <DrawerLayoutContent />
    </IpadSplitLayoutProvider>
  );
}

function DrawerLayoutContent() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { beginSidebarResize, isSidebarVisible, resizeSidebar, setSidebarVisible, sidebarWidth } =
    useIpadSplitLayout();
  const usesExpandedDrawer = width >= EXPANDED_DRAWER_BREAKPOINT;
  const showsExpandedDrawer = usesExpandedDrawer && isSidebarVisible;
  const showsCollapsedRail = usesExpandedDrawer && !isSidebarVisible;

  function expandSidebar() {
    setSidebarVisible(true);
    hapticMediumImpact();
  }

  return (
    <Drawer
      drawerContent={(props) =>
        showsExpandedDrawer || !usesExpandedDrawer ? (
          <ThreadDrawerContent
            isPermanent={showsExpandedDrawer}
            showResizeHandle={showsExpandedDrawer}
            onSidebarResize={resizeSidebar}
            onSidebarResizeStart={beginSidebarResize}
            {...props}
          />
        ) : showsCollapsedRail ? (
          <CollapsedThreadSidebarRail onExpand={expandSidebar} />
        ) : null
      }
      screenOptions={{
        drawerType: usesExpandedDrawer ? "permanent" : "front",
        headerShown: false,
        swipeEnabled: false,
        sceneStyle: {
          backgroundColor: theme.background,
        },
        drawerStyle: {
          backgroundColor: theme.sidebar,
          borderRightColor: theme.border,
          borderRightWidth: usesExpandedDrawer ? 1 : 0,
          overflow: showsExpandedDrawer ? "visible" : "hidden",
          width: usesExpandedDrawer
            ? showsExpandedDrawer
              ? sidebarWidth
              : COLLAPSED_DRAWER_WIDTH + insets.left
            : Math.min(COMPACT_DRAWER_WIDTH + insets.left, width),
        },
        overlayColor: usesExpandedDrawer ? "transparent" : "rgba(0, 0, 0, 0.28)",
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: t("Threads"),
          title: appName,
        }}
      />
      {__DEV__ ? (
        <Drawer.Screen
          name="preview"
          options={{
            drawerItemStyle: { display: "none" },
            title: t("Chat Preview"),
          }}
        />
      ) : null}
    </Drawer>
  );
}

function CollapsedThreadSidebarRail({ onExpand }: { onExpand: () => void }) {
  return (
    <SafeAreaView edges={["top", "left", "bottom"]} style={styles.collapsedRail}>
      <View style={styles.collapsedRailTop}>
        <CollapsedRailButton icon="sidebarShow" label={t("Show threads")} onPress={onExpand} />
        <CollapsedRailButton icon="search" label={t("Open thread search")} onPress={onExpand} />
        <CollapsedRailButton icon="newChat" label={t("Open new chat")} onPress={onExpand} />
      </View>
      <CollapsedRailButton icon="settings" label={t("Open settings")} onPress={onExpand} />
    </SafeAreaView>
  );
}

function CollapsedRailButton({
  icon,
  label,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.collapsedRailButton, pressed && styles.pressed]}
    >
      <Icon name={icon} size={17} tintColor={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  collapsedRail: {
    alignItems: "center",
    backgroundColor: theme.sidebar,
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 10,
    paddingTop: 10,
  },
  collapsedRailButton: {
    alignItems: "center",
    borderRadius: 9,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  collapsedRailTop: {
    gap: 8,
  },
  pressed: {
    backgroundColor: theme.subtle,
    opacity: 0.72,
  },
}));
