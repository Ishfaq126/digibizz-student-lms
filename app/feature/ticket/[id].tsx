import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "@/src/auth";
import { getApiErrorMessage, studentApi } from "@/src/api";
import { Card, Loading, Screen } from "@/src/ui";

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { studentCtx } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pickedFile, setPickedFile] = useState<null | {
    uri: string;
    name: string;
    mimeType?: string;
  }>(null);

  const ticketNo = useMemo(() => ticket?.ticket_no || "", [ticket]);

  const load = async () => {
    if (!studentCtx || !id) return;
    setLoading(true);
    try {
      const detail = await studentApi.ticketById(Number(id), studentCtx.user_id, studentCtx.tb_id);
      const data = detail.data?.data || detail.data;
      setTicket(data);
      if (data?.ticket_no) {
        const rep = await studentApi.ticketReplies(data.ticket_no);
        const arr = Array.isArray(rep.data) ? rep.data : rep.data?.data || [];
        setReplies(arr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, studentCtx]);

  const sendReply = async () => {
    if (!message.trim() || !ticketNo) return;
    setSubmitting(true);
    try {
      if (pickedFile) {
        await studentApi.createTicketReplyWithAttachment({
          ticket_no: ticketNo,
          reply_by: "student",
          reply_message: message.trim(),
          ticket_status: "ANSWERED",
          fileUri: pickedFile.uri,
          fileName: pickedFile.name,
          mimeType: pickedFile.mimeType,
        });
      } else {
        await studentApi.createTicketReply({
          ticket_no: ticketNo,
          reply_by: "student",
          reply_message: message.trim(),
          ticket_status: "ANSWERED",
        });
      }
      setMessage("");
      setPickedFile(null);
      await load();
    } catch (error) {
      Alert.alert("Digibizz Student LMS", getApiErrorMessage(error, "Unable to send reply."));
    } finally {
      setSubmitting(false);
    }
  };

  const pickAttachment = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.length) return;
    const file = picked.assets[0];
    setPickedFile({ uri: file.uri, name: file.name || "attachment", mimeType: file.mimeType });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <Loading />;

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={replies}
        keyExtractor={(item, idx) => String(item.treply_id ?? idx)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <Text className="text-kesari-text text-xl font-bold mb-3">Ticket Conversation</Text>
            <Card title={ticket?.ticket_subject || "Ticket"}>
              <Text className="text-kesari-muted">{ticket?.ticket_description || "No description"}</Text>
              <Text className="text-kesari-muted mt-2">Status: {ticket?.ticket_status || "OPEN"}</Text>
            </Card>
          </View>
        }
        renderItem={({ item }) => (
          <Card title={item.reply_by || "Reply"}>
            <Text className="text-kesari-text">{item.reply_message || "-"}</Text>
            <Text className="text-kesari-muted mt-2">
              {item.reply_date || ""} {item.reply_time || ""}
            </Text>
          </Card>
        )}
        ListFooterComponent={
          <Card title="Send Reply">
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Write your message"
              multiline
              className="min-h-24 border border-gray-200 rounded-xl px-3 py-2 text-kesari-text"
            />
            <TouchableOpacity
              onPress={pickAttachment}
              className="min-h-12 mt-2 rounded-xl items-center justify-center border border-orange-200"
            >
              <Text className="text-kesari-text font-semibold">
                {pickedFile ? `Attached: ${pickedFile.name}` : "Attach File (Optional)"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={sendReply}
              disabled={submitting}
              className="min-h-12 mt-3 rounded-xl items-center justify-center bg-orange-500"
            >
              <Text className="text-white font-semibold">{submitting ? "Sending..." : "Send Reply"}</Text>
            </TouchableOpacity>
          </Card>
        }
      />
    </Screen>
  );
}
