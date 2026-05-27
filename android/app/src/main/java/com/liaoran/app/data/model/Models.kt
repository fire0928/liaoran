package com.liaoran.app.data.model

import com.google.gson.annotations.SerializedName

// === 认证 ===
data class LoginRequest(val phone: String, val code: String? = null)
data class LoginResponse(
    val code: Int,
    val data: LoginData?
)
data class LoginData(
    val token: String,
    val refreshToken: String,
    val user: UserInfo
)

data class UserInfo(
    val id: String,
    val phone: String?,
    val email: String?,
    val nickname: String,
    val avatar: String?,
    val gender: String?,
    val memberLevel: Int = 0,
    val status: String? = null
)

// === API通用 ===
data class ApiResponse<T>(
    val code: Int,
    val message: String? = null,
    val data: T? = null
)

// === 测评 ===
data class AssessmentScale(
    val id: String,
    val name: String,
    val category: String,
    val description: String,
    @SerializedName("question_count") val questionCount: Int,
    @SerializedName("estimated_minutes") val estimatedMinutes: Int,
    val completedCount: Int = 0
)

data class ScaleQuestions(
    val scale: ScaleInfo,
    val questions: List<AssessmentQuestion>
)

data class ScaleInfo(
    val id: String,
    val name: String,
    val category: String,
    val description: String,
    val questionCount: Int,
    val estimatedMinutes: Int
)

data class AssessmentQuestion(
    val id: String,
    @SerializedName("question_order") val order: Int,
    @SerializedName("question_text") val text: String,
    @SerializedName("question_type") val type: String,
    val options: List<QuestionOption>?,
    val dimension: String?
)

data class QuestionOption(
    val label: String,
    val score: Int
)

data class AssessmentAnswer(
    @SerializedName("question_id") val questionId: String,
    val score: Int,
    val selectedIndex: Int
)

data class AssessmentResult(
    val recordId: String,
    val scaleName: String,
    val totalScore: Int,
    val maxScore: Int,
    val severity: String,
    val severityLabel: String,
    val interpretation: String,
    val scores: ScoreSummary,
    val completedAt: String,
    val pointsEarned: Int
)

data class ScoreSummary(
    val total: Int,
    val severity: String,
    val severityLabel: String
)

// === 对话 ===
data class ChatSession(
    val id: String,
    @SerializedName("agent_type") val agentType: String,
    val status: String,
    @SerializedName("started_at") val startedAt: String,
    @SerializedName("startedAt") val startedAtAlt: String? = null
)

data class ChatMessage(
    val id: String,
    @SerializedName("session_id") val sessionId: String,
    val role: String,
    val content: String,
    @SerializedName("created_at") val createdAt: String? = null
)

data class NewSessionResponse(
    val session: ChatSession,
    val welcomeMessage: ChatMessage,
    val dailyLimit: DailyLimit?,
    val reminder: String?
)

data class DailyLimit(val used: Int, val max: Int)

data class SendMessageResponse(
    val userMessage: ChatMessage,
    val aiMessage: ChatMessage
)

// === 树洞 ===
data class TreeholeEntry(
    val id: String,
    @SerializedName("user_id") val userId: String,
    val content: String,
    val mood: String?,
    @SerializedName("mood_intensity") val moodIntensity: Int?,
    val privacy: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("createdAt") val createdAtAlt: String? = null
)

// === 积分 ===
data class PointsBalance(
    val balance: Int,
    @SerializedName("lifetime_earned") val lifetimeEarned: Int,
    @SerializedName("lifetime_spent") val lifetimeSpent: Int,
    @SerializedName("lifetimeEarned") val lifetimeEarnedAlt: Int? = null,
    @SerializedName("lifetimeSpent") val lifetimeSpentAlt: Int? = null
)

// === 会员 ===
data class MemberPlan(
    val level: Int,
    val name: String,
    val price: Int,
    val features: List<String>
)

data class MemberStatus(
    val level: Int,
    val planName: String,
    val expiredAt: String?,
    val features: List<String>,
    val isActive: Boolean
)

// === 心情打卡 ===
data class CheckinRequest(val mood: String, val moodIntensity: Int = 3, val note: String? = null)
data class CheckinResponse(
    val mood: String,
    val moodIntensity: Int,
    val streak: Int,
    val pointsEarned: Int,
    val message: String
)

// === 用户统计 ===
data class UserStats(
    val assessCount: Int,
    val chatCount: Int,
    val treeholeCount: Int,
    val checkinCount: Int,
    val streak: Int
)
