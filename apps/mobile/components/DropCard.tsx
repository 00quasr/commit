import type { Doc, Id } from "@commit/convex/dataModel";
import { colors, fonts } from "@commit/ui-tokens";
import { Image } from "expo-image";
import { memo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import { FeedMiniHeatmap } from "./FeedMiniHeatmap";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface DropCardProps {
  drop: Doc<"drops">;
  author: Doc<"profiles">;
  photoUrl: string | null;
  authorHeatmap: Array<{ dayKey: string; count: number }>;
  habitColor: string | null;
  onVisible?: (dropId: Id<"drops">) => void;
  onOverlayDragStart?: () => void;
  onOverlayDragEnd?: () => void;
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
const STRONG_FLICK = 0.5; // px/ms — snaps to new corner
const WEAK_FLICK = 0.15; // px/ms — bounces slightly, returns to current corner
const BOUNCE_PX = 30; // overshoot distance for a weak flick

function cornerPos(
  c: Corner,
  pw: number,
  ph: number,
  ow: number,
  oh: number,
): { x: number; y: number } {
  switch (c) {
    case "top-left":
      return { x: OVERLAY_PAD, y: OVERLAY_PAD };
    case "top-right":
      return { x: pw - ow - OVERLAY_PAD, y: OVERLAY_PAD };
    case "bottom-left":
      return { x: OVERLAY_PAD, y: ph - oh - OVERLAY_PAD };
    case "bottom-right":
      return { x: pw - ow - OVERLAY_PAD, y: ph - oh - OVERLAY_PAD };
  }
}

function resolveCorner(
  cx: number,
  cy: number,
  vx: number,
  vy: number,
  pw: number,
  ph: number,
): Corner {
  const flickX = Math.abs(vx) > STRONG_FLICK;
  const flickY = Math.abs(vy) > STRONG_FLICK;
  const goRight = flickX ? vx > 0 : cx >= pw / 2;
  const goDown = flickY ? vy > 0 : cy >= ph / 2;
  return `${goDown ? "bottom" : "top"}-${goRight ? "right" : "left"}` as Corner;
}

export const DropCard = memo(function DropCard({
  drop,
  author,
  photoUrl,
  authorHeatmap,
  habitColor,
  onOverlayDragStart,
  onOverlayDragEnd,
}: DropCardProps) {
  // Single Animated.ValueXY drives the absolute {left, top} position of the overlay.
  // No dual-source-of-truth (corner state + dragOffset) → no inter-frame sync glitches.
  const absPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const committedCornerRef = useRef<Corner>("bottom-right");
  const initializedRef = useRef(false);
  const [overlayReady, setOverlayReady] = useState(false);
  const photoSize = useRef({ width: 0, height: 0 });
  const overlaySize = useRef({ width: 0, height: 0 });

  const onOverlayDragStartRef = useRef(onOverlayDragStart);
  const onOverlayDragEndRef = useRef(onOverlayDragEnd);
  onOverlayDragStartRef.current = onOverlayDragStart;
  onOverlayDragEndRef.current = onOverlayDragEnd;

  function maybeInit() {
    if (initializedRef.current) return;
    const { width: pw, height: ph } = photoSize.current;
    const { width: ow, height: oh } = overlaySize.current;
    if (pw === 0 || ow === 0) return;
    initializedRef.current = true;
    absPos.setValue(cornerPos("bottom-right", pw, ph, ow, oh));
    setOverlayReady(true);
  }

  function springTo(target: { x: number; y: number }) {
    Animated.spring(absPos, {
      toValue: target,
      tension: 350,
      friction: 30,
      useNativeDriver: false,
    }).start();
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        absPos.stopAnimation();
        // Capture current position as offset so subsequent dx/dy are relative to it
        absPos.setOffset({
          x: (absPos.x as unknown as { _value: number })._value,
          y: (absPos.y as unknown as { _value: number })._value,
        });
        absPos.setValue({ x: 0, y: 0 });
        onOverlayDragStartRef.current?.();
      },

      onPanResponderMove: Animated.event([null, { dx: absPos.x, dy: absPos.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: (_e, { vx, vy }) => {
        absPos.flattenOffset();
        const { width: pw, height: ph } = photoSize.current;
        const { width: ow, height: oh } = overlaySize.current;
        const curX = (absPos.x as unknown as { _value: number })._value;
        const curY = (absPos.y as unknown as { _value: number })._value;
        const centerX = curX + ow / 2;
        const centerY = curY + oh / 2;

        const weakX = Math.abs(vx) > WEAK_FLICK && Math.abs(vx) <= STRONG_FLICK;
        const weakY = Math.abs(vy) > WEAK_FLICK && Math.abs(vy) <= STRONG_FLICK;

        if (weakX || weakY) {
          // Weak flick: overshoot slightly, then spring back to current corner
          const returnPos = cornerPos(committedCornerRef.current, pw, ph, ow, oh);
          Animated.sequence([
            Animated.timing(absPos, {
              toValue: {
                x: curX + (weakX ? Math.sign(vx) * BOUNCE_PX : 0),
                y: curY + (weakY ? Math.sign(vy) * BOUNCE_PX : 0),
              },
              duration: 80,
              useNativeDriver: false,
            }),
            Animated.spring(absPos, {
              toValue: returnPos,
              tension: 350,
              friction: 30,
              useNativeDriver: false,
            }),
          ]).start();
        } else {
          // Strong flick or slow drag: resolve target corner and slide there
          const newCorner = resolveCorner(centerX, centerY, vx, vy, pw, ph);
          committedCornerRef.current = newCorner;
          springTo(cornerPos(newCorner, pw, ph, ow, oh));
        }

        onOverlayDragEndRef.current?.();
      },

      onPanResponderTerminate: () => {
        absPos.flattenOffset();
        const { width: pw, height: ph } = photoSize.current;
        const { width: ow, height: oh } = overlaySize.current;
        springTo(cornerPos(committedCornerRef.current, pw, ph, ow, oh));
        onOverlayDragEndRef.current?.();
      },
    }),
  ).current;

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
        <FeedMiniHeatmap
          data={authorHeatmap}
          timezone={author.timezone}
          color={habitColor ?? "#444444"}
        />
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
        </View>
        {!photoUrl && statsPanel}
      </View>

      {photoUrl && (
        <View
          style={styles.photoWrap}
          collapsable={false}
          onLayout={(e) => {
            photoSize.current = e.nativeEvent.layout;
            maybeInit();
          }}
        >
          <Image
            source={{ uri: photoUrl }}
            style={styles.photo}
            contentFit="cover"
            transition={120}
          />
          <Animated.View
            style={[
              styles.statsOverlay,
              { left: absPos.x, top: absPos.y },
              !overlayReady && styles.statsOverlayHidden,
            ]}
            onLayout={(e) => {
              overlaySize.current = e.nativeEvent.layout;
              maybeInit();
            }}
            {...panResponder.panHandlers}
          >
            {statsPanel}
          </Animated.View>
        </View>
      )}

      {drop.caption.length > 0 && <Text style={styles.caption}>{drop.caption}</Text>}

      {drop.tags.length > 0 && (
        <View style={styles.tagRow}>
          {drop.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
      )}
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
  statsOverlayHidden: {
    opacity: 0,
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
  tagRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tag: { color: "#888", fontSize: 13, fontFamily: fonts.mono },
});
