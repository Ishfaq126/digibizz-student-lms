import { useState } from "react";
import { Alert, Image, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Lock, UserRound } from "lucide-react-native";
import { useAuth } from "@/src/auth";
import { PrimaryButton, Screen } from "@/src/ui";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const onLogin = async () => {
    try {
      setBusy(true);
      await signIn(username.trim(), password);
      router.replace("/(tabs)/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      Alert.alert("Digibizz Student LMS", message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View className="flex-1 justify-center px-5">
        <View className="bg-kesari-surface rounded-3xl p-6 border border-orange-100">
          <View className="items-center mb-6">
            <Image source={require("../assets/images/icon.png")} className="w-16 h-16 mb-3" />
            <Text className="text-2xl font-bold text-kesari-text">Digibizz Student LMS</Text>
            <Text className="text-kesari-muted mt-1">Official Student Portal</Text>
          </View>

          <View className="mb-3 min-h-12 justify-center rounded-xl border border-gray-200 px-3 flex-row items-center">
            <UserRound color="#6B7280" size={18} />
            <TextInput
              placeholder="Username or Email"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              className="flex-1 ml-2 text-kesari-text"
            />
          </View>

          <View className="mb-5 min-h-12 justify-center rounded-xl border border-gray-200 px-3 flex-row items-center">
            <Lock color="#6B7280" size={18} />
            <TextInput
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              className="flex-1 ml-2 text-kesari-text"
            />
          </View>

          <PrimaryButton title={busy ? "Signing In..." : "Sign In"} onPress={onLogin} disabled={busy} />
        </View>
      </View>
    </Screen>
  );
}
