/**
 * 了然API服务 - HarmonyOS版
 */
import http from '@ohos.net.http';
import { ApiResponse, LoginResponse, LoginData, UserInfo, AssessmentScale, ScaleQuestions, AssessmentResult, ChatSession, ChatMessage, TreeholeEntry, UserStats } from '../model/Models';

const BASE_URL = 'http://10.0.2.2:3000';

let authToken: string | null = null;

export function setToken(token: string | null): void {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(method: http.RequestMethod, path: string, body?: object): Promise<ApiResponse<T>> {
  const httpRequest = http.createHttp();
  const url = `${BASE_URL}${path}`;

  const response = await httpRequest.request(url, {
    method: method,
    header: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
    },
    extraData: body ? JSON.stringify(body) : undefined,
    connectTimeout: 30000,
    readTimeout: 30000
  });

  httpRequest.destroy();

  if (response.responseCode === 200) {
    return JSON.parse(response.result as string) as ApiResponse<T>;
  }
  throw new Error(`请求失败: ${response.responseCode}`);
}

// === 认证 ===
export async function login(phone: string, code: string): Promise<LoginData> {
  const res = await request<LoginData>(http.RequestMethod.POST, '/api/v1/auth/login', { phone, code });
  if (res.code === 0 && res.data) {
    authToken = res.data.token;
    return res.data;
  }
  throw new Error('登录失败');
}

export async function getMe(): Promise<UserInfo> {
  const res = await request<UserInfo>(http.RequestMethod.GET, '/api/v1/auth/me');
  return res.data!;
}

// === 测评 ===
export async function getScales(category?: string): Promise<AssessmentScale[]> {
  const path = category ? `/api/v1/assessments/scales?category=${category}` : '/api/v1/assessments/scales';
  const res = await request<AssessmentScale[]>(http.RequestMethod.GET, path);
  return res.data || [];
}

export async function getQuestions(scaleId: string): Promise<ScaleQuestions> {
  const res = await request<ScaleQuestions>(http.RequestMethod.GET, `/api/v1/assessments/scales/${scaleId}/questions`);
  return res.data!;
}

export async function submitAssessment(scaleId: string, answers: object[]): Promise<AssessmentResult> {
  const res = await request<AssessmentResult>(http.RequestMethod.POST, `/api/v1/assessments/scales/${scaleId}/submit`, { answers });
  return res.data!;
}

// === 对话 ===
export async function getSessions(): Promise<ChatSession[]> {
  const res = await request<ChatSession[]>(http.RequestMethod.GET, '/api/v1/chat/sessions');
  return res.data || [];
}

export async function createSession(agentType: string): Promise<{ session: ChatSession; welcomeMessage: ChatMessage }> {
  const res = await request<any>(http.RequestMethod.POST, '/api/v1/chat/sessions', { agentType });
  return res.data;
}

export async function sendMessage(sessionId: string, content: string): Promise<{ aiMessage: ChatMessage }> {
  const res = await request<any>(http.RequestMethod.POST, `/api/v1/chat/sessions/${sessionId}/messages`, { content });
  return res.data;
}

// === 树洞 ===
export async function getTreeholeEntries(): Promise<TreeholeEntry[]> {
  const res = await request<TreeholeEntry[]>(http.RequestMethod.GET, '/api/v1/treehole/entries');
  return res.data || [];
}

export async function createTreehole(content: string, mood: string, intensity: number): Promise<TreeholeEntry> {
  const res = await request<TreeholeEntry>(http.RequestMethod.POST, '/api/v1/treehole/entries', { content, mood, moodIntensity: intensity, privacy: 'public' });
  return res.data!;
}

// === 打卡 ===
export async function checkin(mood: string, intensity: number): Promise<any> {
  const res = await request<any>(http.RequestMethod.POST, '/api/v1/users/checkin', { mood, moodIntensity: intensity });
  return res.data;
}

export async function getUserStats(): Promise<UserStats> {
  const res = await request<UserStats>(http.RequestMethod.GET, '/api/v1/users/stats');
  return res.data!;
}
