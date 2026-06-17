import type { Doc } from "@commit/convex/dataModel";
import { colors, fonts } from "@commit/ui-tokens";
import { type FlashListRef } from "@shopify/flash-list";
import { Image } from "expo-image";
import { memo, useRef, type RefObject } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { FeedMiniHeatmap } from "./FeedMiniHeatmap";

export interface DropCardProps {
  drop: Doc<"drops">;
  // Resolved, client-safe profile (no clerkUserId/avatarFileId) — what the
  // feed/day/habit queries return via resolveProfile (COM-136).
  author: Omit<Doc<"profiles">, "clerkUserId" | "avatarFileId">;
  photoUrl: string | null;
  authorHeatmap: Array<{
    dayKey: string;
    total: number;
    habits: { habitId: string; color: string }[];
  }>;
  habitColor?: string | null;
  habitText?: string | null;
  // Typed loosely (any element type) so any screen's FlashList ref can be handed
  // in for gesture coordination; the value is only forwarded to RNGH's
  // blocksExternalGesture, never read as a typed list here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scrollRef?: RefObject<FlashListRef<any> | null>;
  // Drives expo-image's load priority so cards near the top of the feed win
  // the network/decode queue over ones further down — keeps top-down lazy
  // loading invisible instead of photos popping in out of scroll order.
  imagePriority?: "low" | "normal" | "high";
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const OVERLAY_PAD = 8;
const STRONG_FLICK = 500; // px/s (RNGH velocity units)

// Softer spring: glides to corner rather than snapping hard
const SPRING = { damping: 18, stiffness: 200, mass: 0.9 };

// corner index: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
function cornerPos(
  corner: number,
  pw: number,
  ph: number,
  ow: number,
  oh: number,
): { x: number; y: number } {
  "worklet";
  return {
    x: corner % 2 === 0 ? OVERLAY_PAD : pw - ow - OVERLAY_PAD,
    y: corner < 2 ? OVERLAY_PAD : ph - oh - OVERLAY_PAD,
  };
}

function resolveCorner(
  cx: number,
  cy: number,
  vx: number,
  vy: number,
  pw: number,
  ph: number,
): number {
  "worklet";
  const flickX = Math.abs(vx) > STRONG_FLICK;
  const flickY = Math.abs(vy) > STRONG_FLICK;
  const goRight = flickX ? vx > 0 : cx >= pw / 2;
  const goDown = flickY ? vy > 0 : cy >= ph / 2;
  return (goDown ? 2 : 0) + (goRight ? 1 : 0);
}

export const DropCard = memo(function DropCard({
  drop,
  author,
  photoUrl,
  authorHeatmap,
  habitText,
  scrollRef,
  imagePriority = "normal",
}: DropCardProps) {
  const posX = useSharedValue(0);
  const posY = useSharedValue(0);
  const overlayOpacity = useSharedValue(0); // hidden until measured + positioned
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const committedCorner = useSharedValue(3); // bottom-right
  // Shared values for pan handler worklets (UI-thread reads)
  const photoW = useSharedValue(0);
  const photoH = useSharedValue(0);
  const overlayW = useSharedValue(0);
  const overlayH = useSharedValue(0);
  // Plain refs for maybeInit (JS-thread reads — shared values not reliable here)
  const photoSizeRef = useRef({ w: 0, h: 0 });
  const overlaySizeRef = useRef({ w: 0, h: 0 });
  const initializedRef = useRef(false);

  function maybeInit() {
    if (initializedRef.current) return;
    const { w: pw, h: ph } = photoSizeRef.current;
    const { w: ow, h: oh } = overlaySizeRef.current;
    if (pw === 0 || ow === 0) return;
    initializedRef.current = true;
    const tx = pw - ow - OVERLAY_PAD;
    const ty = ph - oh - OVERLAY_PAD;
    runOnUI(() => {
      "worklet";
      posX.value = tx; // instant positioning
      posY.value = ty;
      overlayOpacity.value = withTiming(1, { duration: 150 });
    })();
  }

  const panBase = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      "worklet";
      cancelAnimation(posX);
      cancelAnimation(posY);
      startX.value = posX.value;
      startY.value = posY.value;
    })
    .onUpdate((e) => {
      "worklet";
      posX.value = startX.value + e.translationX;
      posY.value = startY.value + e.translationY;
    })
    .onEnd((e) => {
      "worklet";
      const ow = overlayW.value;
      const oh = overlayH.value;
      const pw = photoW.value;
      const ph = photoH.value;
      const cx = posX.value + ow / 2;
      const cy = posY.value + oh / 2;
      const corner = resolveCorner(cx, cy, e.velocityX, e.velocityY, pw, ph);
      committedCorner.value = corner;
      const target = cornerPos(corner, pw, ph, ow, oh);
      posX.value = withSpring(target.x, SPRING);
      posY.value = withSpring(target.y, SPRING);
    })
    .onFinalize((_e, success) => {
      "worklet";
      if (!success) {
        const target = cornerPos(
          committedCorner.value,
          photoW.value,
          photoH.value,
          overlayW.value,
          overlayH.value,
        );
        posX.value = withSpring(target.x, SPRING);
        posY.value = withSpring(target.y, SPRING);
      }
    });

  const pan = scrollRef
    ? panBase.blocksExternalGesture(
        scrollRef as unknown as Parameters<typeof panBase.blocksExternalGesture>[0],
      )
    : panBase;

  const animStyle = useAnimatedStyle(() => ({
    left: posX.value,
    top: posY.value,
    opacity: overlayOpacity.value,
  }));

  const statsPanel = (
    <View style={styles.statsPanel}>
      <View style={styles.statsPanelLeft}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>streak</Text>
          <Text style={styles.statValue}>{drop.streakAtDrop ?? "—"}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>drop</Text>
          <Text style={styles.statValue}>{drop.totalDropsAtDrop ?? "—"}</Text>
        </View>
      </View>
      <View style={styles.statsPanelDivider} />
      <View style={styles.statsPanelRight}>
        <FeedMiniHeatmap data={authorHeatmap} timezone={author.timezone} />
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={[styles.header, photoUrl ? styles.headerSlim : null]}>
        <View style={styles.headerLeft}>
          {author.avatarUrl ? (
            <Image
              source={{ uri: author.avatarUrl }}
              style={[styles.avatar, photoUrl ? styles.avatarSlim : null]}
              contentFit="cover"
            />
          ) : (
            <View
              style={[styles.avatar, photoUrl ? styles.avatarSlim : null, styles.avatarFallback]}
            >
              <Text style={[styles.avatarLetter, photoUrl ? styles.avatarLetterSlim : null]}>
                {author.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={[styles.username, photoUrl ? styles.usernameSlim : null]}>
              {author.username}
            </Text>
            <Text style={styles.time}>{timeAgo(drop.createdAt)}</Text>
          </View>
          {habitText && (
            <Text style={styles.habitName} numberOfLines={1}>
              {habitText}
            </Text>
          )}
        </View>
        {!photoUrl && statsPanel}
      </View>

      {photoUrl && (
        <View
          style={styles.photoWrap}
          collapsable={false}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            photoSizeRef.current = { w: width, h: height };
            photoW.value = width;
            photoH.value = height;
            maybeInit();
          }}
        >
          <Image
            source={{ uri: photoUrl }}
            style={styles.photo}
            contentFit="cover"
            transition={120}
            priority={imagePriority}
          />
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.statsOverlay, animStyle]}>
              <View
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  overlaySizeRef.current = { w: width, h: height };
                  overlayW.value = width;
                  overlayH.value = height;
                  maybeInit();
                }}
              >
                {statsPanel}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      )}

      {drop.caption.length > 0 && <Text style={styles.caption}>{drop.caption}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerSlim: {
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 0,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#222" },
  avatarSlim: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: colors.fg, fontSize: 16, fontFamily: fonts.sans, fontWeight: "600" },
  avatarLetterSlim: { fontSize: 12 },
  headerText: {},
  username: { color: colors.fg, fontSize: 15, fontFamily: fonts.sans, fontWeight: "600" },
  usernameSlim: { fontSize: 13 },
  time: { color: "#666", fontSize: 12, fontFamily: fonts.mono, marginTop: 2 },
  habitName: {
    marginLeft: "auto",
    maxWidth: 180,
    color: colors.fg,
    fontSize: 14,
    fontFamily: fonts.sans,
    fontWeight: "600",
    textAlign: "right",
  },
  statsPanel: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderRadius: 10,
    overflow: "hidden",
  },
  statsPanelLeft: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  statItem: { alignItems: "flex-end" },
  statLabel: {
    color: "#555",
    fontSize: 8,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: { color: colors.fg, fontSize: 10, fontFamily: fonts.mono, fontWeight: "600" },
  statDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2a2a2a",
    marginHorizontal: -10,
  },
  statsPanelDivider: { width: StyleSheet.hairlineWidth, backgroundColor: "#2a2a2a" },
  statsPanelRight: { padding: 8 },
  photoWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#111",
  },
  photo: { width: "100%", height: "100%" },
  statsOverlay: {
    position: "absolute",
  },
  caption: {
    color: colors.fg,
    fontSize: 16,
    fontFamily: fonts.sans,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
});
