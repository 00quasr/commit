import { api } from "@commit/convex/api";
import { theme } from "@/lib/theme";
import { useQuery } from "convex/react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Profile() {
  const me = useQuery(api.profiles.me);

  if (me === undefined) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.text.primary} />
      </View>
    );
  }

  if (me === null) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href={`/u/${me.username}`} />;
}
