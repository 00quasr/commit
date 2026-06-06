import { api } from "@commit/convex/api";
import type { Id } from "@commit/convex/dataModel";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
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
  // Only the self view shows the MemoriesGrid — friend profiles intentionally
  // hide drops since the feed already surfaces them.
  const isSelfQuery = me && target && me._id === target._id;
  const recent = useQuery(
    api.drops.recentForProfile,
    isSelfQuery ? { profileId: target._id, limit: 14 } : "skip",
  );

  const sendRequest = useMutation(api.friendships.request);
  const acceptRequest = useMutation(api.friendships.accept);
  const declineRequest = useMutation(api.friendships.decline);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const updateAvatar = useMutation(api.profiles.updateAvatar);

  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropData, setCropData] = useState<{
    uri: string;
    width: number;
    height: number;
  } | null>(null);
  // Pre-fetched upload URL that starts as soon as the image is picked,
  // so the Convex roundtrip is hidden behind the user's crop adjustment time.
  const uploadUrlRef = useRef<Promise<string> | null>(null);

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

  const onChangeAvatar = async () => {
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== "granted") {
      Alert.alert("Permission required", "Allow access to your photos to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // Start fetching the upload URL immediately so the roundtrip runs in the
    // background while the user adjusts the crop.
    uploadUrlRef.current = generateUploadUrl();
    setCropData({ uri: asset.uri, width: asset.width, height: asset.height });
  };

  const onCropCancel = () => {
    uploadUrlRef.current = null;
    setCropData(null);
  };

  const onCropConfirm = async (croppedUri: string) => {
    setCropData(null);
    setUploadingAvatar(true);
    try {
      const uploadUrl = await (uploadUrlRef.current ?? generateUploadUrl());
      uploadUrlRef.current = null;
      const resp = await fetch(croppedUri);
      const blob = await resp.blob();
      const uploadResp = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      if (!uploadResp.ok) throw new Error(`Upload failed: ${uploadResp.status}`);
      const { storageId } = (await uploadResp.json()) as { storageId: Id<"_storage"> };
      await updateAvatar({ storageId });
    } catch {
      Alert.alert("Error", "Could not update profile picture. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onPrimary = async () => {
    if (!status || busy) return;
    if (status.status === "accepted" && status.friendshipId) {
      const friendshipId = status.friendshipId;
      Alert.alert(
        "Remove friend?",
        `You and ${target.username} will no longer see each other's friends-only drops.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              setBusy(true);
              declineRequest({ friendshipId }).finally(() => setBusy(false));
            },
          },
        ],
      );
      return;
    }
    setBusy(true);
    try {
      if (status.status === "none") {
        await sendRequest({ otherProfileId: target._id });
      } else if (status.status === "pending_outgoing" && status.friendshipId) {
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

  const avatarContent = target.avatarUrl ? (
    <Image source={{ uri: target.avatarUrl }} style={styles.avatar} contentFit="cover" />
  ) : (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarLetter}>{target.username.charAt(0).toUpperCase()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <TopBar showSettings={me?._id === target._id} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          {isSelf ? (
            <Pressable
              onPress={() => void onChangeAvatar()}
              disabled={uploadingAvatar}
              style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
            >
              {uploadingAvatar ? (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <ActivityIndicator color={theme.text.primary} />
                </View>
              ) : (
                avatarContent
              )}
            </Pressable>
          ) : (
            avatarContent
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

        {isSelf ? (
          recent === undefined ? (
            <ActivityIndicator color={theme.text.primary} style={{ marginTop: 16 }} />
          ) : (
            <MemoriesGrid
              drops={recent}
              timezone={target.timezone}
              onViewAll={() => router.push("/(app)/memories")}
              onViewArchive={() => router.push("/(app)/archived-habits")}
              onTileTap={(dayKey) => router.push(`/(app)/day/${dayKey}`)}
            />
          )
        ) : null}
      </ScrollView>

      {cropData && (
        <AvatarCropModal
          visible={true}
          uri={cropData.uri}
          imageWidth={cropData.width}
          imageHeight={cropData.height}
          onCancel={onCropCancel}
          onConfirm={(uri) => void onCropConfirm(uri)}
        />
      )}
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
  avatarWrap: {
    width: 64,
    height: 64,
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
});
