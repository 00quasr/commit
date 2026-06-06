import { api } from "@commit/convex/api";
import type { Id } from "@commit/convex/dataModel";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SearchIcon } from "@/components/icons";

export default function FriendsScreen() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const trimmed = debounced.replace(/^@/, "");
  const searchResults = useQuery(
    api.profiles.searchByUsernamePrefix,
    trimmed.length > 0 ? { prefix: trimmed } : "skip",
  );
  const pending = useQuery(api.friendships.listForUser, { status: "pending" });
  const accepted = useQuery(api.friendships.listForUser, { status: "accepted" });

  const incoming = useMemo(() => (pending ?? []).filter((row) => !row.iAmRequester), [pending]);
  const outgoing = useMemo(() => (pending ?? []).filter((row) => row.iAmRequester), [pending]);

  const acceptMut = useMutation(api.friendships.accept);
  const declineMut = useMutation(api.friendships.decline);
  const requestMut = useMutation(api.friendships.request);

  const searching = trimmed.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <View style={styles.topSide} />
        <Text style={styles.topTitle}>Friends</Text>
        <View style={styles.topSide}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
            hitSlop={12}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.searchWrap}>
          <View style={styles.searchIcon}>
            <SearchIcon size={16} color={theme.text.tertiary} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by username"
            placeholderTextColor={theme.text.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {searching ? (
          <SearchResults
            results={searchResults}
            onAdd={async (id) => {
              await requestMut({ otherProfileId: id });
            }}
            outgoing={outgoing.map((r) => r.profile._id)}
            accepted={accepted?.map((r) => r.profile._id) ?? []}
            incoming={incoming.map((r) => ({
              id: r.profile._id,
              friendshipId: r.friendship._id,
            }))}
            onAccept={async (fid) => {
              await acceptMut({ friendshipId: fid });
            }}
          />
        ) : (
          <>
            {incoming.length > 0 ? (
              <Section title="Requests" count={incoming.length}>
                {incoming.map((row) => (
                  <FriendRow
                    key={row.friendship._id}
                    profile={row.profile}
                    right={
                      <View style={styles.actions}>
                        <Pressable
                          onPress={() => void acceptMut({ friendshipId: row.friendship._id })}
                          style={({ pressed }) => [styles.pillPrimary, pressed && { opacity: 0.7 }]}
                        >
                          <Text style={styles.pillPrimaryText}>Accept</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void declineMut({ friendshipId: row.friendship._id })}
                          hitSlop={8}
                          style={({ pressed }) => [styles.dismiss, pressed && { opacity: 0.5 }]}
                        >
                          <Text style={styles.dismissText}>✕</Text>
                        </Pressable>
                      </View>
                    }
                  />
                ))}
              </Section>
            ) : null}

            {accepted && accepted.length > 0 ? (
              <Section title="Friends" count={accepted.length}>
                {accepted.map((row) => (
                  <FriendRow
                    key={row.friendship._id}
                    profile={row.profile}
                    onPress={() => router.push(`/u/${row.profile.username}`)}
                    right={<Text style={styles.chevron}>›</Text>}
                  />
                ))}
              </Section>
            ) : null}

            {outgoing.length > 0 ? (
              <Section title="Pending">
                {outgoing.map((row) => (
                  <FriendRow
                    key={row.friendship._id}
                    profile={row.profile}
                    right={
                      <Pressable
                        onPress={() => void declineMut({ friendshipId: row.friendship._id })}
                        style={({ pressed }) => [styles.pillGhost, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={styles.pillGhostText}>Cancel</Text>
                      </Pressable>
                    }
                  />
                ))}
              </Section>
            ) : null}

            {pending !== undefined &&
            accepted !== undefined &&
            incoming.length === 0 &&
            accepted.length === 0 &&
            outgoing.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No friends yet.</Text>
                <Text style={styles.emptyHint}>
                  Search a username above to send your first request.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {typeof count === "number" ? <Text style={styles.sectionCount}>{count}</Text> : null}
      </View>
      <View>{children}</View>
    </View>
  );
}

function FriendRow({
  profile,
  right,
  onPress,
}: {
  profile: {
    _id: Id<"profiles">;
    username: string;
    avatarUrl?: string;
  };
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.row}>
      <Avatar url={profile.avatarUrl} letter={profile.username.charAt(0)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {profile.username}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          @{profile.username}
        </Text>
      </View>
      {right}
    </View>
  );
  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [pressed && { opacity: 0.6 }]} onPress={onPress}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

function SearchResults({
  results,
  outgoing,
  accepted,
  incoming,
  onAdd,
  onAccept,
}: {
  results:
    | ReadonlyArray<{
        _id: Id<"profiles">;
        username: string;
        avatarUrl?: string;
      }>
    | undefined;
  outgoing: Id<"profiles">[];
  accepted: Id<"profiles">[];
  incoming: { id: Id<"profiles">; friendshipId: Id<"friendships"> }[];
  onAdd: (profileId: Id<"profiles">) => Promise<void>;
  onAccept: (friendshipId: Id<"friendships">) => Promise<void>;
}) {
  if (results === undefined) {
    return (
      <View style={styles.searchState}>
        <ActivityIndicator color={theme.text.tertiary} />
      </View>
    );
  }
  if (results.length === 0) {
    return (
      <View style={styles.searchState}>
        <Text style={styles.emptyHint}>No matching users.</Text>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Results</Text>
        <Text style={styles.sectionCount}>{results.length}</Text>
      </View>
      {results.map((p) => {
        const isAccepted = accepted.includes(p._id);
        const isOutgoing = outgoing.includes(p._id);
        const incomingMatch = incoming.find((r) => r.id === p._id);
        let action: React.ReactNode;
        if (isAccepted) {
          action = <Text style={styles.statusText}>Friends</Text>;
        } else if (isOutgoing) {
          action = <Text style={styles.statusText}>Pending</Text>;
        } else if (incomingMatch) {
          action = (
            <Pressable
              onPress={() => void onAccept(incomingMatch.friendshipId)}
              style={({ pressed }) => [styles.pillPrimary, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.pillPrimaryText}>Accept</Text>
            </Pressable>
          );
        } else {
          action = (
            <Pressable
              onPress={() => void onAdd(p._id)}
              style={({ pressed }) => [styles.pillPrimary, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.pillPrimaryText}>Add</Text>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={p._id}
            onPress={() => router.push(`/u/${p.username}`)}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <FriendRow profile={p} right={action} />
          </Pressable>
        );
      })}
    </View>
  );
}

function Avatar({ url, letter }: { url?: string; letter: string }) {
  if (url) {
    return <Image source={{ uri: url }} style={styles.avatar} contentFit="cover" />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarLetter}>{letter.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  topSide: { flex: 1, flexDirection: "row" },
  topTitle: {
    color: theme.text.primary,
    fontSize: 17,
    fontFamily: fonts.sans,
    fontWeight: "700",
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  closeButton: { marginLeft: "auto", padding: 6 },
  closeText: { color: theme.text.tertiary, fontSize: 16 },
  scroll: { paddingBottom: 80 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    backgroundColor: theme.blockElevated,
    borderRadius: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    color: theme.text.primary,
    fontSize: 15,
    fontFamily: fonts.sans,
    paddingVertical: 0,
  },
  clearBtn: { padding: 4, marginLeft: 6 },
  clearText: { color: theme.text.tertiary, fontSize: 13 },

  section: { paddingTop: 24, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontSize: 13,
    fontFamily: fonts.mono,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionCount: {
    color: theme.text.muted,
    fontSize: 12,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rowName: {
    color: theme.text.primary,
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  rowMeta: {
    color: theme.text.tertiary,
    fontSize: 12,
    fontFamily: fonts.mono,
    marginTop: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.blockElevated,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: {
    color: theme.text.primary,
    fontSize: 16,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  chevron: { color: theme.text.muted, fontSize: 22, marginLeft: 4 },

  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  pillPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: theme.text.primary,
    borderRadius: 999,
  },
  pillPrimaryText: {
    color: theme.bg,
    fontSize: 13,
    fontFamily: fonts.sans,
    fontWeight: "700",
  },
  pillGhost: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.borderHairline,
    borderRadius: 999,
  },
  pillGhostText: {
    color: theme.text.secondary,
    fontSize: 13,
    fontFamily: fonts.sans,
    fontWeight: "500",
  },
  dismiss: { padding: 8 },
  dismissText: { color: theme.text.muted, fontSize: 14 },
  statusText: {
    color: theme.text.tertiary,
    fontSize: 13,
    fontFamily: fonts.mono,
  },

  searchState: { paddingTop: 32, alignItems: "center" },

  emptyWrap: {
    paddingTop: 64,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  emptyTitle: {
    color: theme.text.primary,
    fontSize: 16,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  emptyHint: {
    color: theme.text.tertiary,
    fontSize: 13,
    fontFamily: fonts.sans,
    marginTop: 6,
    textAlign: "center",
  },
});
