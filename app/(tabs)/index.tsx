import { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth";
import { Card, LabelValue, PrimaryButton, Screen } from "@/src/ui";
import { getApiErrorMessage, studentApi } from "@/src/api";

export default function TabIndex() {
  const { user, studentCtx, signOut } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [studentProfile, setStudentProfile] = useState<Record<string, any> | null>(null);
  const [centerMap, setCenterMap] = useState<Record<string, string>>({});
  const [courseMap, setCourseMap] = useState<Record<string, string>>({});
  const [batchMap, setBatchMap] = useState<Record<string, string>>({});

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
      const value = studentProfile[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value);
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

  const loadProfile = async () => {
    if (!studentCtx?.user_id) return;
    try {
      const settled = await Promise.allSettled([
        studentApi.studentProfileById(studentCtx.user_id),
        studentApi.centers(),
        studentApi.courses(),
        studentApi.trainingBatches(),
      ]);
      if (settled[0].status === "fulfilled") {
        setStudentProfile(pickProfile(settled[0].value?.data));
      }
      if (settled[1].status === "fulfilled") {
        setCenterMap(
          toLookupMap(settled[1].value?.data, ["center_id", "id"], ["center_name", "center_title", "name"])
        );
      }
      if (settled[2].status === "fulfilled") {
        setCourseMap(
          toLookupMap(settled[2].value?.data, ["course_id", "id"], ["course_name", "course_title", "name"])
        );
      }
      if (settled[3].status === "fulfilled") {
        setBatchMap(
          toLookupMap(settled[3].value?.data, ["tb_id", "id"], ["tb_name", "batch_name", "name"])
        );
      }
    } catch (error) {
      Alert.alert("Digibizz Student LMS", getApiErrorMessage(error, "Could not load full profile details."));
    }
  };

  useEffect(() => {
    loadProfile();
  }, [studentCtx?.user_id]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch {
      Alert.alert("Digibizz Student LMS", "Unable to logout. Please try again.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const displayName =
    getProfileValue(["user_name", "name", "student_name"]) || user?.user_name || user?.user_username || "Student";

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text className="text-kesari-text text-2xl font-bold mb-3">Profile</Text>
        <Card title="Student Account">
          <LabelValue label="Name" value={displayName} />
          <LabelValue label="Username" value={getProfileValue(["user_username", "username"]) || user?.user_username || "-"} />
          <LabelValue label="Email" value={getProfileValue(["user_email", "email"]) || user?.user_email || "-"} />
          <LabelValue label="Roll No" value={getProfileValue(["std_rollno", "roll_no", "rollno"]) || user?.std_rollno || "-"} />
          <LabelValue label="CNIC" value={getProfileValue(["std_cnic", "cnic"]) || user?.cnic || "-"} />
          <LabelValue label="Phone" value={getProfileValue(["std_phone", "user_mobile", "phone"]) || user?.phone || "-"} />
          <LabelValue label="Father Name" value={getProfileValue(["std_fathername", "father_name"]) || "-"} />
          <LabelValue label="Gender" value={getProfileValue(["std_gender", "gender"]) || "-"} />
          <LabelValue label="District" value={getProfileValue(["std_district", "district_name", "district"]) || user?.district || "-"} />
          <LabelValue label="Qualification" value={getProfileValue(["std_qualification", "qualification_name", "qualification"]) || user?.qualification || "-"} />
          <LabelValue
            label="Center"
            value={resolveName(
              getProfileValue(["center_name", "center_title", "center"]) || user?.center_name || "",
              getProfileValue(["center_id"]) || user?.center_id,
              centerMap
            )}
          />
          <LabelValue
            label="Course"
            value={resolveName(
              getProfileValue(["course_name", "course_title", "course"]) || user?.course_name || "",
              getProfileValue(["course_id"]) || user?.course_id,
              courseMap
            )}
          />
          <LabelValue
            label="Batch"
            value={resolveName(
              getProfileValue(["tb_name", "batch_name", "training_batch_name"]) || user?.tb_name || "",
              getProfileValue(["tb_id"]) || user?.tb_id,
              batchMap
            )}
          />
          <LabelValue label="Role" value={user?.user_type || "student"} />
        </Card>
        <PrimaryButton title="Logout" onPress={handleLogout} />
      </ScrollView>
    </Screen>
  );
}
