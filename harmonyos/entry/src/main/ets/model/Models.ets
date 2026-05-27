/**
 * 了然APP - 数据模型
 */

export interface ApiResponse<T> {
  code: number;
  message?: string;
  data?: T;
}

export interface UserInfo {
  id: string;
  phone?: string;
  email?: string;
  nickname: string;
  avatar?: string;
  gender?: string;
  memberLevel: number;
  status?: string;
}

export interface LoginResponse {
  code: number;
  data?: LoginData;
}

export interface LoginData {
  token: string;
  refreshToken: string;
  user: UserInfo;
}

export interface AssessmentScale {
  id: string;
  name: string;
  category: string;
  description: string;
  question_count: number;
  estimated_minutes: number;
  completedCount: number;
}

export interface ScaleQuestions {
  scale: ScaleInfo;
  questions: AssessmentQuestion[];
}

export interface ScaleInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  questionCount: number;
  estimatedMinutes: number;
}

export interface AssessmentQuestion {
  id: string;
  question_order: number;
  question_text: string;
  question_type: string;
  options?: QuestionOption[];
  dimension?: string;
}

export interface QuestionOption {
  label: string;
  score: number;
}

export interface AssessmentResult {
  recordId: string;
  scaleName: string;
  totalScore: number;
  maxScore: number;
  severity: string;
  severityLabel: string;
  interpretation: string;
  scores: { total: number; severity: string; severityLabel: string };
  completedAt: string;
  pointsEarned: number;
}

export interface ChatSession {
  id: string;
  agent_type: string;
  status: string;
  started_at: string;
}

export interface ChatMessage {
  id: string;
  session_id?: string;
  role: string;
  content: string;
  created_at?: string;
  createdAt?: string;
}

export interface TreeholeEntry {
  id: string;
  user_id: string;
  content: string;
  mood?: string;
  mood_intensity?: number;
  privacy?: string;
  created_at?: string;
  createdAt?: string;
}

export interface UserStats {
  assessCount: number;
  chatCount: number;
  treeholeCount: number;
  checkinCount: number;
  streak: number;
}
