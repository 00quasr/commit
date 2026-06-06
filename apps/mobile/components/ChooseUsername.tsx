import { useUser } from "@clerk/clerk-expo";
import { api } from "@commit/convex/api";
import { fonts } from "@commit/ui-tokens";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const USERNAME_HELP = "3–20 lowercase letters, numbers, or underscores.";

function sanitizeSuggestion(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

/**
 * First-run username picker. Rendered inline by (app)/_layout.tsx when the
 * caller is Clerk-authenticated but has no Convex profile yet. On successful
 * upsert the profile subscription flips from null to a doc and the parent
 * layout transitions into the main app Stack.
 */
export function ChooseUsername() {
  const { user } = useUser();
  const upsertProfile = useMutation(api.profiles.upsert);

  const suggestion = useMemo(() => {
    return (
      sanitizeSuggestion(user?.username) ||
      sanitizeSuggestion(user?.firstName) ||
      sanitizeSuggestion(user?.emailAddresses[0]?.emailAddress.split("@")[0]) ||
      ""
    );
  }, [user]);

  const [value, setValue] = useState(suggestion);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const trimmed = value.trim().toLowerCase();
  const formatValid = USERNAME_PATTERN.test(trimmed);

  const availability = useQuery(
    api.profiles.usernameAvailable,
    formatValid ? { username: trimmed } : "skip",
  );

  const onContinue = useCallback(async () => {
    if (!formatValid || availability !== true || busy) return;
    setBusy(true);
    setServerError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await upsertProfile({
        username: trimmed,
        avatarUrl: user?.imageUrl || undefined,
        timezone,
      });
      // No navigation here — the parent layout swaps to the main Stack as
      // soon as profiles.me transitions to a non-null doc.
    } catch (err) {
      setBusy(false);
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string } | string | undefined;
        if (typeof data === "object" && data?.message) setServerError(data.message);
        else if (typeof data === "string") setServerError(data);
        else setServerError("Could not save username");
      } else {
        setServerError(err instanceof Error ? err.message : "Could not save username");
      }
    }
  }, [availability, busy, formatValid, trimmed, upsertProfile, user]);

  const statusText: { text: string; tone: "neutral" | "good" | "bad" } = (() => {
    if (serverError) return { text: serverError, tone: "bad" };
    if (trimmed.length === 0) return { text: USERNAME_HELP, tone: "neutral" };
    if (!formatValid) return { text: USERNAME_HELP, tone: "bad" };
    if (availability === undefined) return { text: "Checking…", tone: "neutral" };
    if (availability === false) return { text: "Already taken", tone: "bad" };
    return { text: "Available", tone: "good" };
  })();

  const continueDisabled = !formatValid || availability !== true || busy;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.body}>
          <Text style={styles.title}>Choose your username</Text>
          <Text style={styles.copy}>
            This is how friends will find you. You can change it later in Settings.
          </Text>

          <View style={styles.inputRow}>
            <Text style={styles.at}>@</Text>
            <TextInput
              value={value}
              onChangeText={(t) => {
                setValue(t);
                if (serverError) setServerError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              maxLength={20}
              placeholder="username"
              placeholderTextColor={theme.text.muted}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={() => void onContinue()}
            />
          </View>

          <Text
            style={[
              styles.status,
              statusText.tone === "good" && styles.statusGood,
              statusText.tone === "bad" && styles.statusBad,
            ]}
          >
            {statusText.text}
          </Text>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() => void onContinue()}
            disabled={continueDisabled}
            style={({ pressed }) => [
              styles.continueButton,
              (pressed || continueDisabled) && { opacity: 0.5 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            {busy ? (
              <ActivityIndicator color={theme.bg} />
            ) : (
              <Text style={styles.continueText}>Continue</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const GOOD = "#5BD27D";
const BAD = "#ff6b6b";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
  title: {
    color: theme.text.primary,
    fontSize: 28,
    fontFamily: fonts.sans,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  copy: {
    color: theme.text.secondary,
    fontSize: 15,
    fontFamily: fonts.sans,
    lineHeight: 22,
    marginBottom: 32,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.blockElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.divide,
  },
  at: {
    color: theme.text.tertiary,
    fontSize: 18,
    fontFamily: fonts.mono,
  },
  input: {
    flex: 1,
    color: theme.text.primary,
    fontSize: 18,
    fontFamily: fonts.mono,
    paddingVertical: 0,
  },
  status: {
    color: theme.text.muted,
    fontSize: 13,
    fontFamily: fonts.mono,
    marginTop: 10,
    minHeight: 18,
  },
  statusGood: { color: GOOD },
  statusBad: { color: BAD },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  continueButton: {
    backgroundColor: theme.text.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    color: theme.bg,
    fontSize: 16,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
});
