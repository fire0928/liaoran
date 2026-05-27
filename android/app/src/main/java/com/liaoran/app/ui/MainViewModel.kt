package com.liaoran.app.ui

import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.liaoran.app.data.api.ApiClient
import com.liaoran.app.data.model.*
import com.liaoran.app.data.repository.LiaoranRepository
import kotlinx.coroutines.launch

enum class Screen {
    LOGIN, HOME, ASSESS, CHAT, TREEHOLE, PROFILE,
    ASSESS_QUESTIONS, ASSESS_RESULT
}

class MainViewModel : ViewModel() {
    val repository = LiaoranRepository()
    // 使用可变状态
    var currentScreen by mutableStateOf(Screen.LOGIN)
    var userInfo by mutableStateOf<UserInfo?>(null)
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var toastMessage by mutableStateOf<String?>(null)

    // 测评
    var scales by mutableStateOf<List<AssessmentScale>>(emptyList())
    var currentScale by mutableStateOf<ScaleInfo?>(null)
    var currentQuestions by mutableStateOf<List<com.liaoran.app.data.model.AssessmentQuestion>>(emptyList())
    var currentQuestionIndex by mutableStateOf(0)
    var answers by mutableStateOf<MutableMap<Int, Int>>(mutableMapOf())
    var assessmentResult by mutableStateOf<AssessmentResult?>(null)

    // 对话
    var chatSessions by mutableStateOf<List<ChatSession>>(emptyList())
    var currentSessionId by mutableStateOf<String?>(null)
    var messages by mutableStateOf<List<ChatMessage>>(emptyList())
    var inputText by mutableStateOf("")

    // 树洞
    var treeholeEntries by mutableStateOf<List<TreeholeEntry>>(emptyList())

    // 统计
    var userStats by mutableStateOf<UserStats?>(null)

    init {
        // 检查是否已登录
        val token = ApiClient.getToken()
        if (token != null) {
            currentScreen = Screen.HOME
            loadUserData()
        }
    }

    fun login(phone: String, code: String) {
        isLoading = true
        viewModelScope.launch {
            repository.login(phone, code).fold(
                onSuccess = {
                    userInfo = it.user
                    currentScreen = Screen.HOME
                    loadUserData()
                },
                onFailure = { errorMessage = it.message }
            )
            isLoading = false
        }
    }

    fun loadUserData() {
        viewModelScope.launch {
            repository.getMe().onSuccess { userInfo = it }
            loadScales()
            loadSessions()
            loadTreehole()
            repository.getUserStats().onSuccess { userStats = it }
        }
    }

    fun loadScales(category: String? = null) {
        viewModelScope.launch {
            repository.getScales(category).onSuccess { scales = it }
        }
    }

    fun startAssessment(scale: AssessmentScale) {
        isLoading = true
        currentQuestionIndex = 0
        answers = mutableMapOf()
        assessmentResult = null

        viewModelScope.launch {
            repository.getQuestions(scale.id).fold(
                onSuccess = {
                    currentScale = it.scale
                    currentQuestions = it.questions
                    currentScreen = Screen.ASSESS_QUESTIONS
                },
                onFailure = { errorMessage = it.message }
            )
            isLoading = false
        }
    }

    fun selectAnswer(questionIndex: Int, score: Int) {
        answers = answers.toMutableMap().apply { put(questionIndex, score) }
    }

    fun submitAssessment() {
        if (currentScale == null) return
        isLoading = true

        val answerList = answers.map { (idx, score) ->
            AssessmentAnswer(
                questionId = currentQuestions[idx].id,
                score = score,
                selectedIndex = score
            )
        }

        viewModelScope.launch {
            repository.submitAssessment(currentScale!!.id, answerList).fold(
                onSuccess = {
                    assessmentResult = it
                    currentScreen = Screen.ASSESS_RESULT
                    loadScales()
                },
                onFailure = { errorMessage = it.message }
            )
            isLoading = false
        }
    }

    fun loadSessions() {
        viewModelScope.launch {
            repository.getSessions().onSuccess { chatSessions = it }
        }
    }

    fun createChatSession(agentType: String) {
        viewModelScope.launch {
            repository.createSession(agentType).fold(
                onSuccess = {
                    currentSessionId = it.session.id
                    messages = listOf(it.welcomeMessage)
                    inputText = ""
                    currentScreen = Screen.CHAT
                },
                onFailure = { errorMessage = it.message }
            )
        }
    }

    fun sendMessage() {
        val text = inputText.trim()
        if (text.isEmpty() || currentSessionId == null) return

        val userMsg = ChatMessage(
            id = "${System.currentTimeMillis()}",
            sessionId = currentSessionId!!,
            role = "user",
            content = text
        )
        messages = messages + userMsg
        inputText = ""

        viewModelScope.launch {
            repository.sendMessage(currentSessionId!!, text).fold(
                onSuccess = {
                    messages = messages + it.aiMessage
                },
                onFailure = { errorMessage = it.message }
            )
        }
    }

    fun loadTreehole() {
        viewModelScope.launch {
            repository.getTreeholeEntries().onSuccess { treeholeEntries = it }
        }
    }

    fun createTreehole(content: String, mood: String, intensity: Int) {
        viewModelScope.launch {
            repository.createTreehole(content, mood, intensity).fold(
                onSuccess = {
                    treeholeEntries = listOf(it) + treeholeEntries
                    toastMessage = "发布成功！+5积分"
                },
                onFailure = { errorMessage = it.message }
            )
        }
    }

    fun checkin(mood: String, intensity: Int) {
        viewModelScope.launch {
            repository.checkin(mood, intensity).fold(
                onSuccess = {
                    toastMessage = it.message
                    loadUserData()
                },
                onFailure = { errorMessage = it.message }
            )
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            userInfo = null
            currentScreen = Screen.LOGIN
        }
    }

    fun clearError() { errorMessage = null }
    fun clearToast() { toastMessage = null }
}
