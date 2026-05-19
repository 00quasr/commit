import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors, fonts } from "@commit/ui-tokens";

function TabLabel({ children, focused }: { children: string; focused: boolean }) {
  return (
    <Text
      style={{
        color: focused ? colors.fg : "#666",
        fontSize: 11,
        fontFamily: fonts.mono,
        letterSpacing: 0.5,
      }}
    >
      {children.toUpperCase()}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: "#1a1a1a",
          borderTopWidth: 1,
          height: 72,
          paddingTop: 8,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.fg,
        tabBarInactiveTintColor: "#666",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Today</TabLabel>,
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Feed</TabLabel>,
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
