import { useAuth } from "@clerk/clerk-expo";
import { api } from "@commit/convex/api";
import { FlashList } from "@shopify/flash-list";
import { fonts } from "@commit/ui-tokens";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView, KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { PRIVACY_URL, TERMS_URL } from "@/lib/constants";
import { IANA_TIMEZONES } from "@/lib/timezones";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const USERNAME_HELP = "3–20 lowercase letters, numbers, or underscores.";

function getDeviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getSupportedTimezones(): readonly string[] {
  // Prefer the runtime list when available (Node, V8, modern Hermes). Hermes on
  // iOS RN 0.81 does not expose this, so fall back to our bundled IANA list.
  const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intlAny.supportedValuesOf === "function") {
    try {
      const runtime = intlAny.supportedValuesOf("timeZone");
      if (runtime.length > 0) return runtime;
    } catch {
      // fall through
    }
  }
  return IANA_TIMEZONES;
}

function parseTimezone(tz: string): { city: string; region: string } {
  if (tz === "UTC") return { city: "UTC", region: "" };
  const parts = tz.split("/");
  const last = parts[parts.length - 1] ?? tz;
  const head = parts[0] ?? "";
  const city = last.replace(/_/g, " ");
  const region =
    parts.length > 2 ? `${head} · ${parts.slice(1, -1).join(" · ").replace(/_/g, " ")}` : head;
  return { city, region };
}

const offsetCache = new Map<string, string>();
function getTimezoneOffset(tz: string): string {
  const cached = offsetCache.get(tz);
  if (cached !== undefined) return cached;
  let result = "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    result = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    // Some engines/zones may throw; cache empty string so we don't retry.
  }
  offsetCache.set(tz, result);
  return result;
}

export default function Settings() {
  const { signOut } = useAuth();
  const me = useQuery(api.profiles.me);
  const upsertProfile = useMutation(api.profiles.upsert);

  const [editingUsername, setEditingUsername] = useState(false);
  const [pickingTimezone, setPickingTimezone] = useState(false);

  const close = useCallback(() => router.back(), []);

  const onPrivacy = useCallback(() => {
    void WebBrowser.openBrowserAsync(PRIVACY_URL);
  }, []);
  const onTerms = useCallback(() => {
    void WebBrowser.openBrowserAsync(TERMS_URL);
  }, []);
  const onDeleteAccount = useCallback(() => {
    router.push("/(app)/settings/delete-account");
  }, []);
  const onSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // sign-out errors are not actionable from here.
    }
  }, [signOut]);

  if (me === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.text.primary} />
      </View>
    );
  }
  if (me === null) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.placeholder}>No profile.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Settings</Text>
        <Pressable
          onPress={close}
          style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Account">
          <Row label="Username" value={me.username} onPress={() => setEditingUsername(true)} />
          <Row label="Timezone" value={me.timezone} onPress={() => setPickingTimezone(true)} />
        </Section>

        <Section title="Legal">
          <Row label="Privacy Policy" onPress={onPrivacy} />
          <Row label="Terms of Service" onPress={onTerms} />
        </Section>

        <Section title="Account actions">
          <Row label="Delete account" onPress={onDeleteAccount} destructive />
          <Row label="Sign out" onPress={() => void onSignOut()} destructive />
        </Section>
      </ScrollView>

      <UsernameEditor
        visible={editingUsername}
        current={me.username}
        currentTimezone={me.timezone}
        currentAvatarUrl={me.avatarUrl}
        onClose={() => setEditingUsername(false)}
        upsert={upsertProfile}
      />

      <TimezonePicker
        visible={pickingTimezone}
        current={me.timezone}
        currentUsername={me.username}
        currentAvatarUrl={me.avatarUrl}
        onClose={() => setPickingTimezone(false)}
        upsert={upsertProfile}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  destructive,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      <View style={styles.rowRight}>
        {value !== undefined && <Text style={styles.rowValue}>{value}</Text>}
        {!destructive && <Text style={styles.rowChevron}>›</Text>}
      </View>
    </Pressable>
  );
}

type UpsertFn = (args: {
  username: string;
  avatarUrl?: string;
  timezone: string;
}) => Promise<unknown>;

function UsernameEditor({
  visible,
  current,
  currentTimezone,
  currentAvatarUrl,
  onClose,
  upsert,
}: {
  visible: boolean;
  current: string;
  currentTimezone: string;
  currentAvatarUrl: string | undefined;
  onClose: () => void;
  upsert: UpsertFn;
}) {
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset local state whenever the editor is reopened from the parent.
  const onShow = useCallback(() => {
    setValue(current);
    setError(null);
    setBusy(false);
  }, [current]);

  const onSave = useCallback(async () => {
    const next = value.trim().toLowerCase();
    if (next === current) {
      onClose();
      return;
    }
    if (!USERNAME_PATTERN.test(next)) {
      setError(USERNAME_HELP);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsert({ username: next, avatarUrl: currentAvatarUrl, timezone: currentTimezone });
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { code?: string; message?: string } | string | undefined;
        if (typeof data === "object" && data?.message) {
          setError(data.message);
        } else if (typeof data === "string") {
          setError(data);
        } else {
          setError("Could not save username");
        }
      } else {
        setError(err instanceof Error ? err.message : "Could not save username");
      }
    } finally {
      setBusy(false);
    }
  }, [value, current, currentAvatarUrl, currentTimezone, upsert, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={onShow}
    >
      {/* RN Modal renders in a separate hierarchy on iOS; the root KeyboardProvider
          doesn't reach it, so re-provide one here for KeyboardAvoidingView to work. */}
      <KeyboardProvider>
        <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit username</Text>
            <TextInput
              value={value}
              onChangeText={(t) => {
                setValue(t);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              maxLength={20}
              placeholder="username"
              placeholderTextColor={theme.text.muted}
              style={styles.modalInput}
            />
            <Text style={error ? styles.modalError : styles.modalHelp}>
              {error ?? USERNAME_HELP}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={onClose}
                disabled={busy}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonGhost,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.modalButtonGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void onSave()}
                disabled={busy || value.trim().length === 0}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  (pressed || busy || value.trim().length === 0) && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.modalButtonPrimaryText}>{busy ? "Saving…" : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </KeyboardProvider>
    </Modal>
  );
}

function TimezonePicker({
  visible,
  current,
  currentUsername,
  currentAvatarUrl,
  onClose,
  upsert,
}: {
  visible: boolean;
  current: string;
  currentUsername: string;
  currentAvatarUrl: string | undefined;
  onClose: () => void;
  upsert: UpsertFn;
}) {
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const onShow = useCallback(() => {
    setSearch("");
    setBusy(false);
  }, []);

  const allZones = useMemo(() => {
    // Dedupe + sort by city name (most intuitive ordering for the user). The
    // user's current zone and device zone are forced in even if not in the
    // bundled list, so they always have a row to identify.
    const base = new Set<string>(getSupportedTimezones());
    base.add(current);
    base.add(getDeviceTimezone());
    return Array.from(base).sort((a, b) =>
      parseTimezone(a).city.localeCompare(parseTimezone(b).city),
    );
  }, [current]);

  const visibleZones = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allZones;
    return allZones.filter((z) => {
      const { city, region } = parseTimezone(z);
      return (
        city.toLowerCase().includes(q) ||
        region.toLowerCase().includes(q) ||
        z.toLowerCase().includes(q)
      );
    });
  }, [allZones, search]);

  const save = useCallback(
    async (tz: string) => {
      if (tz === current) {
        onClose();
        return;
      }
      setBusy(true);
      try {
        await upsert({
          username: currentUsername,
          avatarUrl: currentAvatarUrl,
          timezone: tz,
        });
        onClose();
      } catch {
        // Surfacing tz errors here is rare (no validation on backend); swallow + close.
        onClose();
      } finally {
        setBusy(false);
      }
    },
    [current, currentUsername, currentAvatarUrl, upsert, onClose],
  );

  const onUseDevice = useCallback(() => {
    void save(getDeviceTimezone());
  }, [save]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={onShow}
    >
      <SafeAreaView style={styles.tzRoot} edges={["top"]}>
        <View style={styles.tzHeader}>
          <Text style={styles.modalTitle}>Timezone</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
            hitSlop={12}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onUseDevice}
          disabled={busy}
          style={({ pressed }) => [styles.tzDeviceRow, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.tzDeviceLabel}>Use device timezone</Text>
          <Text style={styles.tzDeviceValue}>{getDeviceTimezone()}</Text>
        </Pressable>

        <TextInput
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Search city or region"
          placeholderTextColor={theme.text.muted}
          style={styles.tzSearch}
        />

        <FlashList
          data={visibleZones}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isCurrent = item === current;
            const { city, region } = parseTimezone(item);
            const offset = getTimezoneOffset(item);
            return (
              <Pressable
                onPress={() => void save(item)}
                disabled={busy}
                style={({ pressed }) => [styles.tzRow, pressed && { opacity: 0.6 }]}
              >
                <View style={styles.tzRowLeft}>
                  <Text style={styles.tzCity}>{city}</Text>
                  {region.length > 0 && <Text style={styles.tzRegion}>{region}</Text>}
                </View>
                <View style={styles.tzRowRight}>
                  {offset.length > 0 && <Text style={styles.tzOffset}>{offset}</Text>}
                  {isCurrent && <Text style={styles.tzRowCheck}>✓</Text>}
                </View>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: "center", justifyContent: "center" },
  placeholder: { color: theme.text.muted, fontSize: 14, fontFamily: fonts.mono },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    color: theme.text.primary,
    fontSize: 22,
    fontFamily: fonts.sans,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  closeButton: { padding: 4 },
  closeText: { color: theme.text.tertiary, fontSize: 18 },
  scroll: { paddingTop: 16, paddingBottom: 80 },

  section: { marginBottom: 28 },
  sectionTitle: {
    color: theme.text.tertiary,
    fontSize: 11,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.divide,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.divide,
  },
  rowLabel: {
    color: theme.text.primary,
    fontSize: 16,
    fontFamily: fonts.sans,
  },
  rowLabelDestructive: { color: theme.text.secondary },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  rowValue: {
    color: theme.text.tertiary,
    fontSize: 14,
    fontFamily: fonts.mono,
    flexShrink: 1,
    textAlign: "right",
  },
  rowChevron: { color: theme.text.muted, fontSize: 18 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: theme.bg,
    borderRadius: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.divide,
  },
  modalTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontFamily: fonts.sans,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: theme.blockElevated,
    color: theme.text.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.divide,
    fontSize: 16,
    fontFamily: fonts.mono,
  },
  modalHelp: {
    color: theme.text.muted,
    fontSize: 12,
    fontFamily: fonts.mono,
    marginTop: 8,
  },
  modalError: {
    color: "#ff6b6b",
    fontSize: 12,
    fontFamily: fonts.mono,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalButtonGhost: {
    backgroundColor: "transparent",
  },
  modalButtonGhostText: {
    color: theme.text.secondary,
    fontSize: 15,
    fontFamily: fonts.sans,
  },
  modalButtonPrimary: {
    backgroundColor: theme.text.primary,
  },
  modalButtonPrimaryText: {
    color: theme.bg,
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },

  tzRoot: { flex: 1, backgroundColor: theme.bg },
  tzHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tzDeviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: theme.blockElevated,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  tzDeviceLabel: {
    color: theme.text.primary,
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  tzDeviceValue: {
    color: theme.text.tertiary,
    fontSize: 13,
    fontFamily: fonts.mono,
  },
  tzSearch: {
    backgroundColor: theme.blockElevated,
    color: theme.text.primary,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.divide,
    fontSize: 15,
    fontFamily: fonts.sans,
  },
  tzRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.divide,
    gap: 12,
  },
  tzRowLeft: { flex: 1, flexShrink: 1 },
  tzRowRight: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 },
  tzCity: {
    color: theme.text.primary,
    fontSize: 16,
    fontFamily: fonts.sans,
    fontWeight: "500",
  },
  tzRegion: {
    color: theme.text.muted,
    fontSize: 12,
    fontFamily: fonts.mono,
    marginTop: 2,
  },
  tzOffset: {
    color: theme.text.tertiary,
    fontSize: 13,
    fontFamily: fonts.mono,
  },
  tzRowCheck: {
    color: theme.text.primary,
    fontSize: 16,
    fontFamily: fonts.sans,
    fontWeight: "700",
  },
});
