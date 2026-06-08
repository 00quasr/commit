import { api } from "@commit/convex/api";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DropCard } from "@/components/DropCard";

function formatDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DayDetail() {
  const { dayKey } = useLocalSearchParams<{ dayKey: string }>();
  const me = useQuery(api.profiles.me);
  const drops = useQuery(api.drops.forDay, me && dayKey ? { profileId: me._id, dayKey } : "skip");

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{dayKey ? formatDayKey(dayKey) : ""}</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Text style={styles.backText}>✕</Text>
        </Pressable>
      </View>

      {drops === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.primary} />
        </View>
      ) : drops.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No drops on this day.</Text>
        </View>
      ) : (
        <FlatList
          data={drops}
          keyExtractor={(item) => item.drop._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DropCard
              drop={item.drop}
              author={item.author}
              photoUrl={item.photoUrl}
              authorHeatmap={item.authorHeatmap}
              habitColor={item.habitColor}
              habitText={item.habitText}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    color: theme.text.primary,
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  backButton: { padding: 4 },
  backText: { color: theme.text.tertiary, fontSize: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: theme.text.muted, fontSize: 14, fontFamily: fonts.sans },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
});
