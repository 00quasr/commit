import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "@commit/ui-tokens";

WebBrowser.maybeCompleteAuthSession();

const RESEND_COOLDOWN_S = 60;

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
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"idle" | "code-sent" | "verifying">("idle");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoaded = signInLoaded && signUpLoaded;

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_S);
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

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
    if (!isLoaded || !signIn || !signUp || cooldown > 0) return;
    setError(null);
    setBusy(true);
    try {
      // Try sign-in first; fall back to sign-up for new users
      const attempt = await signIn.create({ identifier: email });
      const emailFactor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!emailFactor || !("emailAddressId" in emailFactor)) {
        throw new Error("Email code strategy not enabled in Clerk dashboard");
      }
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setIsSignUp(false);
      setStage("code-sent");
      startCooldown();
    } catch (err: unknown) {
      // Clerk returns this code when the email has no Clerk account yet
      const clerkErrors = (err as { errors?: { code: string }[] })?.errors;
      if (clerkErrors?.some((e) => e.code === "form_identifier_not_found")) {
        try {
          await signUp.create({ emailAddress: email });
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setIsSignUp(true);
          setStage("code-sent");
          startCooldown();
        } catch (signUpErr) {
          setError(signUpErr instanceof Error ? signUpErr.message : "Could not send code");
        }
      } else {
        setError(err instanceof Error ? err.message : "Could not send code");
      }
    } finally {
      setBusy(false);
    }
  }, [cooldown, email, isLoaded, signIn, signUp, startCooldown]);

  const onVerifyCode = useCallback(async () => {
    if (!isLoaded) return;
    setError(null);
    setBusy(true);
    setStage("verifying");
    try {
      if (isSignUp && signUp && setActiveSignUp) {
        const result = await signUp.attemptEmailAddressVerification({ code });
        if (result.status === "complete") {
          await setActiveSignUp({ session: result.createdSessionId });
        } else {
          throw new Error(`Sign-up incomplete: ${result.status ?? "unknown"}`);
        }
      } else if (signIn && setActiveSignIn) {
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
        if (result.status === "complete") {
          await setActiveSignIn({ session: result.createdSessionId });
        } else {
          throw new Error(`Sign-in incomplete: ${result.status ?? "unknown"}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
      setStage("code-sent");
    } finally {
      setBusy(false);
    }
  }, [code, isLoaded, isSignUp, signIn, signUp, setActiveSignIn, setActiveSignUp]);

  const sendCodeDisabled = busy || cooldown > 0;
  const sendCodeLabel = cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code";
  const emailCodeLabel = cooldown > 0 ? `Email me a code (${cooldown}s)` : "Email me a code";

  return (
    <View style={styles.root}>
      <Text style={styles.title}>commit</Text>
      <Text style={styles.subtitle}>Stop drifting. Start finishing.</Text>

      {stage === "idle" && (
        <>
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
            disabled={sendCodeDisabled || email.length === 0}
            style={({ pressed }) => [
              styles.button,
              styles.buttonOutline,
              { opacity: pressed || sendCodeDisabled || email.length === 0 ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.buttonOutlineText}>{emailCodeLabel}</Text>
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
          <Pressable
            onPress={() => void onSendCode()}
            disabled={sendCodeDisabled}
            style={({ pressed }) => [
              styles.button,
              styles.buttonOutline,
              { opacity: pressed || sendCodeDisabled ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.buttonOutlineText}>{sendCodeLabel}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setStage("idle");
              setCode("");
            }}
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              styles.buttonOutline,
              { opacity: pressed || busy ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.buttonOutlineText}>Back</Text>
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
