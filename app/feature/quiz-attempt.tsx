import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/src/auth";
import { getApiErrorMessage, studentApi } from "@/src/api";
import { Loading, Screen } from "@/src/ui";

type QuizQuestion = {
  q_id: number;
  q_title: string;
  a1: string;
  a2: string;
  a3: string;
  a4: string;
};

export default function QuizAttemptScreen() {
  const { quiz_code } = useLocalSearchParams<{ quiz_code: string }>();
  const { studentCtx } = useAuth();
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!studentCtx || !quiz_code) return;
      try {
        const { data } = await studentApi.quizzes(studentCtx.user_id, studentCtx.tb_id);
        const list = Array.isArray(data) ? data : [];
        const selected = list.find((q: any) => q.quiz_code === quiz_code);
        if (!selected) {
          Alert.alert("Digibizz Student LMS", "Quiz not found.");
          router.back();
          return;
        }
        const session = `${Date.now()}`;
        await studentApi.quizStart({
          attempt_session: session,
          quiz_code: selected.quiz_code,
          user_id: studentCtx.user_id,
          tb_id: studentCtx.tb_id,
          course_id: studentCtx.course_id,
          center_id: studentCtx.center_id,
          marks_obt: 0,
          attempt_date: new Date().toISOString().slice(0, 10),
          attempt_start_time: new Date().toISOString(),
          attempt_end_time: "",
          attempt_status: 0,
        });
        setSessionId(session);
        setQuiz(selected);
        setQuestions(selected.questions || []);
        setTimeLeft((selected.quiz_time_limit || 10) * 60);
      } finally {
        setLoading(false);
      }
    })();
  }, [quiz_code, studentCtx]);

  useEffect(() => {
    if (!timeLeft) return;
    const id = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const currentQ = questions[current];
  const options = currentQ ? [currentQ.a1, currentQ.a2, currentQ.a3, currentQ.a4] : [];

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round(((current + 1) / questions.length) * 100);
  }, [current, questions.length]);

  const unansweredCount = useMemo(
    () => questions.filter((q) => !answers[q.q_id]).length,
    [questions, answers]
  );

  const submitQuiz = async () => {
    if (!sessionId || !questions.length) return;
    const payloadAnswers = questions.map((q) => ({
      q_id: q.q_id,
      answer: answers[q.q_id] || "",
    }));
    if (payloadAnswers.some((a) => !a.answer)) {
      Alert.alert("Digibizz Student LMS", "Please answer all questions before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await studentApi.quizSubmit({
        attempt_session: sessionId,
        answers: payloadAnswers,
      });
      Alert.alert("Digibizz Student LMS", "Quiz submitted successfully.");
      router.replace("/feature/quiz");
    } catch (error) {
      Alert.alert("Digibizz Student LMS", getApiErrorMessage(error, "Unable to submit quiz."));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (timeLeft === 0 && !loading && questions.length) {
      submitQuiz();
    }
  }, [timeLeft, loading, questions.length]);

  if (loading) return <Loading />;
  if (!quiz || !currentQ) return <Screen><View className="p-4"><Text>No quiz questions found.</Text></View></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-kesari-text text-lg font-bold">{quiz.quiz_title || "Quiz"}</Text>
        <View className="flex-row justify-between mt-2 mb-3">
          <Text className="text-kesari-muted">Question {current + 1}/{questions.length}</Text>
          <Text className="text-kesari-text font-semibold">{formatTime(timeLeft)}</Text>
        </View>
        <Text className="text-kesari-muted mb-2">Unanswered: {unansweredCount}</Text>
        <View className="h-2 rounded-full bg-gray-200 mb-4">
          <View className="h-2 rounded-full bg-orange-500" style={{ width: `${progress}%` }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row">
            {questions.map((q, idx) => {
              const answered = !!answers[q.q_id];
              const active = idx === current;
              return (
                <TouchableOpacity
                  key={q.q_id}
                  onPress={() => setCurrent(idx)}
                  className="min-h-12 min-w-12 rounded-xl items-center justify-center mr-2 border"
                  style={{
                    borderColor: active ? "#FF9933" : "#E5E7EB",
                    backgroundColor: answered ? "#ECFDF5" : "#FFFFFF",
                  }}
                >
                  <Text style={{ color: active ? "#FF9933" : "#1F2937" }}>{idx + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View className="bg-white rounded-2xl p-4 border border-orange-100">
          <Text className="text-kesari-text font-semibold mb-3">{currentQ.q_title}</Text>
          {options.map((opt) => {
            const active = answers[currentQ.q_id] === opt;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => setAnswers((prev) => ({ ...prev, [currentQ.q_id]: opt }))}
                className="min-h-12 rounded-xl px-3 py-3 mb-2 justify-center border"
                style={{
                  borderColor: active ? "#FF9933" : "#E5E7EB",
                  backgroundColor: active ? "#FFF1E6" : "#FFFFFF",
                }}
              >
                <Text style={{ color: active ? "#FF9933" : "#1F2937" }}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="flex-row mt-4">
          <TouchableOpacity
            onPress={() => setCurrent((p) => Math.max(0, p - 1))}
            className="flex-1 min-h-12 rounded-xl items-center justify-center border border-gray-300 mr-2"
          >
            <Text className="text-kesari-text font-semibold">Previous</Text>
          </TouchableOpacity>
          {current === questions.length - 1 ? (
            <TouchableOpacity
              onPress={submitQuiz}
              disabled={submitting}
              className="flex-1 min-h-12 rounded-xl items-center justify-center bg-orange-500"
            >
              <Text className="text-white font-semibold">{submitting ? "Submitting..." : "Submit"}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setCurrent((p) => Math.min(questions.length - 1, p + 1))}
              className="flex-1 min-h-12 rounded-xl items-center justify-center bg-amber-400"
            >
              <Text className="text-kesari-text font-semibold">Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
