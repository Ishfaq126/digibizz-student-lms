export type AuthUser = {
  id: number;
  user_name: string;
  user_username: string;
  user_email: string;
  user_type: string;
  tb_id?: number;
  center_id?: number;
  course_id?: number;
  std_rollno?: string;
  center_name?: string;
  course_name?: string;
  tb_name?: string;
  phone?: string;
  cnic?: string;
  district?: string;
  qualification?: string;
};

export type StudentContext = {
  user_id: number;
  tb_id: number;
  center_id: number;
  course_id: number;
  user_type: string;
  std_rollno?: string;
  std_cnic?: string;
};

export type DashboardData = {
  statistics: { label: string; value: string }[];
  dashboardStats: {
    earnings: number;
    pendingAssignments: number;
    pendingQuizzes: number;
    overallProgress: number;
    attendanceProgress: number;
    notSubmittedAssignments: number;
  };
  recentAssignments: { title: string; points: number; deadline: string }[];
  latestAnnouncement?: { ca_title: string; ca_message: string } | null;
};
