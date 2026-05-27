package com.liaoran.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.liaoran.app.data.model.AssessmentScale

@Composable
fun AssessScreen(viewModel: MainViewModel) {
    val categories = listOf("全部" to "all", "情绪筛查" to "emotion", "压力评估" to "stress", "人格特质" to "personality", "幸福感" to "wellbeing", "人际关系" to "relationship")
    var selectedCategory by remember { mutableStateOf("all") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("📋 科学测评", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Theme.Background)
            )
        },
        bottomBar = { BottomNavBar(viewModel, 1) }
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).background(Theme.Background)) {
            item {
                // Hero
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .background(Theme.PrimaryLight, RoundedCornerShape(20.dp))
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("认识真实的自己", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(8.dp))
                        Text("基于心理学专业量表，多维度探索", fontSize = 13.sp, color = Theme.TextSecondary)
                    }
                }
            }

            // 分类Tab
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    categories.forEach { (label, key) ->
                        FilterChip(
                            selected = selectedCategory == key,
                            onClick = {
                                selectedCategory = key
                                viewModel.loadScales(if (key == "all") null else key)
                            },
                            label = { Text(label, fontSize = 12.sp) },
                            shape = RoundedCornerShape(20.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Theme.Primary,
                                selectedLabelColor = Color.White,
                            )
                        )
                    }
                }
            }

            item { Spacer(Modifier.height(12.dp)) }

            // 量表列表
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    viewModel.scales.forEach { scale ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp)
                                .clickable { viewModel.startAssessment(scale) },
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Theme.Surface)
                        ) {
                            Row(
                                modifier = Modifier.padding(20.dp),
                                modifier2 = Modifier.weight(1f)
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(scale.name, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                                    Spacer(Modifier.height(4.dp))
                                    Text(scale.description, fontSize = 13.sp, color = Theme.TextSecondary, maxLines = 2)
                                    Spacer(Modifier.height(8.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                        Text("📝 ${scale.questionCount}题", fontSize = 12.sp, color = Theme.TextTertiary)
                                        Text("⏱ ${scale.estimatedMinutes}分钟", fontSize = 12.sp, color = Theme.TextTertiary)
                                        if (scale.completedCount > 0) {
                                            Text("✅ 已完成${scale.completedCount}次", fontSize = 12.sp, color = Theme.Success)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ===== 答题界面 =====
@Composable
fun AssessQuestionsScreen(viewModel: MainViewModel) {
    val question = viewModel.currentQuestions.getOrNull(viewModel.currentQuestionIndex)
    val totalQuestions = viewModel.currentQuestions.size
    val progress = if (totalQuestions > 0) (viewModel.currentQuestionIndex + 1).toFloat() / totalQuestions else 0f

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(viewModel.currentScale?.name ?: "测评", fontSize = 16.sp) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.currentScreen = Screen.ASSESS }) {
                        Icon(Icons.Default.ArrowBack, "返回")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Theme.Background)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).background(Theme.Background)
        ) {
            // 进度条
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(6.dp),
                color = Theme.Primary,
                trackColor = Theme.BorderLight,
            )

            Text(
                "${viewModel.currentQuestionIndex + 1} / $totalQuestions",
                fontSize = 13.sp,
                color = Theme.TextTertiary,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
            )

            if (question != null) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp),
                ) {
                    Text(
                        question.text,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Medium,
                        color = Theme.TextPrimary,
                        lineHeight = 28.sp,
                        modifier = Modifier.padding(bottom = 24.dp)
                    )

                    val options = question.options ?: listOf()
                    val selectedScore = viewModel.answers[viewModel.currentQuestionIndex]

                    options.forEach { option ->
                        val isSelected = selectedScore == option.score
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clickable { viewModel.selectAnswer(viewModel.currentQuestionIndex, option.score) },
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) Theme.PrimaryLight else Theme.Surface
                            ),
                            border = if (isSelected) androidx.compose.foundation.BorderStroke(1.5.dp, Theme.Primary)
                            else androidx.compose.foundation.BorderStroke(1.dp, Theme.Border)
                        ) {
                            Text(
                                option.label,
                                modifier = Modifier.padding(16.dp),
                                fontSize = 15.sp,
                                fontWeight = if (isSelected) FontWeight.Medium else FontWeight.Normal,
                                color = if (isSelected) Theme.Primary else Theme.TextPrimary
                            )
                        }
                    }

                    Spacer(Modifier.weight(1f))

                    // 导航按钮
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        if (viewModel.currentQuestionIndex > 0) {
                            OutlinedButton(
                                onClick = { viewModel.currentQuestionIndex-- },
                                shape = RoundedCornerShape(12.dp)
                            ) { Text("上一题") }
                        }

                        Button(
                            onClick = {
                                if (viewModel.currentQuestionIndex < totalQuestions - 1) {
                                    viewModel.currentQuestionIndex++
                                } else {
                                    viewModel.submitAssessment()
                                }
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Theme.Primary),
                            enabled = selectedScore != null
                        ) {
                            Text(if (viewModel.currentQuestionIndex < totalQuestions - 1) "下一题" else "提交")
                        }
                    }
                }
            }
        }
    }
}

// ===== 测评结果 =====
@Composable
fun AssessResultScreen(viewModel: MainViewModel) {
    val result = viewModel.assessmentResult ?: return
    val levelColors = mapOf(
        "healthy" to Theme.Success,
        "mild" to Theme.Secondary,
        "moderate" to Theme.Warning,
        "moderate-severe" to Theme.Crisis,
        "severe" to Theme.Danger
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("测评报告") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Theme.Background)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Theme.Background)
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(result.scaleName, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(24.dp))

            // 分数圆环
            Box(
                modifier = Modifier
                    .size(140.dp)
                    .background(Theme.PrimaryLight, RoundedCornerShape(70.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        result.totalScore.toString(),
                        fontSize = 48.sp,
                        fontWeight = FontWeight.Bold,
                        color = levelColors[result.severity] ?: Theme.Primary
                    )
                    Text(result.severityLabel, fontSize = 16.sp, color = Theme.TextSecondary)
                }
            }

            Spacer(Modifier.height(24.dp))

            // 解读
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Theme.SurfaceWarm),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("AI解读", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Theme.TextSecondary)
                    Spacer(Modifier.height(8.dp))
                    Text(result.interpretation, fontSize = 15.sp, color = Theme.TextPrimary, lineHeight = 24.sp)
                }
            }

            Spacer(Modifier.height(20.dp))

            // 返回按钮
            Button(
                onClick = { viewModel.currentScreen = Screen.ASSESS },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Theme.Primary)
            ) {
                Text("返回测评列表", fontSize = 16.sp)
            }
        }
    }
}
