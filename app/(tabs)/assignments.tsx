import { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/src/auth";
import { getApiErrorMessage, studentApi } from "@/src/api";
import { BulletText, Card, Loading, Screen, StatusBadge, formatLastSynced } from "@/src/ui";

export default function AssignmentsScreen() {
  const { studentCtx } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [files, setFiles] = useState<
    Record<number, { uri: string; name: string; mimeType?: string } | undefined>
  >({});
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [resolvedRollNo, setResolvedRollNo] = useState("");

  const extractAssignments = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.assignments)) return payload.assignments;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.rows)) return payload.rows;
    return [];
  };

  const getSubmissionStatus = (item: any) => {
    const raw = item?.as_submission_status ?? item?.studentStats?.status;
    if (raw === 1 || raw === "1") return { label: "Reviewed", bg: "#ECFDF5", color: "#10B981" };
    if (raw === 2 || raw === "2") return { label: "Needs Update", bg: "#FEF3C7", color: "#B45309" };
    if (raw === 0 || raw === "0") return { label: "Submitted", bg: "#FFF7ED", color: "#EA580C" };
    return { label: "Not Submitted", bg: "#F3F4F6", color: "#6B7280" };
  };

  const loadAssignments = async () => {
    if (!studentCtx) return;
    setLoading(true);
    setLoadError(null);
    setUsingCachedData(false);
    const cacheKey = `assignments_cache_${studentCtx.user_id}_${studentCtx.tb_id}`;
    try {
      let response: any;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await studentApi.assignments(studentCtx.tb_id, studentCtx.user_id);
          break;
        } catch (error) {
          if (attempt === 1) throw error;
        }
      }
      const fetchedRows = extractAssignments(response?.data);
      setRows(fetchedRows);
      const now = new Date().toISOString();
      setLastSynced(now);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ rows: fetchedRows, syncedAt: now }));
    } catch (error) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setRows(parsed?.rows || []);
        setLastSynced(parsed?.syncedAt || null);
        setUsingCachedData(true);
        setLoadError("Showing cached assignments (offline mode).");
      } else {
        setLoadError(getApiErrorMessage(error, "Could not load assignments."));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [studentCtx]);

  useEffect(() => {
    (async () => {
      if (!studentCtx?.user_id) return;
      try {
        const res = await studentApi.studentProfileById(studentCtx.user_id);
        const payload = res?.data;
        const profile = Array.isArray(payload)
          ? payload[0]
          : Array.isArray(payload?.data)
          ? payload.data[0]
          : payload?.data || payload;
        const roll =
          profile?.std_rollno ||
          profile?.roll_no ||
          profile?.rollno ||
          studentCtx.std_rollno ||
          "";
        setResolvedRollNo(String(roll));
      } catch {
        setResolvedRollNo(studentCtx.std_rollno || "");
      }
    })();
  }, [studentCtx?.user_id, studentCtx?.std_rollno]);

  const pickAssignmentFile = async (asId: number) => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "image/*",
        "application/zip",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.length) return;
    const f = picked.assets[0];
    const maxSizeBytes = 5 * 1024 * 1024;
    if (f.size && f.size > maxSizeBytes) {
      Alert.alert("Digibizz Student LMS", "File too large. Please select a file up to 5MB.");
      return;
    }
    const allowed = ["application/pdf", "application/zip", "image/jpeg", "image/png", "image/webp"];
    if (f.mimeType && !allowed.includes(f.mimeType)) {
      Alert.alert("Digibizz Student LMS", "Unsupported file type. Use PDF, ZIP, JPG, PNG, or WEBP.");
      return;
    }
    setFiles((prev) => ({
      ...prev,
      [asId]: { uri: f.uri, name: f.name || "attachment", mimeType: f.mimeType },
    }));
  };

  const submitAssignment = async (item: any) => {
    if (!studentCtx) return;
    const rollNo = (resolvedRollNo || studentCtx.std_rollno || "").trim();
    if (!rollNo) {
      Alert.alert("Digibizz Student LMS", "Roll number missing in profile. Please re-login and try again.");
      return;
    }
    const text = comments[item.as_id]?.trim();
    if (!text || text.length < 5) {
      Alert.alert("Digibizz Student LMS", "Please write at least 5 characters in comment.");
      return;
    }
    try {
      setSubmittingId(item.as_id);
      const file = files[item.as_id];
      if (file) {
        await studentApi.assignmentSubmitWithAttachment({
          std_rollno: rollNo,
          tb_id: studentCtx.tb_id,
          as_id: item.as_id,
          as_submission_comment: text,
          fileUri: file.uri,
          fileName: file.name,
          mimeType: file.mimeType,
        });
      } else {
        await studentApi.assignmentSubmitSimple({
          std_rollno: rollNo,
          tb_id: studentCtx.tb_id,
          as_id: item.as_id,
          as_submission_comment: text,
        });
      }
      setComments((prev) => ({ ...prev, [item.as_id]: "" }));
      setFiles((prev) => ({ ...prev, [item.as_id]: undefined }));
      Alert.alert("Digibizz Student LMS", "Assignment submitted successfully.");
      await loadAssignments();
    } catch (error) {
      Alert.alert(
        "Digibizz Student LMS",
        getApiErrorMessage(error, "Unable to submit assignment.")
      );
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) return <Loading />;

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssignments();
    setRefreshing(false);
  };

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={rows}
        keyExtractor={(item, idx) => String(item.as_id ?? idx)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <Text className="text-kesari-text text-xl font-bold mb-3">Assignments</Text>
            {usingCachedData && (
              <StatusBadge
                variant="warning"
                text="Offline mode: showing last synced assignments."
              />
            )}
            {lastSynced && (
              <Text className="text-kesari-muted mb-2">
                Last synced: {formatLastSynced(lastSynced)}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Card title={item.as_title || item.title || "Assignment"}>
            <View
              className="self-start px-2 py-1 rounded-full mb-2"
              style={{
                backgroundColor: getSubmissionStatus(item).bg,
              }}
            >
              <Text style={{ color: getSubmissionStatus(item).color, fontWeight: "600" }}>
                {getSubmissionStatus(item).label}
              </Text>
            </View>
            <BulletText text={`Due: ${item.as_submission_date || item.as_deadline || "N/A"}`} />
            <BulletText text={item.as_details || "Open assignment details from backend response."} />
            <View className="mt-3">
              <TextInput
                value={comments[item.as_id] || ""}
                onChangeText={(value) =>
                  setComments((prev) => ({ ...prev, [item.as_id]: value }))
                }
                placeholder="Write submission comment"
                multiline
                className="min-h-20 border border-gray-200 rounded-xl px-3 py-2 text-kesari-text"
              />
              <TouchableOpacity
                onPress={() => pickAssignmentFile(item.as_id)}
                className="min-h-12 mt-2 rounded-xl items-center justify-center border border-orange-200"
              >
                <Text className="text-kesari-text font-semibold">
                  {files[item.as_id]?.name
                    ? `Attached: ${files[item.as_id]?.name}`
                    : "Attach File (Optional)"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => submitAssignment(item)}
                disabled={submittingId === item.as_id}
                className="min-h-12 mt-2 rounded-xl items-center justify-center bg-orange-500"
              >
                <Text className="text-white font-semibold">
                  {submittingId === item.as_id ? "Submitting..." : "Submit Assignment"}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View className="bg-white rounded-2xl p-5 border border-orange-100">
            <Text className="text-kesari-text font-semibold">
              {loadError ? "Could not fetch assignments" : "No assignments available"}
            </Text>
            <Text className="text-kesari-muted mt-1">
              {loadError || "Pull to refresh or check with your trainer."}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}
