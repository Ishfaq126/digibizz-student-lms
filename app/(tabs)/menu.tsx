import { useRouter } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import {
  Bell,
  BookOpen,
  CircleDollarSign,
  FileText,
  HelpCircle,
  MessageSquareText,
  NotebookText,
  PlaySquare,
  Ticket,
} from "lucide-react-native";
import { Screen } from "@/src/ui";

const menuItems = [
  { key: "docs", label: "Docs", icon: FileText },
  { key: "leave", label: "Leave", icon: NotebookText },
  { key: "quiz", label: "Quiz", icon: HelpCircle },
  { key: "tickets", label: "Tickets", icon: Ticket },
  { key: "recordings", label: "Recordings", icon: PlaySquare },
  { key: "resources", label: "Resources", icon: BookOpen },
  { key: "feedback", label: "Feedback", icon: MessageSquareText },
  { key: "announcements", label: "Announcements", icon: Bell },
  { key: "earnings", label: "Earnings", icon: CircleDollarSign },
];

export default function MenuScreen() {
  const router = useRouter();
  return (
    <Screen>
      <FlatList
        data={menuItems}
        numColumns={2}
        contentContainerStyle={{ padding: 12 }}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          <View>
            <Text className="text-kesari-text text-xl font-bold mb-3 px-1">More Student Features</Text>
          </View>
        }
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              onPress={() => router.push(`/feature/${item.key}`)}
              className="flex-1 m-1 bg-white rounded-2xl p-4 border border-orange-100 min-h-24 justify-center"
            >
              <View className="items-center">
                <Icon color="#FF9933" size={22} />
                <Text className="mt-2 text-kesari-text font-semibold">{item.label}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}
