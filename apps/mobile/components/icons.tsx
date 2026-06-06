import { View } from "react-native";

interface IconProps {
  size?: number;
  color?: string;
}

// Two-person silhouette built from filled View shapes. Avoids the colored 👥
// emoji while keeping the bundle free of an SVG dependency.
export function PeopleIcon({ size = 20, color = "#fff" }: IconProps) {
  const head = size * 0.42;
  const body = size * 0.7;
  const bodyHeight = body * 0.55;
  const totalWidth = body + size * 0.42;
  const totalHeight = head + bodyHeight + size * 0.04;
  const overlap = head * 0.45;
  return (
    <View style={{ width: totalWidth, height: totalHeight }}>
      {/* Back person */}
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: head,
          height: head,
          borderRadius: head / 2,
          backgroundColor: color,
          opacity: 0.45,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: body,
          height: bodyHeight,
          borderTopLeftRadius: bodyHeight,
          borderTopRightRadius: bodyHeight,
          backgroundColor: color,
          opacity: 0.45,
        }}
      />
      {/* Front person — drawn on top */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: head,
          height: head,
          borderRadius: head / 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: body,
          height: bodyHeight,
          borderTopLeftRadius: bodyHeight,
          borderTopRightRadius: bodyHeight,
          backgroundColor: color,
        }}
      />
      {/* Carve a small gap between back head and front body for legibility */}
      <View style={{ width: overlap, height: 0 }} />
    </View>
  );
}

// Search magnifier glyph for input prefixes.
export function SearchIcon({ size = 16, color = "#fff" }: IconProps) {
  const stroke = Math.max(1.4, size * 0.1);
  const lensSize = size * 0.7;
  const handleLength = size * 0.35;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: lensSize,
          height: lensSize,
          borderRadius: lensSize / 2,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: handleLength,
          height: stroke,
          backgroundColor: color,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}
