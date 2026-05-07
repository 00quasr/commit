import { useOAuth, useSignIn } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "@commit/ui-tokens";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"idle" | "code-sent" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onGooglePress = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const { createdSessionId, setActive: setActiveOAuth } = await startOAuthFlow({
        redirectUrl: Linking.createURL("/(app)", { scheme: "commit" }),
      });
      if (createdSessionId && setActiveOAuth) {
        await setActiveOAuth({ session: createdSessionId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }, [startOAuthFlow]);

  const onSendCode = useCallback(async () => {
    if (!isLoaded || !signIn) return;
    setError(null);
    setBusy(true);
    try {
      const attempt = await signIn.create({ identifier: email });
      const emailFactor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!emailFactor || !("emailAddressId" in emailFactor)) {
        throw new Error("Email code strategy not enabled in Clerk dashboard");
      }
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setStage("code-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }, [email, isLoaded, signIn]);

  const onVerifyCode = useCallback(async () => {
    if (!isLoaded || !signIn || !setActive) return;
    setError(null);
    setBusy(true);
    setStage("verifying");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        throw new Error(`Sign-in incomplete: ${result.status ?? "unknown"}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
      setStage("code-sent");
    } finally {
      setBusy(false);
    }
  }, [code, isLoaded, setActive, signIn]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>commit</Text>
      <Text style={styles.subtitle}>Stop drifting. Start finishing.</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => void onGooglePress()}
        disabled={busy}
        style={({ pressed }) => [styles.button, { opacity: pressed || busy ? 0.7 : 1 }]}
      >
        <Text style={styles.buttonText}>Continue with Google</Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {stage === "idle" || stage === "verifying" ? null : null}

      {stage === "idle" && (
        <>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor="#666"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Pressable
            onPress={() => void onSendCode()}
            disabled={busy || email.length === 0}
            style={({ pressed }) => [
              styles.button,
              styles.buttonOutline,
              { opacity: pressed || busy || email.length === 0 ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.buttonOutlineText}>Email me a code</Text>
          </Pressable>
        </>
      )}

      {stage === "code-sent" && (
        <>
          <Text style={styles.hint}>Code sent to {email}</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="6-digit code"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
          />
          <Pressable
            onPress={() => void onVerifyCode()}
            disabled={busy || code.length < 6}
            style={({ pressed }) => [
              styles.button,
              { opacity: pressed || busy || code.length < 6 ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.buttonText}>Verify</Text>
          </Pressable>
        </>
      )}

      {busy && <ActivityIndicator color={colors.fg} style={{ marginTop: 16 }} />}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: {
    color: colors.fg,
    fontSize: 48,
    fontFamily: fonts.sans,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    color: "#999",
    fontSize: 16,
    marginBottom: 48,
  },
  button: {
    backgroundColor: colors.fg,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 6,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#333",
  },
  buttonOutlineText: {
    color: colors.fg,
    fontSize: 16,
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#222",
  },
  dividerText: {
    color: "#666",
    paddingHorizontal: 12,
    fontSize: 12,
  },
  input: {
    backgroundColor: "#0e0e0e",
    color: colors.fg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    fontSize: 16,
    marginVertical: 6,
  },
  hint: {
    color: "#999",
    fontSize: 14,
    marginVertical: 8,
  },
  error: {
    color: "#ff6b6b",
    marginTop: 16,
    fontSize: 14,
  },
});
