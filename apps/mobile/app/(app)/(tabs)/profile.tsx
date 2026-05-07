import { useAuth, useUser } from "@clerk/clerk-expo";
import { colors, fonts } from "@commit/ui-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>{user?.username ?? user?.firstName ?? ""}</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.placeholder}>stats + heatmap in commit 6</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.6 }]}
        onPress={() => void signOut()}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
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
  signOut: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: 24, marginBottom: 32 },
  signOutText: { color: "#666", fontSize: 14, fontFamily: fonts.sans },
});
