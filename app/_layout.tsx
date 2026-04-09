import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/src/auth";
import { Loading } from "@/src/ui";
import "react-native-reanimated";
import "../global.css";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = { initialRouteName: "index" };

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) return <Loading />;

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#FF9933" }, headerTintColor: "#fff" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="feature/[key]" options={{ title: "Digibizz Student LMS" }} />
      <Stack.Screen name="feature/quiz-attempt" options={{ title: "Quiz Attempt" }} />
      <Stack.Screen name="feature/ticket/[id]" options={{ title: "Ticket Thread" }} />
    </Stack>
  );
}
