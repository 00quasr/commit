import { colors, fonts } from "@commit/ui-tokens";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Feed() {
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
        <Text style={styles.subtitle}>Locked until you drop today</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.placeholder}>coming in commit 5</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  title: { color: colors.fg, fontSize: 36, fontFamily: fonts.sans, fontWeight: "700" },
  subtitle: { color: "#666", fontSize: 14, fontFamily: fonts.sans, marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholder: { color: "#444", fontSize: 14, fontFamily: fonts.mono },
});
