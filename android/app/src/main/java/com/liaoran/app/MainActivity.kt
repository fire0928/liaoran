package com.liaoran.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.liaoran.app.ui.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            LiaoranTheme {
                LiaoranApp()
            }
        }
    }
}

@Composable
fun LiaoranApp() {
    val mainViewModel: MainViewModel = viewModel()

    when (mainViewModel.currentScreen) {
        Screen.LOGIN -> LoginScreen(viewModel = mainViewModel)
        Screen.HOME -> HomeScreen(viewModel = mainViewModel)
        Screen.ASSESS -> AssessScreen(viewModel = mainViewModel)
        Screen.CHAT -> ChatScreen(viewModel = mainViewModel)
        Screen.TREEHOLE -> TreeholeScreen(viewModel = mainViewModel)
        Screen.PROFILE -> ProfileScreen(viewModel = mainViewModel)
        Screen.ASSESS_QUESTIONS -> AssessQuestionsScreen(viewModel = mainViewModel)
        Screen.ASSESS_RESULT -> AssessResultScreen(viewModel = mainViewModel)
    }
}
