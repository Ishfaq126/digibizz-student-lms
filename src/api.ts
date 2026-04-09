import axios from "axios";
import { DashboardData, StudentContext } from "./types";

const API = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export const http = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export function setAuthToken(token: string | null) {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common.Authorization;
  }
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as any)?.message ||
      (error.response?.data as any)?.error ||
      fallback
    );
  }
  return fallback;
}

function isStudentLikeRole(role: unknown) {
  if (typeof role !== "string") return false;
  const normalized = role.trim().toLowerCase();
  return (
    normalized === "student" ||
    normalized === "std" ||
    normalized === "trainee" ||
    normalized.includes("student")
  );
}

export async function loginStudent(user_username: string, user_password: string) {
  try {
    const { data } = await http.post("/admin/login", { user_username, user_password });
    const user = data?.admin || data?.user || data?.student;
    const role = user?.user_type || user?.type || data?.user_type;
    if (!user || !isStudentLikeRole(role)) {
      throw new Error("Only student accounts are allowed in this app.");
    }
    const resolvedToken = data?.token || data?.admin?.token || data?.user?.token;
    return {
      raw: data,
      token: resolvedToken,
      user: {
        id: Number(user.id ?? user.user_id ?? 0),
        user_name: user.user_name ?? user.name ?? "",
        user_username: user.user_username ?? user.username ?? user.user_email ?? "",
        user_email: user.user_email ?? user.email ?? "",
        user_type: typeof role === "string" ? role : "student",
        tb_id: user.tb_id ?? data?.tb_id,
        center_id: user.center_id ?? data?.center_id,
        course_id: user.course_id ?? data?.course_id,
        std_rollno: user.std_rollno ?? user.roll_no ?? user.rollNumber,
        center_name:
          user.center_name ?? user.center_title ?? data?.center_name ?? data?.center?.center_title,
        course_name:
          user.course_name ?? user.course_title ?? data?.course_name ?? data?.course?.course_title,
        tb_name:
          user.tb_name ?? user.batch_name ?? data?.tb_name ?? data?.tb?.tb_name ?? data?.batch_name,
        phone: user.user_mobile ?? user.phone ?? user.mobile,
        cnic: user.std_cnic ?? user.cnic,
        district: user.district_name ?? user.district,
        qualification: user.qualification_name ?? user.qualification,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const serverMessage =
        (error.response?.data as any)?.message ||
        (error.response?.data as any)?.error;
      if (status === 401) {
        throw new Error(serverMessage || "Invalid username/email or password.");
      }
      throw new Error(serverMessage || "Unable to login. Please try again.");
    }
    throw error;
  }
}

export async function getStudentDashboard(ctx: StudentContext): Promise<DashboardData> {
  const { data } = await http.get(
    `/dashboard/student/${ctx.user_id}/${ctx.tb_id}/${ctx.user_type}`
  );
  return data;
}

export const studentApi = {
  docs: (user_id: number) => http.get(`/studentDocs/${user_id}`),
  uploadLeave: (payload: Record<string, string | number>) => {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      form.append(key, String(value ?? ""));
    });
    return http.post("/studentLeave/leaves", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  leaveList: (user_id: number) => http.get(`/studentLeave/leaves/${user_id}`),
  quizzes: (user_id: number, tb_id: number) => http.get(`/quiz/student/${user_id}/${tb_id}`),
  quizStart: (payload: Record<string, unknown>) => http.post("/quiz/start", payload),
  quizSubmit: (payload: Record<string, unknown>) => http.post("/quiz/submit", payload),
  assignments: (tb_id: number, user_id: number) =>
    http.get(`/assignment/${tb_id}`, { params: { user_id } }),
  assignmentSubmit: (payload: Record<string, unknown>) =>
    http.post("/assignment-submissions/", payload),
  tickets: (params: Record<string, unknown>) => http.get("/tickets/all", { params }),
  createTicket: (payload: Record<string, unknown>) => http.post("/tickets/create", payload),
  createTicketWithAttachment: (payload: {
    ticket_subject: string;
    ticket_description: string;
    ticket_date: string;
    ticket_time: string;
    ticket_to: string;
    t_id: number;
    tb_id: number;
    center_id: number;
    course_id: number;
    std_rollno: string;
    user_id: number;
    fileUri: string;
    fileName: string;
    mimeType?: string;
  }) => {
    const form = new FormData();
    form.append("ticket_subject", payload.ticket_subject);
    form.append("ticket_description", payload.ticket_description);
    form.append("ticket_date", payload.ticket_date);
    form.append("ticket_time", payload.ticket_time);
    form.append("ticket_to", payload.ticket_to);
    form.append("t_id", String(payload.t_id));
    form.append("tb_id", String(payload.tb_id));
    form.append("center_id", String(payload.center_id));
    form.append("course_id", String(payload.course_id));
    form.append("std_rollno", payload.std_rollno);
    form.append("user_id", String(payload.user_id));
    form.append("ticket_attachment", {
      uri: payload.fileUri,
      name: payload.fileName,
      type: payload.mimeType || "application/octet-stream",
    } as any);
    return http.post("/tickets/create", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  ticketById: (id: number, user_id: number, tb_id: number) =>
    http.get(`/tickets/${id}/${user_id}/${tb_id}`),
  ticketReplies: (ticket_no: string) => http.get(`/tickets/replies/${ticket_no}`),
  createTicketReply: (payload: {
    ticket_no: string;
    reply_by: string;
    reply_message: string;
    ticket_status?: string;
  }) => http.post("/tickets/reply", payload),
  createTicketReplyWithAttachment: (payload: {
    ticket_no: string;
    reply_by: string;
    reply_message: string;
    ticket_status?: string;
    fileUri: string;
    fileName: string;
    mimeType?: string;
  }) => {
    const form = new FormData();
    form.append("ticket_no", payload.ticket_no);
    form.append("reply_by", payload.reply_by);
    form.append("reply_message", payload.reply_message);
    form.append("ticket_status", payload.ticket_status || "ANSWERED");
    form.append("ticket_attachment", {
      uri: payload.fileUri,
      name: payload.fileName,
      type: payload.mimeType || "application/octet-stream",
    } as any);
    return http.post("/tickets/reply", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  recordings: (params: Record<string, unknown>) =>
    http.get("/lecture-recordings", { params }),
  resources: (params: Record<string, unknown>) =>
    http.get("/learning-resources", { params }),
  feedbackCreate: (payload: Record<string, unknown>) => http.post("/feedback/", payload),
  feedbackList: (tb_id: number, user_id: number, user_type: string) =>
    http.get(`/feedback/${tb_id}/${user_id}/${user_type}`),
  announcements: (tb_id: number, user_id: number, user_type: string) =>
    http.get("/announcements", { params: { tb_id, user_id, user_type } }),
  centers: () => http.get("/center"),
  courses: () => http.get("/courses"),
  trainingBatches: () => http.get("/training_batches"),
  courseModules: (tb_id: number, course_id: number, center_id: number) =>
    http.get(`/course-modules/${tb_id}/${course_id}/${center_id}`),
  earnings: (tb_id: number, user_id: number) =>
    http.get(`/earnings/profile/${tb_id}`, { params: { tb_id, user_id } }),
  studentProfileById: (user_id: number) => http.get(`/student/getStudentById/${user_id}`),
  uploadStudentDoc: (payload: {
    std_cnic: string;
    std_user_id: number;
    tb_id: number;
    doc_type: string;
    doc_status: number;
    doc_date: string;
    fileUri: string;
    fileName: string;
    mimeType?: string;
  }) => {
    const form = new FormData();
    form.append("std_cnic", payload.std_cnic);
    form.append("std_user_id", String(payload.std_user_id));
    form.append("tb_id", String(payload.tb_id));
    form.append("doc_type", payload.doc_type);
    form.append("doc_file", payload.fileName);
    form.append("doc_status", String(payload.doc_status));
    form.append("doc_date", payload.doc_date);
    form.append("student_docs", {
      uri: payload.fileUri,
      name: payload.fileName,
      type: payload.mimeType || "application/octet-stream",
    } as any);

    return http.post("/studentDocs/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  assignmentSubmitSimple: (payload: {
    std_rollno: string;
    tb_id: number;
    as_id: number;
    as_submission_comment: string;
  }) => {
    const form = new FormData();
    form.append("std_rollno", payload.std_rollno);
    form.append("tb_id", String(payload.tb_id));
    form.append("as_id", String(payload.as_id));
    form.append("as_submission_comment", payload.as_submission_comment);
    return http.post("/assignment-submissions/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  assignmentSubmitWithAttachment: (payload: {
    std_rollno: string;
    tb_id: number;
    as_id: number;
    as_submission_comment: string;
    fileUri: string;
    fileName: string;
    mimeType?: string;
  }) => {
    const form = new FormData();
    form.append("std_rollno", payload.std_rollno);
    form.append("tb_id", String(payload.tb_id));
    form.append("as_id", String(payload.as_id));
    form.append("as_submission_comment", payload.as_submission_comment);
    form.append("assignment_attachment", {
      uri: payload.fileUri,
      name: payload.fileName,
      type: payload.mimeType || "application/octet-stream",
    } as any);
    return http.post("/assignment-submissions/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
