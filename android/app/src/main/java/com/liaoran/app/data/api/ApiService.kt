package com.liaoran.app.data.api

import com.liaoran.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    // === 认证 ===
    @POST("api/v1/auth/send-code")
    suspend fun sendCode(@Body body: Map<String, String>): ApiResponse<Any>

    @POST("api/v1/auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @POST("api/v1/auth/register")
    suspend fun register(@Body body: Map<String, String>): LoginResponse

    @GET("api/v1/auth/me")
    suspend fun getMe(): ApiResponse<UserInfo>

    @POST("api/v1/auth/logout")
    suspend fun logout(): ApiResponse<Any>

    // === 用户 ===
    @PUT("api/v1/users/profile")
    suspend fun updateProfile(@Body body: Map<String, String>): ApiResponse<UserInfo>

    @POST("api/v1/users/checkin")
    suspend fun checkin(@Body body: CheckinRequest): ApiResponse<CheckinResponse>

    @GET("api/v1/users/stats")
    suspend fun getUserStats(): ApiResponse<UserStats>

    // === 测评 ===
    @GET("api/v1/assessments/scales")
    suspend fun getScales(@Query("category") category: String? = null): ApiResponse<List<AssessmentScale>>

    @GET("api/v1/assessments/scales/{id}/questions")
    suspend fun getQuestions(@Path("id") scaleId: String): ApiResponse<ScaleQuestions>

    @POST("api/v1/assessments/scales/{id}/submit")
    suspend fun submitAssessment(
        @Path("id") scaleId: String,
        @Body body: Map<String, List<AssessmentAnswer>>
    ): ApiResponse<AssessmentResult>

    @GET("api/v1/assessments/history")
    suspend fun getAssessmentHistory(): ApiResponse<List<AssessmentResult>>

    // === 对话 ===
    @GET("api/v1/chat/sessions")
    suspend fun getSessions(): ApiResponse<List<ChatSession>>

    @POST("api/v1/chat/sessions")
    suspend fun createSession(@Body body: Map<String, String>): ApiResponse<NewSessionResponse>

    @GET("api/v1/chat/sessions/{id}/messages")
    suspend fun getMessages(@Path("id") sessionId: String): ApiResponse<Map<String, Any>>

    @POST("api/v1/chat/sessions/{id}/messages")
    suspend fun sendMessage(
        @Path("id") sessionId: String,
        @Body body: Map<String, String>
    ): ApiResponse<SendMessageResponse>

    @DELETE("api/v1/chat/sessions/{id}")
    suspend fun deleteSession(@Path("id") sessionId: String): ApiResponse<Any>

    // === 树洞 ===
    @GET("api/v1/treehole/entries")
    suspend fun getTreeholeEntries(@Query("limit") limit: Int = 20): ApiResponse<List<TreeholeEntry>>

    @GET("api/v1/treehole/my")
    suspend fun getMyTreehole(): ApiResponse<List<TreeholeEntry>>

    @POST("api/v1/treehole/entries")
    suspend fun createTreehole(@Body body: Map<String, Any>): ApiResponse<TreeholeEntry>

    @DELETE("api/v1/treehole/entries/{id}")
    suspend fun deleteTreehole(@Path("id") entryId: String): ApiResponse<Any>

    // === 积分 ===
    @GET("api/v1/points/balance")
    suspend fun getPointsBalance(): ApiResponse<PointsBalance>

    @GET("api/v1/points/records")
    suspend fun getPointsRecords(): ApiResponse<List<Any>>

    // === 会员 ===
    @GET("api/v1/members/plans")
    suspend fun getMemberPlans(): ApiResponse<List<MemberPlan>>

    @GET("api/v1/members/status")
    suspend fun getMemberStatus(): ApiResponse<MemberStatus>

    @POST("api/v1/members/subscribe")
    suspend fun subscribe(@Body body: Map<String, Int>): ApiResponse<Any>
}
