import { api } from "@commit/convex/api";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MemoriesGrid } from "@/components/MemoriesGrid";

export default function UserProfile() {
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const username = (raw ?? "").replace(/^@/, "");
  const me = useQuery(api.profiles.me);
  const target = useQuery(api.profiles.getByUsername, username ? { username } : "skip");
  const status = useQuery(
    api.friendships.statusWith,
    target ? { otherProfileId: target._id } : "skip",
  );
  const recent = useQuery(
    api.drops.recentForProfile,
    target ? { profileId: target._id, limit: 14 } : "skip",
  );

  const sendRequest = useMutation(api.friendships.request);
  const acceptRequest = useMutation(api.friendships.accept);
  const declineRequest = useMutation(api.friendships.decline);

  const [busy, setBusy] = useState(false);

  if (target === undefined || me === undefined) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={["top"]}>
        <ActivityIndicator color={theme.text.primary} />
      </SafeAreaView>
    );
  }

  if (target === null) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <TopBar />
        <View style={[styles.center, { flex: 1, paddingHorizontal: 32 }]}>
          <Text style={styles.notFoundTitle}>User not found</Text>
          <Text style={styles.notFoundHint}>No one with the handle @{username}.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSelf = me?._id === target._id;

  const onPrimary = async () => {
    if (!status || busy) return;
    setBusy(true);
    try {
      if (status.status === "none") {
        await sendRequest({ otherProfileId: target._id });
      } else if (status.status === "pending_outgoing" && status.friendshipId) {
        await declineRequest({ friendshipId: status.friendshipId });
      } else if (status.status === "accepted" && status.friendshipId) {
        await declineRequest({ friendshipId: status.friendshipId });
      }
    } finally {
      setBusy(false);
    }
  };

  const onAccept = async () => {
    if (!status?.friendshipId || busy) return;
    setBusy(true);
    try {
      await acceptRequest({ friendshipId: status.friendshipId });
    } finally {
      setBusy(false);
    }
  };

  const onDecline = async () => {
    if (!status?.friendshipId || busy) return;
    setBusy(true);
    try {
      await declineRequest({ friendshipId: status.friendshipId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <TopBar showSettings={me?._id === target._id} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          {target.avatarUrl ? (
            <Image source={{ uri: target.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{target.username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.username}>{target.username}</Text>
            {isSelf ? (
              <Text style={styles.tz}>{target.timezone}</Text>
            ) : (
              <Text style={styles.tz}>@{target.username}</Text>
            )}
          </View>
        </View>

        {!isSelf && status && status.status !== "self" ? (
          <View style={styles.actionsRow}>
            {status.status === "pending_incoming" ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionPrimary,
                    pressed && { opacity: 0.7 },
                    busy && { opacity: 0.4 },
                  ]}
                  onPress={() => void onAccept()}
                  disabled={busy}
                >
                  <Text style={styles.actionPrimaryText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionSecondary,
                    pressed && { opacity: 0.7 },
                    busy && { opacity: 0.4 },
                  ]}
                  onPress={() => void onDecline()}
                  disabled={busy}
                >
                  <Text style={styles.actionSecondaryText}>Decline</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  status.status === "none" ? styles.actionPrimary : styles.actionSecondary,
                  pressed && { opacity: 0.7 },
                  busy && { opacity: 0.4 },
                ]}
                onPress={() => void onPrimary()}
                disabled={busy}
              >
                <Text
                  style={
                    status.status === "none" ? styles.actionPrimaryText : styles.actionSecondaryText
                  }
                >
                  {status.status === "none"
                    ? "Add friend"
                    : status.status === "pending_outgoing"
                      ? "Requested · Cancel"
                      : "Friends ✓"}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {recent === undefined ? (
          <ActivityIndicator color={theme.text.primary} style={{ marginTop: 16 }} />
        ) : isSelf ? (
          <MemoriesGrid
            drops={recent}
            timezone={target.timezone}
            onViewAll={() => router.push("/(app)/memories")}
            onViewArchive={() => router.push("/(app)/archived-habits")}
            onTileTap={(dayKey) => router.push(`/(app)/day/${dayKey}`)}
          />
        ) : recent.length === 0 ? (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyText}>No drops visible yet.</Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            <Text style={styles.sectionLabel}>RECENT DROPS</Text>
            {recent.map((item) => (
              <Pressable
                key={item.drop._id}
                onPress={() => router.push(`/(app)/day/${item.drop.dayKey}`)}
                style={({ pressed }) => [styles.recentRow, pressed && { opacity: 0.7 }]}
              >
                {item.photoUrl ? (
                  <Image
                    source={{ uri: item.photoUrl }}
                    style={styles.recentThumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.recentThumb, styles.recentThumbFallback]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={styles.recentCaption}>
                    {item.drop.caption || item.drop.dayKey}
                  </Text>
                  <Text style={styles.recentMeta}>{item.drop.dayKey}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TopBar({ showSettings = false }: { showSettings?: boolean }) {
  return (
    <View style={styles.topBar}>
      {showSettings ? (
        <Pressable
          onPress={() => router.push("/(app)/settings")}
          style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.6 }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Text style={styles.settingsGlyph}>⚙</Text>
        </Pressable>
      ) : (
        <View style={styles.settingsButton} />
      )}
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
        hitSlop={12}
      >
        <Text style={styles.backText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: { padding: 4 },
  backText: { color: theme.text.tertiary, fontSize: 18 },
  settingsButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsGlyph: { color: theme.text.secondary, fontSize: 20 },
  scroll: { paddingTop: 8, paddingBottom: 80 },
  notFoundTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  notFoundHint: {
    color: theme.text.tertiary,
    fontSize: 14,
    fontFamily: fonts.sans,
    marginTop: 6,
    textAlign: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.blockElevated,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: {
    color: theme.text.primary,
    fontSize: 28,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  headerText: { flex: 1 },
  username: {
    color: theme.text.primary,
    fontSize: 22,
    fontFamily: fonts.sans,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  tz: {
    color: theme.text.tertiary,
    fontSize: 13,
    fontFamily: fonts.mono,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionPrimary: {
    flex: 1,
    backgroundColor: theme.text.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  actionPrimaryText: {
    color: theme.bg,
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  actionSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.borderHairline,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  actionSecondaryText: {
    color: theme.text.secondary,
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: "500",
  },
  sectionLabel: {
    color: theme.text.muted,
    fontSize: 11,
    fontFamily: fonts.mono,
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  recentList: { paddingTop: 8 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  recentThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.blockElevated,
  },
  recentThumbFallback: { backgroundColor: theme.blockElevated },
  recentCaption: {
    color: theme.text.primary,
    fontSize: 14,
    fontFamily: fonts.sans,
  },
  recentMeta: {
    color: theme.text.tertiary,
    fontSize: 11,
    fontFamily: fonts.mono,
    marginTop: 2,
  },
  emptyRecent: { paddingHorizontal: 20, paddingTop: 24, alignItems: "center" },
  emptyText: {
    color: theme.text.muted,
    fontSize: 13,
    fontFamily: fonts.sans,
  },
});
