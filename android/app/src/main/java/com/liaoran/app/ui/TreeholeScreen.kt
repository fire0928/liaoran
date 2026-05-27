package com.liaoran.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.liaoran.app.data.model.TreeholeEntry

@Composable
fun TreeholeScreen(viewModel: MainViewModel) {
    var showComposer by remember { mutableStateOf(false) }
    var composerText by remember { mutableStateOf("") }
    var selectedMood by remember { mutableStateOf("other") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("🌳 匿名树洞", fontWeight = FontWeight.Bold) },
                actions = {
                    FilledTonalButton(
                        onClick = { showComposer = true },
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(containerColor = Theme.PrimaryLight)
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("写下心情", fontSize = 13.sp)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Theme.Background)
            )
        },
        bottomBar = { BottomNavBar(viewModel, 3) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).background(Theme.Background)) {
            // 横幅
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .background(Theme.SecondaryLight, RoundedCornerShape(20.dp))
                    .padding(20.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("卸下所有面具", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("完全匿名 · 安全加密 · 温暖社区", fontSize = 12.sp, color = Theme.Secondary, modifier = Modifier.padding(top = 8.dp))
                }
            }

            // 树洞列表
            LazyColumn(modifier = Modifier.padding(horizontal = 16.dp)) {
                items(viewModel.treeholeEntries) { entry ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Theme.Surface)
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .background(Theme.SurfaceWarm, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(16.dp), tint = Theme.TextTertiary)
                                }
                                Spacer(Modifier.width(12.dp))
                                Text("匿名用户", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                Spacer(Modifier.weight(1f))
                                Text(
                                    entry.createdAt?.take(10) ?: entry.createdAtAlt?.take(10) ?: "刚刚",
                                    fontSize = 12.sp, color = Theme.TextTertiary
                                )
                            }
                            Spacer(Modifier.height(12.dp))
                            Text(entry.content, fontSize = 14.sp, color = Theme.TextPrimary, lineHeight = 22.sp)
                            if (entry.mood != null && entry.mood != "other") {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "💭 ${entry.mood}",
                                    fontSize = 12.sp,
                                    color = Theme.TextTertiary,
                                    modifier = Modifier
                                        .background(Theme.SurfaceWarm, RoundedCornerShape(8.dp))
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // 发布弹窗
    if (showComposer) {
        AlertDialog(
            onDismissRequest = { showComposer = false },
            title = { Text("发布树洞") },
            text = {
                Column {
                    OutlinedTextField(
                        value = composerText,
                        onValueChange = { if (it.length <= 500) composerText = it },
                        placeholder = { Text("说出你想说的话...") },
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                        shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(Modifier.height(12.dp))
                    Text("${composerText.length}/500", fontSize = 11.sp, color = Theme.TextTertiary)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (composerText.isNotBlank()) {
                            viewModel.createTreehole(composerText, selectedMood, 5)
                            composerText = ""
                            showComposer = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Theme.Primary),
                    enabled = composerText.isNotBlank()
                ) { Text("发布") }
            },
            dismissButton = { TextButton(onClick = { showComposer = false }) { Text("取消") } },
            shape = RoundedCornerShape(20.dp)
        )
    }
}

@Composable
fun ProfileScreen(viewModel: MainViewModel) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("我的", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Theme.Background)
            )
        },
        bottomBar = { BottomNavBar(viewModel, 4) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).background(Theme.Background).padding(16.dp)
        ) {
            // 个人信息卡片
            item {
                Card(shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .background(Theme.PrimaryLight, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                viewModel.userInfo?.nickname?.take(1) ?: "了",
                                fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Theme.Primary
                            )
                        }
                        Spacer(Modifier.height(12.dp))
                        Text(viewModel.userInfo?.nickname ?: "了然用户", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                        Text("ID: ${viewModel.userInfo?.id?.take(12) ?: "---"}****", fontSize = 12.sp, color = Theme.TextTertiary)
                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            StatItem(viewModel.userStats?.assessCount?.toString() ?: "0", "测评")
                            StatItem(viewModel.userStats?.chatCount?.toString() ?: "0", "对话")
                            StatItem(viewModel.userStats?.streak?.toString() ?: "0", "连续打卡")
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(16.dp)) }

            // 菜单项
            item {
                ProfileMenuItem("个人资料", Icons.Default.Person) {}
                ProfileMenuItem("账号安全", Icons.Default.Lock) {}
                ProfileMenuItem("隐私设置", Icons.Default.VisibilityOff) {}
                ProfileMenuItem("消息通知", Icons.Default.Notifications) {}
                ProfileMenuItem("关于了然", Icons.Default.Info) {}
            }

            item { Spacer(Modifier.height(24.dp)) }

            // 退出登录
            item {
                OutlinedButton(
                    onClick = { viewModel.logout() },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Theme.Danger)
                ) {
                    Text("退出登录")
                }
            }
        }
    }
}

@Composable
fun ProfileMenuItem(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Theme.Surface,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = Theme.TextSecondary, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(16.dp))
            Text(label, fontSize = 15.sp, modifier = Modifier.weight(1f))
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Theme.TextTertiary, modifier = Modifier.size(18.dp))
        }
    }
}
