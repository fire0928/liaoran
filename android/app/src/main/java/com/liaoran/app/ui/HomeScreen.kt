package com.liaoran.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.liaoran.app.data.model.AssessmentScale

// ===== 首页 =====
@Composable
fun HomeScreen(viewModel: MainViewModel) {
    val moods = listOf("😊 很不错" to "great", "🙂 还可以" to "good", "😐 一般般" to "okay", "😔 有点低落" to "low", "😰 不太好" to "bad")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("首页", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Theme.Background),
                actions = {
                    IconButton(onClick = { viewModel.currentScreen = Screen.PROFILE }) {
                        Icon(Icons.Default.Person, contentDescription = "我的")
                    }
                }
            )
        },
        bottomBar = { BottomNavBar(viewModel, 0) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Theme.Background)
        ) {
            // 欢迎区
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .background(
                            brush = Brush.horizontalGradient(listOf(Theme.PrimaryLight, Theme.SecondaryLight)),
                            RoundedCornerShape(20.dp)
                        )
                        .padding(24.dp)
                ) {
                    Column {
                        Text(
                            "下午好，${viewModel.userInfo?.nickname ?: "了然用户"} ☀️",
                            fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Theme.TextPrimary
                        )
                        Spacer(Modifier.height(8.dp))
                        Text("今天也是了解自己的好日子", fontSize = 14.sp, color = Theme.TextSecondary)
                        Spacer(Modifier.height(12.dp))
                        Box(
                            modifier = Modifier
                                .background(Theme.Surface, RoundedCornerShape(12.dp))
                                .padding(16.dp)
                        ) {
                            Text(
                                "「认识你自己」— 苏格拉底",
                                fontSize = 16.sp, fontWeight = FontWeight.SemiBold,
                                color = Theme.TextPrimary
                            )
                        }
                    }
                }
            }

            // 心情打卡
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Theme.SurfaceWarm)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("今天心情怎么样？", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        Text(
                            "连续打卡 ${viewModel.userStats?.streak ?: 0} 天 🔥",
                            fontSize = 12.sp, color = Theme.TextTertiary
                        )
                        Spacer(Modifier.height(12.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(moods) { (label, value) ->
                                FilterChip(
                                    selected = false,
                                    onClick = { viewModel.checkin(value, 3) },
                                    label = { Text(label, fontSize = 13.sp) },
                                    shape = RoundedCornerShape(20.dp),
                                    colors = FilterChipDefaults.filterChipColors(
                                        containerColor = Theme.Surface,
                                        labelColor = Theme.TextSecondary
                                    )
                                )
                            }
                        }
                    }
                }
            }

            // 快捷入口
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    QuickCard("开始测评", "科学量表帮你深入了解\n情绪状态", Theme.PrimaryLight, Theme.Primary) {
                        viewModel.currentScreen = Screen.ASSESS
                    }
                    QuickCard("和AI聊聊", "选择一位懂你的\nAI倾听伙伴", Theme.SecondaryLight, Theme.Secondary) {
                        viewModel.createChatSession("general")
                    }
                    QuickCard("匿名树洞", "安全地表达那些\n说不出口的话", Theme.InfoBg, Theme.Info) {
                        viewModel.currentScreen = Screen.TREEHOLE
                    }
                }
            }

            // AI Agent推荐
            item {
                Text(
                    "为你推荐的倾听者",
                    fontSize = 17.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                )
            }

            item {
                LazyRow(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(AgentData.agents) { agent ->
                        Card(
                            modifier = Modifier
                                .width(220.dp)
                                .clickable { viewModel.createChatSession(agent.type) },
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .background(agent.color, RoundedCornerShape(12.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(agent.icon, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                                }
                                Spacer(Modifier.height(12.dp))
                                Text(agent.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                                Text(agent.desc, fontSize = 12.sp, color = Theme.TextSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Spacer(Modifier.height(8.dp))
                                Text(agent.tag, fontSize = 11.sp, color = Theme.Primary, fontWeight = FontWeight.Medium)
                            }
                        }
                    }
                }
            }

            // 我的动态
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("我的动态", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            StatItem(viewModel.userStats?.assessCount?.toString() ?: "0", "完成测评")
                            StatItem(viewModel.userStats?.chatCount?.toString() ?: "0", "对话次数")
                            StatItem(viewModel.userStats?.streak?.toString() ?: "0", "连续打卡")
                            StatItem(viewModel.userStats?.treeholeCount?.toString() ?: "0", "树洞互动")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun QuickCard(title: String, desc: String, bgColor: Color, textColor: Color, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .weight(1f)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = textColor)
            Spacer(Modifier.height(4.dp))
            Text(desc, fontSize = 11.sp, color = Theme.TextSecondary, lineHeight = 16.sp)
        }
    }
}

@Composable
fun StatItem(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Theme.Primary)
        Text(label, fontSize = 12.sp, color = Theme.TextTertiary)
    }
}

data class AgentInfo(val name: String, val desc: String, val tag: String, val color: Color, val icon: String, val type: String)

object AgentData {
    val agents = listOf(
        AgentInfo("青年知音", "擅长校园生活、成长困惑、人际关系", "青少年方向", Theme.Primary, "知", "teen"),
        AgentInfo("通用助手", "全能型心理支持，覆盖日常情绪疏导", "通用方向", Theme.Secondary, "通", "general"),
        AgentInfo("情绪导航员", "帮你识别、理解复杂情绪", "情绪疏导", Theme.Info, "情", "emotion"),
        AgentInfo("认知重构师", "引导发现不合理思维，建立健康认知", Theme.Warning, "认", "认知疗法", "general"),
        AgentInfo("正念陪伴者", "正念冥想引导，呼吸练习", Color(0xFFB08DB9), "念", "正念疗愈", "general"),
    )
}

// ===== 底部导航 =====
@Composable
fun BottomNavBar(viewModel: MainViewModel, currentIndex: Int) {
    val tabs = listOf(
        Triple("首页", Icons.Default.Home, Screen.HOME),
        Triple("测评", Icons.Default.CheckCircle, Screen.ASSESS),
        Triple("对话", Icons.Default.Chat, Screen.CHAT),
        Triple("树洞", Icons.Default.Favorite, Screen.TREEHOLE),
        Triple("我的", Icons.Default.Person, Screen.PROFILE),
    )

    NavigationBar(
        containerColor = Theme.Surface,
        tonalElevation = 2.dp
    ) {
        tabs.forEachIndexed { index, (label, icon, screen) ->
            NavigationBarItem(
                icon = { Icon(icon, contentDescription = label) },
                label = { Text(label, fontSize = 11.sp) },
                selected = currentIndex == index,
                onClick = { viewModel.currentScreen = screen },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Theme.Primary,
                    selectedTextColor = Theme.Primary,
                    unselectedIconColor = Theme.TextTertiary,
                    unselectedTextColor = Theme.TextTertiary,
                    indicatorColor = Theme.PrimaryLight
                )
            )
        }
    }
}
