import { ReactNode } from "react";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { colors } from "./theme";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-kesari-background">
      <View
        className="absolute top-0 left-0 right-0 h-36"
        style={{ backgroundColor: "#FFF3E6", opacity: 0.65 }}
      />
      {children}
    </View>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      className="bg-kesari-surface rounded-3xl p-4 mb-3 border border-orange-100"
      style={{
        shadowColor: "#CC7A1A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: Platform.OS === "android" ? 4 : 0,
      }}
    >
      <View className="flex-row items-center mb-3">
        <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colors.primary }} />
        <Text
          className="text-kesari-text text-base font-semibold tracking-wide"
          style={{ fontFamily: Platform.OS === "android" ? "sans-serif-medium" : undefined }}
        >
          {title}
        </Text>
      </View>
      {children}
    </Animated.View>
  );
}

export function LabelValue({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-orange-50">
      <View className="flex-row items-center pr-2 flex-1">
        <View className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: "#FDBA74" }} />
        <Text
          className="text-kesari-muted"
          style={{ fontFamily: Platform.OS === "android" ? "sans-serif" : undefined }}
        >
          {label}
        </Text>
      </View>
      <Text
        className="text-kesari-text font-medium text-right max-w-[62%]"
        style={{ fontFamily: Platform.OS === "android" ? "sans-serif-medium" : undefined }}
      >
        {String(value)}
      </Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="rounded-2xl py-3 px-4 items-center justify-center min-h-12 border border-orange-300"
      style={{ backgroundColor: disabled ? "#F0B98A" : colors.primary }}
    >
      <Text
        className="text-white font-semibold tracking-wide"
        style={{ fontFamily: Platform.OS === "android" ? "sans-serif-medium" : undefined }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function Loading() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-3 text-kesari-muted">Loading Digibizz Student LMS...</Text>
    </View>
  );
}

export function formatLastSynced(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function StatusBadge({
  text,
  variant = "neutral",
}: {
  text: string;
  variant?: "neutral" | "warning" | "success";
}) {
  const palette =
    variant === "warning"
      ? { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E" }
      : variant === "success"
      ? { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46" }
      : { bg: "#F3F4F6", border: "#D1D5DB", text: "#4B5563" };

  return (
    <View
      className="rounded-2xl px-3 py-2.5 mb-3"
      style={{ backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1 }}
    >
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: palette.text }} />
        <Text
          style={{
            color: palette.text,
            fontFamily: Platform.OS === "android" ? "sans-serif-medium" : undefined,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

export function BulletText({ text }: { text: string }) {
  return (
    <View className="flex-row items-start py-1">
      <Text className="mr-2 mt-0.5" style={{ color: "#F59E0B" }}>
        •
      </Text>
      <Text
        className="text-kesari-text flex-1 leading-5"
        style={{ fontFamily: Platform.OS === "android" ? "sans-serif" : undefined }}
      >
        {text}
      </Text>
    </View>
  );
}
