package com.liaoran.app.data.repository

import com.liaoran.app.data.api.ApiClient
import com.liaoran.app.data.model.*

class LiaoranRepository {
    private val api = ApiClient.apiService

    // === 认证 ===
    suspend fun login(phone: String, code: String): Result<LoginData> = runCatching {
        val response = api.login(LoginRequest(phone, code))
        if (response.code == 0 && response.data != null) {
            ApiClient.setToken(response.data.token)
            response.data
        } else throw Exception("登录失败")
    }

    suspend fun register(email: String, password: String, nickname: String): Result<LoginData> = runCatching {
        val response = api.register(mapOf(
            "email" to email,
            "password" to password,
            "nickname" to nickname
        ))
        if (response.code == 0 && response.data != null) {
            ApiClient.setToken(response.data.token)
            response.data
        } else throw Exception("注册失败")
    }

    suspend fun getMe(): Result<UserInfo> = runCatching {
        val response = api.getMe()
        response.data ?: throw Exception("获取用户信息失败")
    }

    suspend fun logout() {
        runCatching { api.logout() }
        ApiClient.setToken(null)
    }

    // === 测评 ===
    suspend fun getScales(category: String? = null): Result<List<AssessmentScale>> = runCatching {
        api.getScales(category).data ?: emptyList()
    }

    suspend fun getQuestions(scaleId: String): Result<ScaleQuestions> = runCatching {
        api.getQuestions(scaleId).data ?: throw Exception("获取题目失败")
    }

    suspend fun submitAssessment(scaleId: String, answers: List<AssessmentAnswer>): Result<AssessmentResult> = runCatching {
        api.submitAssessment(scaleId, mapOf("answers" to answers)).data ?: throw Exception("提交失败")
    }

    // === 对话 ===
    suspend fun getSessions(): Result<List<ChatSession>> = runCatching {
        api.getSessions().data ?: emptyList()
    }

    suspend fun createSession(agentType: String): Result<NewSessionResponse> = runCatching {
        api.createSession(mapOf("agentType" to agentType)).data ?: throw Exception("创建对话失败")
    }

    suspend fun sendMessage(sessionId: String, content: String): Result<SendMessageResponse> = runCatching {
        api.sendMessage(sessionId, mapOf("content" to content)).data ?: throw Exception("发送失败")
    }

    // === 树洞 ===
    suspend fun getTreeholeEntries(): Result<List<TreeholeEntry>> = runCatching {
        api.getTreeholeEntries().data ?: emptyList()
    }

    suspend fun createTreehole(content: String, mood: String, moodIntensity: Int): Result<TreeholeEntry> = runCatching {
        api.createTreehole(mapOf(
            "content" to content,
            "mood" to mood,
            "moodIntensity" to moodIntensity,
            "privacy" to "public"
        )).data ?: throw Exception("发布失败")
    }

    // === 心情打卡 ===
    suspend fun checkin(mood: String, intensity: Int): Result<CheckinResponse> = runCatching {
        api.checkin(CheckinRequest(mood, intensity)).data ?: throw Exception("打卡失败")
    }

    // === 积分 ===
    suspend fun getPointsBalance(): Result<PointsBalance> = runCatching {
        api.getPointsBalance().data ?: PointsBalance(0, 0, 0)
    }

    // === 会员 ===
    suspend fun getMemberPlans(): Result<List<MemberPlan>> = runCatching {
        api.getMemberPlans().data ?: emptyList()
    }

    suspend fun getMemberStatus(): Result<MemberStatus> = runCatching {
        api.getMemberStatus().data ?: MemberStatus(0, "免费用户", null, emptyList(), false)
    }

    // === 统计 ===
    suspend fun getUserStats(): Result<UserStats> = runCatching {
        api.getUserStats().data ?: UserStats(0, 0, 0, 0, 0)
    }
}
