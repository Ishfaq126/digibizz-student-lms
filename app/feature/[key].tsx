import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Linking, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/src/auth";
import { getApiErrorMessage, studentApi } from "@/src/api";
import { BulletText, Card, Loading, Screen, StatusBadge, formatLastSynced } from "@/src/ui";

const titleMap: Record<string, string> = {
  docs: "Student Docs",
  leave: "Leave",
  quiz: "Quiz",
  tickets: "Tickets",
  recordings: "Recordings",
  resources: "Resources",
  feedback: "Feedback",
  announcements: "Announcements",
  earnings: "Earnings",
};

export default function FeatureScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const { studentCtx } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaveSubject, setLeaveSubject] = useState("");
  const [leaveBody, setLeaveBody] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketBody, setTicketBody] = useState("");
  const [ticketFile, setTicketFile] = useState<null | {
    uri: string;
    name: string;
    mimeType?: string;
  }>(null);
  const [feedbackBody, setFeedbackBody] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("passport_photo");
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const docTypes = [
    "passport_photo",
    "cnic_front",
    "cnic_back",
    "domicile",
    "degree",
  ];

  const title = useMemo(() => titleMap[key || ""] || "Feature", [key]);

  const extractFeatureRows = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.rows)) return payload.rows;
    if (Array.isArray(payload?.list)) return payload.list;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.tickets)) return payload.tickets;
    if (Array.isArray(payload?.assignments)) return payload.assignments;
    if (Array.isArray(payload?.modules)) return payload.modules;
    if (Array.isArray(payload?.earnings)) return payload.earnings;
    return payload ? [payload] : [];
  };

  const looksLikeLink = (value: unknown) => {
    if (typeof value !== "string") return false;
    const v = value.trim();
    return /^https?:\/\/\S+$/i.test(v) || /^www\.\S+$/i.test(v);
  };

  const looksLikeDate = (value: unknown) => {
    if (typeof value !== "string") return false;
    const v = value.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(v) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(v);
  };

  const openLink = async (rawUrl: string) => {
    const normalized =
      rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;
    const canOpen = await Linking.canOpenURL(normalized);
    if (!canOpen) {
      Alert.alert("Digibizz Student LMS", "This link cannot be opened on your device.");
      return;
    }
    await Linking.openURL(normalized);
  };

  const normalizeId = (value: unknown) => String(value ?? "").trim();

  const filterOwnFeedback = (rows: any[]) =>
    rows.filter((row) => {
      const userCandidates = [
        row?.user_id,
        row?.std_user_id,
        row?.fb_user_id,
        row?.feedback_user_id,
        row?.created_by,
      ]
        .map(normalizeId)
        .filter(Boolean);
      if (userCandidates.length > 0) {
        return userCandidates.includes(String(studentCtx?.user_id ?? ""));
      }
      const rollCandidates = [row?.std_rollno, row?.roll_no, row?.student_rollno]
        .map(normalizeId)
        .filter(Boolean);
      if (rollCandidates.length > 0) {
        return rollCandidates.includes(String(studentCtx?.std_rollno ?? ""));
      }
      return false;
    });

  const loadFeature = async () => {
    if (!studentCtx || !key) return;
    setLoading(true);
    setLoadError(null);
    setUsingCachedData(false);
    const cacheKey = `feature_cache_${key}_${studentCtx.user_id}_${studentCtx.tb_id}`;
    try {
      let response: any;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          if (key === "docs") response = await studentApi.docs(studentCtx.user_id);
          if (key === "leave") response = await studentApi.leaveList(studentCtx.user_id);
          if (key === "quiz") response = await studentApi.quizzes(studentCtx.user_id, studentCtx.tb_id);
          if (key === "tickets")
            response = await studentApi.tickets({
              tb_id: studentCtx.tb_id,
              center_id: studentCtx.center_id,
              course_id: studentCtx.course_id,
              user_type: studentCtx.user_type,
              user_id: studentCtx.user_id,
            });
          if (key === "recordings")
            response = await studentApi.recordings({
              tb_id: studentCtx.tb_id,
              center_id: studentCtx.center_id,
              course_id: studentCtx.course_id,
              userType: "student",
            });
          if (key === "resources")
            response = await studentApi.resources({
              tb_id: studentCtx.tb_id,
              center_id: studentCtx.center_id,
              course_id: studentCtx.course_id,
              userType: "student",
            });
          if (key === "feedback")
            response = await studentApi.feedbackList(
              studentCtx.tb_id,
              studentCtx.user_id,
              studentCtx.user_type
            );
          if (key === "announcements")
            response = await studentApi.announcements(
              studentCtx.tb_id,
              studentCtx.user_id,
              studentCtx.user_type
            );
          if (key === "earnings") response = await studentApi.earnings(studentCtx.tb_id, studentCtx.user_id);
          break;
        } catch (error) {
          if (attempt === 1) throw error;
        }
      }

      const data = response?.data;
      const rows = extractFeatureRows(data);
      setItems(key === "feedback" ? filterOwnFeedback(rows) : rows);
      const now = new Date().toISOString();
      setLastSynced(now);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: data ?? [], syncedAt: now }));
    } catch (error) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const cachedData = parsed?.data ?? [];
        setLastSynced(parsed?.syncedAt || null);
        const rows = extractFeatureRows(cachedData);
        setItems(key === "feedback" ? filterOwnFeedback(rows) : rows);
        setUsingCachedData(true);
        setLoadError("Showing cached data (offline mode).");
      } else {
        setLoadError(getApiErrorMessage(error, "Could not load this section."));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeature();
  }, [key, studentCtx]);

  const submitLeave = async () => {
    if (!studentCtx || !leaveSubject.trim() || !leaveBody.trim() || !leaveDate.trim()) return;
    if (leaveSubject.trim().length < 3 || leaveBody.trim().length < 8) {
      Alert.alert("Digibizz Student LMS", "Please enter a valid leave subject and detailed reason.");
      return;
    }
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(leaveDate.trim());
    if (!isValidDate) {
      Alert.alert("Digibizz Student LMS", "Please enter leave date in YYYY-MM-DD format.");
      return;
    }
    setSubmitting(true);
    try {
      const profileRes = await studentApi.studentProfileById(studentCtx.user_id);
      const payload = profileRes?.data;
      const profile = Array.isArray(payload)
        ? payload[0]
        : Array.isArray(payload?.data)
        ? payload.data[0]
        : payload?.data || payload;
      const stdCnic = String(profile?.std_cnic || profile?.cnic || "").trim();
      if (!stdCnic) {
        Alert.alert("Digibizz Student LMS", "Student CNIC missing in profile. Please contact support.");
        return;
      }
      const selectedLeaveDate = new Date(leaveDate.trim());
      const monthName = selectedLeaveDate.toLocaleString("default", { month: "long" });
      const resolvedCourseId = Number(profile?.course_id ?? studentCtx.course_id ?? 0);
      const resolvedCenterId = Number(profile?.center_id ?? studentCtx.center_id ?? 0);
      const resolvedTbId = Number(profile?.tb_id ?? studentCtx.tb_id ?? 0);
      if (!resolvedCourseId || !resolvedCenterId || !resolvedTbId) {
        Alert.alert("Digibizz Student LMS", "Profile is missing course/center/batch mapping.");
        return;
      }
      const now = new Date();
      const submitDate = `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1
      ).padStart(2, "0")}/${now.getFullYear()}`;
      const slCode = String(Math.floor(Math.random() * 900000000000 + 100000000000));
      await studentApi.uploadLeave({
        sl_code: slCode,
        std_cnic: stdCnic,
        course_id: resolvedCourseId,
        center_id: resolvedCenterId,
        tb_id: resolvedTbId,
        sl_date: leaveDate.trim(),
        sl_month: monthName,
        sl_subject: leaveSubject.trim(),
        sl_body: leaveBody.trim(),
        sl_trainer_comments: "",
        sl_status: 0,
        sl_submit_date: submitDate,
        user_id: studentCtx.user_id,
      });
      setLeaveSubject("");
      setLeaveBody("");
      setLeaveDate("");
      Alert.alert("Digibizz Student LMS", "Leave submitted successfully.");
      await loadFeature();
    } catch (error) {
      Alert.alert("Digibizz Student LMS", getApiErrorMessage(error, "Unable to submit leave."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitTicket = async () => {
    if (!studentCtx || !ticketSubject.trim() || !ticketBody.trim()) return;
    if (ticketSubject.trim().length < 3 || ticketBody.trim().length < 8) {
      Alert.alert("Digibizz Student LMS", "Please provide a clearer ticket subject and description.");
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const ticketDate = now.toISOString().slice(0, 10);
      const ticketTime = now.toTimeString().slice(0, 8);
      if (ticketFile) {
        await studentApi.createTicketWithAttachment({
          ticket_subject: ticketSubject.trim(),
          ticket_description: ticketBody.trim(),
          ticket_date: ticketDate,
          ticket_time: ticketTime,
          ticket_to: "trainer",
          t_id: 0,
          tb_id: studentCtx.tb_id,
          center_id: studentCtx.center_id,
          course_id: studentCtx.course_id,
          std_rollno: studentCtx.std_rollno || "",
          user_id: studentCtx.user_id,
          fileUri: ticketFile.uri,
          fileName: ticketFile.name,
          mimeType: ticketFile.mimeType,
        });
      } else {
        await studentApi.createTicket({
          ticket_subject: ticketSubject.trim(),
          ticket_description: ticketBody.trim(),
          ticket_date: ticketDate,
          ticket_time: ticketTime,
          ticket_to: "trainer",
          t_id: 0,
          tb_id: studentCtx.tb_id,
          center_id: studentCtx.center_id,
          course_id: studentCtx.course_id,
          std_rollno: studentCtx.std_rollno || "",
          user_id: studentCtx.user_id,
        });
      }
      setTicketSubject("");
      setTicketBody("");
      setTicketFile(null);
      Alert.alert("Digibizz Student LMS", "Ticket created.");
      await loadFeature();
    } catch (error) {
      Alert.alert("Digibizz Student LMS", getApiErrorMessage(error, "Unable to create ticket."));
    } finally {
      setSubmitting(false);
    }
  };

  const pickTicketAttachment = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*", "application/zip"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.length) return;
    const file = picked.assets[0];
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size && file.size > maxSizeBytes) {
      Alert.alert("Digibizz Student LMS", "File too large. Please select a file up to 5MB.");
      return;
    }
    setTicketFile({
      uri: file.uri,
      name: file.name || "attachment",
      mimeType: file.mimeType,
    });
  };

  const submitFeedback = async () => {
    if (!studentCtx || !feedbackBody.trim()) return;
    if (feedbackBody.trim().length < 8) {
      Alert.alert("Digibizz Student LMS", "Feedback is too short. Please add more detail.");
      return;
    }
    setSubmitting(true);
    try {
      await studentApi.feedbackCreate({
        tb_id: studentCtx.tb_id,
        user_id: studentCtx.user_id,
        user_type: studentCtx.user_type,
        feedback_message: feedbackBody.trim(),
      });
      setFeedbackBody("");
      Alert.alert("Digibizz Student LMS", "Feedback sent.");
      await loadFeature();
    } catch (error) {
      Alert.alert("Digibizz Student LMS", getApiErrorMessage(error, "Unable to send feedback."));
    } finally {
      setSubmitting(false);
    }
  };

  const startQuizAttempt = async (quizCode: string) => {
    router.push(`/feature/quiz-attempt?quiz_code=${quizCode}`);
  };

  const pickAndUploadDoc = async () => {
    if (!studentCtx) return;
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.length) return;
    const file = picked.assets[0];
    setSubmitting(true);
    try {
      const profileRes = await studentApi.studentProfileById(studentCtx.user_id);
      const payload = profileRes?.data;
      const profile = Array.isArray(payload)
        ? payload[0]
        : Array.isArray(payload?.data)
        ? payload.data[0]
        : payload?.data || payload;
      const stdCnic = String(profile?.std_cnic || profile?.cnic || "").trim();
      if (!stdCnic) {
        Alert.alert("Digibizz Student LMS", "Student CNIC missing in profile. Please contact support.");
        return;
      }
      await studentApi.uploadStudentDoc({
        std_cnic: stdCnic,
        std_user_id: studentCtx.user_id,
        tb_id: studentCtx.tb_id,
        doc_type: selectedDocType,
        doc_status: 0,
        doc_date: new Date().toISOString(),
        fileUri: file.uri,
        fileName: file.name || `${selectedDocType}.pdf`,
        mimeType: file.mimeType || "application/octet-stream",
      });
      Alert.alert("Digibizz Student LMS", "Document uploaded.");
      await loadFeature();
    } catch (error) {
      Alert.alert("Digibizz Student LMS", getApiErrorMessage(error, "Unable to upload document."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeature();
    setRefreshing(false);
  };

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={items}
        keyExtractor={(_, idx) => `${key}-${idx}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <Text className="text-kesari-text text-xl font-bold mb-3">{title}</Text>
            {usingCachedData && (
              <StatusBadge
                variant="warning"
                text="Offline mode: showing last synced records."
              />
            )}
            {lastSynced && (
              <Text className="text-kesari-muted mb-2">
                Last synced: {formatLastSynced(lastSynced)}
              </Text>
            )}
            {key === "leave" && (
              <Card title="Apply For Leave">
                <TextInput
                  value={leaveDate}
                  onChangeText={setLeaveDate}
                  placeholder="Leave date (YYYY-MM-DD)"
                  className="min-h-12 border border-gray-200 rounded-xl px-3 mb-2 text-kesari-text"
                />
                <TextInput
                  value={leaveSubject}
                  onChangeText={setLeaveSubject}
                  placeholder="Leave subject"
                  className="min-h-12 border border-gray-200 rounded-xl px-3 mb-2 text-kesari-text"
                />
                <TextInput
                  value={leaveBody}
                  onChangeText={setLeaveBody}
                  placeholder="Leave reason"
                  multiline
                  className="min-h-24 border border-gray-200 rounded-xl px-3 py-2 text-kesari-text"
                />
                <TouchableOpacity
                  onPress={submitLeave}
                  disabled={submitting}
                  className="min-h-12 mt-3 rounded-xl items-center justify-center bg-orange-500"
                >
                  <Text className="text-white font-semibold">{submitting ? "Submitting..." : "Submit Leave"}</Text>
                </TouchableOpacity>
              </Card>
            )}
            {key === "docs" && (
              <Card title="Upload Student Document">
                <View className="flex-row flex-wrap">
                  {docTypes.map((doc) => (
                    <TouchableOpacity
                      key={doc}
                      onPress={() => setSelectedDocType(doc)}
                      className="min-h-12 px-3 rounded-xl mr-2 mb-2 items-center justify-center border"
                      style={{
                        borderColor: selectedDocType === doc ? "#FF9933" : "#E5E7EB",
                        backgroundColor: selectedDocType === doc ? "#FFF1E6" : "#FFFFFF",
                      }}
                    >
                      <Text
                        style={{ color: selectedDocType === doc ? "#FF9933" : "#6B7280" }}
                      >
                        {doc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={pickAndUploadDoc}
                  disabled={submitting}
                  className="min-h-12 mt-2 rounded-xl items-center justify-center bg-orange-500"
                >
                  <Text className="text-white font-semibold">
                    {submitting ? "Uploading..." : "Pick & Upload File"}
                  </Text>
                </TouchableOpacity>
              </Card>
            )}
            {key === "tickets" && (
              <Card title="Create Ticket">
                <TextInput
                  value={ticketSubject}
                  onChangeText={setTicketSubject}
                  placeholder="Ticket subject"
                  className="min-h-12 border border-gray-200 rounded-xl px-3 mb-2 text-kesari-text"
                />
                <TextInput
                  value={ticketBody}
                  onChangeText={setTicketBody}
                  placeholder="Describe issue"
                  multiline
                  className="min-h-24 border border-gray-200 rounded-xl px-3 py-2 text-kesari-text"
                />
                <TouchableOpacity
                  onPress={pickTicketAttachment}
                  className="min-h-12 mt-2 rounded-xl items-center justify-center border border-orange-200"
                >
                  <Text className="text-kesari-text font-semibold">
                    {ticketFile ? `Attached: ${ticketFile.name}` : "Attach File (Optional)"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submitTicket}
                  disabled={submitting}
                  className="min-h-12 mt-3 rounded-xl items-center justify-center bg-orange-500"
                >
                  <Text className="text-white font-semibold">{submitting ? "Creating..." : "Create Ticket"}</Text>
                </TouchableOpacity>
              </Card>
            )}
            {key === "feedback" && (
              <Card title="Submit Feedback">
                <TextInput
                  value={feedbackBody}
                  onChangeText={setFeedbackBody}
                  placeholder="Write your weekly feedback"
                  multiline
                  className="min-h-24 border border-gray-200 rounded-xl px-3 py-2 text-kesari-text"
                />
                <TouchableOpacity
                  onPress={submitFeedback}
                  disabled={submitting}
                  className="min-h-12 mt-3 rounded-xl items-center justify-center bg-orange-500"
                >
                  <Text className="text-white font-semibold">{submitting ? "Sending..." : "Send Feedback"}</Text>
                </TouchableOpacity>
              </Card>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Card
            title={
              key === "recordings"
                ? "Lecture Recording"
                : item.ca_title ||
                  item.ticket_subject ||
                  item.quiz_title ||
                  item.ls_title ||
                  item.lr_title ||
                  item.earning_platform ||
                  "Record"
            }
          >
            <View>
              {key === "recordings" ? (
                <View>
                  {(() => {
                    const topic = String(
                      item.lr_title ||
                        item.title ||
                        item.recording_title ||
                        item.lecture_title ||
                        item.lr_topic_title ||
                        ""
                    ).trim();
                    const detailsRaw = String(
                      item.lr_topics ||
                        item.topics ||
                        item.topic_details ||
                        item.lr_topic_details ||
                        item.description ||
                        item.lr_description ||
                        ""
                    ).trim();
                    const detailsText =
                      !detailsRaw || looksLikeLink(detailsRaw) || looksLikeDate(detailsRaw)
                        ? "Topic details not provided"
                        : detailsRaw;
                    return (
                      <View>
                        <BulletText text={`Topic: ${topic || "N/A"}`} />
                        <BulletText text={`Topic Details: ${detailsText}`} />
                      </View>
                    );
                  })()}
                  <BulletText
                    text={`Date: ${String(
                      item.lr_date || item.recording_date || item.lr_added_on || item.date || "N/A"
                    )}`}
                  />
                  {(() => {
                    const recordingLink = String(
                      item.lr_link || item.recording_link || item.link || item.url || ""
                    ).trim();
                    if (!recordingLink) return null;
                    return (
                      <TouchableOpacity
                        onPress={() => openLink(recordingLink)}
                        className="min-h-12 mt-2 rounded-xl items-center justify-center border border-orange-200 bg-orange-50"
                      >
                        <Text className="text-kesari-text font-semibold">Open Link</Text>
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              ) : (
                <>
              {Object.entries(item)
                .slice(0, 6)
                .map(([k, v]) => (
                  <View key={k}>
                    <BulletText text={`${k}: ${String(v)}`} />
                    {looksLikeLink(v) && (
                      <TouchableOpacity
                        onPress={() => openLink(String(v))}
                        className="min-h-12 mt-1 mb-2 rounded-xl items-center justify-center border border-orange-200 bg-orange-50"
                      >
                        <Text className="text-kesari-text font-semibold">Open Link</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                </>
              )}
              {key === "quiz" && item.quiz_code && (
                <TouchableOpacity
                  onPress={() => startQuizAttempt(item.quiz_code)}
                  className="min-h-12 mt-3 rounded-xl items-center justify-center bg-amber-400"
                >
                  <Text className="text-kesari-text font-semibold">Start Quiz</Text>
                </TouchableOpacity>
              )}
              {key === "tickets" && item.ticket_id && (
                <TouchableOpacity
                  onPress={() => router.push(`/feature/ticket/${item.ticket_id}`)}
                  className="min-h-12 mt-2 rounded-xl items-center justify-center border border-orange-200"
                >
                  <Text className="text-kesari-text font-semibold">Open Thread</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View className="bg-white rounded-2xl p-5 border border-orange-100">
            <Text className="text-kesari-text font-semibold">
              {loadError ? "Unable to load records" : "No records found"}
            </Text>
            <Text className="text-kesari-muted mt-1">
              {loadError || "Pull down to refresh this section."}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}
