import { useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useAuth } from "@/src/auth";
import { getApiErrorMessage, studentApi } from "@/src/api";
import { BulletText, Card, Loading, Screen } from "@/src/ui";

export default function CourseModuleScreen() {
  const { studentCtx } = useAuth();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractModules = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.modules)) return payload.modules;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const loadModules = async () => {
    if (!studentCtx) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await studentApi.courseModules(
        studentCtx.tb_id,
        studentCtx.course_id,
        studentCtx.center_id
      );
      setModules(extractModules(data));
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not load course modules."));
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, [studentCtx]);

  if (loading) return <Loading />;

  const onRefresh = async () => {
    setRefreshing(true);
    await loadModules();
    setRefreshing(false);
  };

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={modules}
        keyExtractor={(item, idx) => String(item.id ?? idx)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={<Text className="text-kesari-text text-xl font-bold mb-3">Course Modules</Text>}
        renderItem={({ item }) => (
          <Card title={item.title || "Untitled Module"}>
            <BulletText text={`${item.courseTopics?.length || 0} topics`} />
            <View className="mt-2">
              {(item.courseTopics || []).slice(0, 3).map((t: any) => (
                <BulletText key={t.id} text={t.title} />
              ))}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View className="bg-white rounded-2xl p-5 border border-orange-100">
            <Text className="text-kesari-text font-semibold">
              {error ? "Unable to load modules" : "No modules available"}
            </Text>
            <Text className="text-kesari-muted mt-1">{error || "Pull down to refresh."}</Text>
          </View>
        }
      />
    </Screen>
  );
}
