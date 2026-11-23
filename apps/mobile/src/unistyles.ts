import { StyleSheet } from "react-native-unistyles";

import { Colors } from "./constants/theme";

type AppThemes = typeof Colors;

declare module "react-native-unistyles" {
  export interface UnistylesThemes extends AppThemes {}
}

StyleSheet.configure({
  themes: Colors,
  settings: { adaptiveThemes: true },
});
