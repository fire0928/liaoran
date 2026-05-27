package com.liaoran.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun LiaoranTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Theme.Primary,
            onPrimary = Theme.TextInverse,
            primaryContainer = Theme.PrimaryLight,
            secondary = Theme.Secondary,
            secondaryContainer = Theme.SecondaryLight,
            background = Theme.Background,
            surface = Theme.Surface,
            onBackground = Theme.TextPrimary,
            onSurface = Theme.TextPrimary,
        ),
        content = content
    )
}

@Composable
fun LoginScreen(viewModel: MainViewModel) {
    var phone by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var showCodeInput by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Theme.Background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(Theme.Primary, RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text("了", color = Theme.TextInverse, fontSize = 36.sp, fontWeight = FontWeight.Bold)
            }

            Spacer(Modifier.height(24.dp))

            Text("了然", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Theme.TextPrimary)
            Text("AI心理认知与自我疗愈", fontSize = 15.sp, color = Theme.TextSecondary)
            Text("懂你 · 帮你 · 愈己", fontSize = 13.sp, color = Theme.TextTertiary)

            Spacer(Modifier.height(48.dp))

            // 手机号输入
            OutlinedTextField(
                value = phone,
                onValueChange = { if (it.length <= 11) phone = it },
                label = { Text("手机号") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
            )

            Spacer(Modifier.height(12.dp))

            if (showCodeInput) {
                OutlinedTextField(
                    value = code,
                    onValueChange = { if (it.length <= 6) code = it },
                    label = { Text("验证码（测试: 123456）") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                )
                Spacer(Modifier.height(12.dp))
            }

            Button(
                onClick = {
                    if (!showCodeInput && phone.length == 11) {
                        showCodeInput = true
                    } else if (showCodeInput && phone.length == 11 && code.length >= 6) {
                        viewModel.login(phone, code)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Theme.Primary),
                enabled = !viewModel.isLoading
            ) {
                if (viewModel.isLoading) {
                    CircularProgressIndicator(color = Theme.TextInverse, modifier = Modifier.size(24.dp))
                } else {
                    Text(if (showCodeInput) "登录" else "获取验证码", fontSize = 16.sp, fontWeight = FontWeight.Medium)
                }
            }

            if (viewModel.errorMessage != null) {
                Spacer(Modifier.height(12.dp))
                Text(
                    viewModel.errorMessage!!,
                    color = Theme.Danger,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}
