import { useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { ChartNoAxesCombined, CircleDollarSign, FileWarning, Megaphone } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/src/auth";
import { getApiErrorMessage, getStudentDashboard, studentApi } from "@/src/api";
import { Card, LabelValue, Screen, StatusBadge, formatLastSynced } from "@/src/ui";
import { DashboardData } from "@/src/types";

export default function DashboardScreen() {
  const { studentCtx, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<Record<string, any> | null>(null);
  const [centerMap, setCenterMap] = useState<Record<string, string>>({});
  const [courseMap, setCourseMap] = useState<Record<string, string>>({});
  const [batchMap, setBatchMap] = useState<Record<string, string>>({});

  const getStatValue = (labelMatches: string[], fallback?: string | number | null) => {
    const found = data?.statistics?.find((s) => {
      const normalized = String(s.label || "")
        .toLowerCase()
        .replace(/[_\s-]+/g, "");
      return labelMatches.some((m) => normalized.includes(m.toLowerCase().replace(/[_\s-]+/g, "")));
    });
    return found?.value || fallback || "-";
  };

  const normalizeStats = (stats: any): { label: string; value: string }[] => {
    if (!Array.isArray(stats)) return [];
    return stats
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const label = entry.label ?? entry.title ?? entry.name ?? entry.key ?? "";
        const value = entry.value ?? entry.val ?? entry.data ?? entry.count ?? "";
        if (!label) return null;
        return { label: String(label), value: String(value) };
      })
      .filter(Boolean) as { label: string; value: string }[];
  };

  const pickProfile = (payload: any): Record<string, any> | null => {
    if (!payload) return null;
    if (Array.isArray(payload)) return (payload[0] as Record<string, any>) || null;
    if (Array.isArray(payload?.data)) return (payload.data[0] as Record<string, any>) || null;
    if (payload?.data && typeof payload.data === "object") return payload.data as Record<string, any>;
    if (typeof payload === "object") return payload as Record<string, any>;
    return null;
  };

  const getProfileValue = (keys: string[]) => {
    if (!studentProfile) return "";
    for (const key of keys) {
      const direct = studentProfile[key];
      if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
        return String(direct);
      }
    }
    return "";
  };

  const toLookupMap = (
    payload: any,
    idKeys: string[],
    nameKeys: string[]
  ): Record<string, string> => {
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.rows)
      ? payload.rows
      : [];
    const mapped: Record<string, string> = {};
    rows.forEach((row: any) => {
      const id = idKeys.map((k) => row?.[k]).find((v) => v !== undefined && v !== null);
      const name = nameKeys
        .map((k) => row?.[k])
        .find((v) => v !== undefined && v !== null && String(v).trim() !== "");
      if (id !== undefined && id !== null && name) {
        mapped[String(id)] = String(name);
      }
    });
    return mapped;
  };

  const resolveName = (
    directName: string | number,
    idValue: unknown,
    map: Record<string, string>
  ) => {
    const normalizedName = String(directName ?? "").trim();
    if (
      normalizedName !== "" &&
      normalizedName !== "undefined" &&
      normalizedName !== "-"
    ) {
      return normalizedName;
    }
    if (idValue === undefined || idValue === null || String(idValue).trim() === "") return "-";
    return map[String(idValue)] || "-";
  };

  const load = async () => {
    if (!studentCtx) return;
    setLoading(true);
    setError(null);
    setUsingCachedData(false);
    const cacheKey = `dashboard_cache_${studentCtx.user_id}_${studentCtx.tb_id}`;
    try {
      let result: DashboardData | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const settled = await Promise.allSettled([
            getStudentDashboard(studentCtx),
            studentApi.studentProfileById(studentCtx.user_id),
            studentApi.centers(),
            studentApi.courses(),
            studentApi.trainingBatches(),
          ]);
          if (settled[0].status !== "fulfilled") throw settled[0].reason;
          result = settled[0].value;
          if (settled[1].status === "fulfilled") {
            setStudentProfile(pickProfile(settled[1].value?.data));
          }
          if (settled[2].status === "fulfilled") {
            setCenterMap(
              toLookupMap(settled[2].value?.data, ["center_id", "id"], ["center_name", "center_title", "name"])
            );
          }
          if (settled[3].status === "fulfilled") {
            setCourseMap(
              toLookupMap(settled[3].value?.data, ["course_id", "id"], ["course_name", "course_title", "name"])
            );
          }
          if (settled[4].status === "fulfilled") {
            setBatchMap(
              toLookupMap(settled[4].value?.data, ["tb_id", "id"], ["tb_name", "batch_name", "name"])
            );
          }
          break;
        } catch (e) {
          if (attempt === 1) throw e;
        }
      }
      const normalized: DashboardData | null = result
        ? {
            statistics: normalizeStats((result as any).statistics),
            recentAssignments: Array.isArray((result as any).recentAssignments)
              ? (result as any).recentAssignments
              : [],
            latestAnnouncement: (result as any).latestAnnouncement || null,
            dashboardStats: {
              earnings: Number((result as any)?.dashboardStats?.earnings ?? 0),
              pendingAssignments: Number((result as any)?.dashboardStats?.pendingAssignments ?? 0),
              pendingQuizzes: Number((result as any)?.dashboardStats?.pendingQuizzes ?? 0),
              overallProgress: Number((result as any)?.dashboardStats?.overallProgress ?? 0),
              attendanceProgress: Number((result as any)?.dashboardStats?.attendanceProgress ?? 0),
              notSubmittedAssignments: Number(
                (result as any)?.dashboardStats?.notSubmittedAssignments ?? 0
              ),
            },
          }
        : null;

      setData(normalized);
      if (normalized) {
        const now = new Date().toISOString();
        setLastSynced(now);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: normalized, syncedAt: now }));
      }
    } catch (e) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const cachedData = parsed?.data || null;
        const normalizedCached: DashboardData | null = cachedData
          ? {
              statistics: normalizeStats(cachedData.statistics),
              recentAssignments: Array.isArray(cachedData.recentAssignments)
                ? cachedData.recentAssignments
                : [],
              latestAnnouncement: cachedData.latestAnnouncement || null,
              dashboardStats: {
                earnings: Number(cachedData?.dashboardStats?.earnings ?? 0),
                pendingAssignments: Number(cachedData?.dashboardStats?.pendingAssignments ?? 0),
                pendingQuizzes: Number(cachedData?.dashboardStats?.pendingQuizzes ?? 0),
                overallProgress: Number(cachedData?.dashboardStats?.overallProgress ?? 0),
                attendanceProgress: Number(cachedData?.dashboardStats?.attendanceProgress ?? 0),
                notSubmittedAssignments: Number(
                  cachedData?.dashboardStats?.notSubmittedAssignments ?? 0
                ),
              },
            }
          : null;
        setData(normalizedCached);
        setLastSynced(parsed?.syncedAt || null);
        setUsingCachedData(true);
        setError("Showing cached data (offline mode).");
      } else {
        setError(getApiErrorMessage(e, "Could not load dashboard."));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [studentCtx?.user_id, studentCtx?.tb_id]);

  if (loading) {
    return (
      <Screen>
        <View className="p-4">
          <View className="h-8 w-40 bg-gray-200 rounded-lg mb-4" />
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1 h-24 bg-gray-200 rounded-2xl" />
            <View className="flex-1 h-24 bg-gray-200 rounded-2xl" />
          </View>
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1 h-24 bg-gray-200 rounded-2xl" />
            <View className="flex-1 h-24 bg-gray-200 rounded-2xl" />
          </View>
          <View className="h-28 bg-gray-200 rounded-2xl mb-3" />
          <View className="h-28 bg-gray-200 rounded-2xl" />
        </View>
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <View className="p-4">
          <View className="bg-white rounded-2xl p-5 border border-orange-100">
            <Text className="text-kesari-text font-semibold">
              {error ? "Unable to load dashboard" : "No dashboard data"}
            </Text>
            <Text className="text-kesari-muted mt-1">
              {error || "Pull down to refresh or login again."}
            </Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        data={data.statistics}
        keyExtractor={(item, idx) => `${item.label}-${idx}`}
        ListHeaderComponent={
          <View>
            <Text className="text-kesari-text text-2xl font-bold mb-2">Welcome Student</Text>
            <Text className="text-kesari-muted mb-4">Digibizz Student LMS progress snapshot</Text>
            {usingCachedData && (
              <StatusBadge
                variant="warning"
                text="Offline mode: showing last synced dashboard."
              />
            )}
            {lastSynced && (
              <Text className="text-kesari-muted mb-3">
                Last synced: {formatLastSynced(lastSynced)}
              </Text>
            )}
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1 bg-white rounded-2xl p-3 min-h-12 border border-orange-100">
                <CircleDollarSign color="#FF9933" size={20} />
                <Text className="text-kesari-muted mt-1">Earnings</Text>
                <Text className="text-kesari-text text-lg font-bold">{data.dashboardStats.earnings}</Text>
              </View>
              <View className="flex-1 bg-white rounded-2xl p-3 min-h-12 border border-orange-100">
                <FileWarning color="#FFC107" size={20} />
                <Text className="text-kesari-muted mt-1">Pending Assignments</Text>
                <Text className="text-kesari-text text-lg font-bold">{data.dashboardStats.notSubmittedAssignments}</Text>
              </View>
            </View>
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1 bg-white rounded-2xl p-3 min-h-12 border border-orange-100">
                <ChartNoAxesCombined color="#10B981" size={20} />
                <Text className="text-kesari-muted mt-1">Pending Quiz</Text>
                <Text className="text-kesari-text text-lg font-bold">{data.dashboardStats.pendingQuizzes}</Text>
              </View>
              <View className="flex-1 bg-white rounded-2xl p-3 min-h-12 border border-orange-100">
                <Megaphone color="#FF9933" size={20} />
                <Text className="text-kesari-muted mt-1">Progress</Text>
                <Text className="text-kesari-text text-lg font-bold">{data.dashboardStats.overallProgress}%</Text>
              </View>
            </View>
            <Card title="Latest Announcement">
              <Text className="text-kesari-text font-medium">{data.latestAnnouncement?.ca_title || "No announcement"}</Text>
              <Text className="text-kesari-muted mt-1">{data.latestAnnouncement?.ca_message || "Stay tuned."}</Text>
            </Card>
            <Card title="Student Details">
              <LabelValue
                label="Name"
                value={
                  getStatValue(
                    ["name", "studentname"],
                    getProfileValue(["user_name", "name", "student_name"]) ||
                      user?.user_name ||
                      user?.user_username
                  )
                }
              />
              <LabelValue
                label="Username"
                value={getProfileValue(["user_username", "username"]) || user?.user_username || "-"}
              />
              <LabelValue
                label="Email"
                value={getStatValue(["email"], getProfileValue(["user_email", "email"]) || user?.user_email)}
              />
              <LabelValue
                label="Roll No"
                value={
                  getStatValue(
                    ["roll", "rollno"],
                    getProfileValue(["std_rollno", "roll_no", "rollno"]) || studentCtx?.std_rollno
                  )
                }
              />
              <LabelValue label="CNIC" value={getStatValue(["cnic"], getProfileValue(["std_cnic", "cnic"]) || user?.cnic)} />
              <LabelValue
                label="Phone"
                value={
                  getStatValue(
                    ["phone", "mobile"],
                    getProfileValue(["std_phone", "user_mobile", "phone", "mobile"]) || user?.phone
                  )
                }
              />
              <LabelValue
                label="Father Name"
                value={getProfileValue(["std_fathername", "father_name"]) || "-"}
              />
              <LabelValue
                label="Gender"
                value={getProfileValue(["std_gender", "gender"]) || "-"}
              />
              <LabelValue label="District" value={getStatValue(["district"], getProfileValue(["std_district", "district_name", "district"]) || user?.district)} />
              <LabelValue
                label="Qualification"
                value={
                  getStatValue(
                    ["qualification", "education"],
                    getProfileValue(["std_qualification", "qualification_name", "qualification"]) ||
                      user?.qualification
                  )
                }
              />
              <LabelValue
                label="Course"
                value={
                  resolveName(
                    getStatValue(
                      ["course"],
                      getProfileValue(["course_name", "course_title", "course"]) || user?.course_name
                    ),
                    getProfileValue(["course_id"]) || user?.course_id,
                    courseMap
                  )
                }
              />
              <LabelValue
                label="Center"
                value={
                  resolveName(
                    getStatValue(
                      ["center"],
                      getProfileValue(["center_name", "center_title", "center"]) || user?.center_name
                    ),
                    getProfileValue(["center_id"]) || user?.center_id,
                    centerMap
                  )
                }
              />
              <LabelValue
                label="Batch"
                value={
                  resolveName(
                    getStatValue(
                      ["batch", "tb"],
                      getProfileValue(["tb_name", "batch_name", "training_batch_name"]) || user?.tb_name
                    ),
                    getProfileValue(["tb_id"]) || user?.tb_id,
                    batchMap
                  )
                }
              />
            </Card>
          </View>
        }
        renderItem={({ item }) => <LabelValue label={item.label} value={item.value} />}
      />
    </Screen>
  );
}
