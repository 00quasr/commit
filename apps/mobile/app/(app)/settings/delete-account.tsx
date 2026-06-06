import { useAuth } from "@clerk/clerk-expo";
import { api } from "@commit/convex/api";
import { fonts } from "@commit/ui-tokens";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { accountDeletion } from "@/lib/account-deletion";

const DELETED_ITEMS: readonly string[] = [
  "Your profile, username, and avatar",
  "All habits and their history",
  "All drops, photos, and voice notes",
  "All reactions and views you sent",
  "Friendships (both directions)",
  "Streaks, stats, and activity events",
  "Your sign-in account",
];

export default function DeleteAccount() {
  const { signOut } = useAuth();
  const deleteAccount = useAction(api.accounts.deleteMyAccount);
  const [busy, setBusy] = useState(false);

  const onDelete = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    // Suppress the auto-upsert in (app)/_layout.tsx, which would otherwise
    // re-create the profile in the gap between the purge mutation succeeding
    // and signOut clearing the cached Clerk session.
    accountDeletion.inProgress = true;
    try {
      await deleteAccount();
      try {
        await signOut();
      } catch {
        // signOut errors after a successful delete are not actionable.
      }
      router.replace("/(auth)/sign-in");
    } catch (err) {
      setBusy(false);
      // Re-allow auto-upsert on failure so the app stays usable on retry.
      accountDeletion.inProgress = false;
      let message = "Could not delete your account. Please try again.";
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string } | string | undefined;
        if (typeof data === "object" && data?.message) message = data.message;
        else if (typeof data === "string") message = data;
      } else if (err instanceof Error) {
        message = err.message;
      }
      Alert.alert("Delete failed", message);
    }
  }, [busy, deleteAccount, signOut]);

  const onConfirm = useCallback(() => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account and all of your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void onDelete() },
      ],
    );
  }, [onDelete]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          disabled={busy}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Text style={styles.backText}>‹ Settings</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Delete account</Text>
        <Text style={styles.intro}>
          Deleting your account is permanent. We will erase the following from our servers
          immediately:
        </Text>
        <View style={styles.list}>
          {DELETED_ITEMS.map((item) => (
            <View key={item} style={styles.listItem}>
              <Text style={styles.listBullet}>•</Text>
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            This cannot be undone. You will be signed out and returned to the sign-in screen.
          </Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          onPress={onConfirm}
          disabled={busy}
          style={({ pressed }) => [styles.deleteButton, (pressed || busy) && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
        >
          {busy ? (
            <ActivityIndicator color={theme.bg} />
          ) : (
            <Text style={styles.deleteButtonText}>Delete my account</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const DESTRUCTIVE = "#ff453a";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: { padding: 4, alignSelf: "flex-start" },
  backText: { color: theme.text.tertiary, fontSize: 15, fontFamily: fonts.sans },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    color: theme.text.primary,
    fontSize: 28,
    fontFamily: fonts.sans,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  intro: {
    color: theme.text.secondary,
    fontSize: 15,
    fontFamily: fonts.sans,
    lineHeight: 22,
    marginBottom: 20,
  },
  list: { marginBottom: 24 },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
  },
  listBullet: {
    color: theme.text.muted,
    fontSize: 15,
    fontFamily: fonts.sans,
    lineHeight: 22,
    width: 12,
    textAlign: "center",
  },
  listText: {
    flex: 1,
    color: theme.text.primary,
    fontSize: 15,
    fontFamily: fonts.sans,
    lineHeight: 22,
  },
  warning: {
    backgroundColor: "rgba(255, 69, 58, 0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 69, 58, 0.35)",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  warningText: {
    color: DESTRUCTIVE,
    fontSize: 13,
    fontFamily: fonts.sans,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.divide,
  },
  deleteButton: {
    backgroundColor: DESTRUCTIVE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
});
