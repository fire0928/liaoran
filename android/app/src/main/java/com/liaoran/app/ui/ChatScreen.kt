package com.liaoran.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.liaoran.app.data.model.ChatMessage

@Composable
fun ChatScreen(viewModel: MainViewModel) {
    val listState = rememberLazyListState()

    LaunchedEffect(viewModel.messages.size) {
        if (viewModel.messages.isNotEmpty()) {
            listState.animateScrollToItem(viewModel.messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(Theme.Primary, RoundedCornerShape(8.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("AI", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("AI倾听伙伴", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                            Text("在线 · 通常秒回", fontSize = 11.sp, color = Theme.Success)
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.createChatSession("general") }) {
                        Icon(Icons.Default.Add, "新对话")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Theme.Background)
            )
        },
        bottomBar = { BottomNavBar(viewModel, 2) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).background(Theme.Background)) {
            // 消息列表
            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(viewModel.messages) { msg ->
                    ChatBubble(msg)
                }
            }

            // 输入区
            Surface(
                shadowElevation = 4.dp,
                color = Theme.Surface
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.Bottom
                ) {
                    OutlinedTextField(
                        value = viewModel.inputText,
                        onValueChange = { viewModel.inputText = it },
                        placeholder = { Text("输入你想说的话...") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(22.dp),
                        maxLines = 4,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Theme.ChatInputBg,
                            unfocusedContainerColor = Theme.ChatInputBg,
                            focusedBorderColor = Theme.Primary,
                            unfocusedBorderColor = Theme.Border
                        )
                    )
                    Spacer(Modifier.width(8.dp))
                    FilledIconButton(
                        onClick = { viewModel.sendMessage() },
                        modifier = Modifier.size(48.dp),
                        shape = CircleShape,
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = Theme.Primary),
                        enabled = viewModel.inputText.trim().isNotEmpty()
                    ) {
                        Icon(Icons.Default.Send, "发送", tint = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
fun ChatBubble(msg: ChatMessage) {
    val isUser = msg.role == "user"

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Column(
            modifier = Modifier.widthIn(max = 300.dp)
        ) {
            Box(
                modifier = Modifier
                    .background(
                        color = if (isUser) Theme.ChatUserBg else Theme.Surface,
                        shape = RoundedCornerShape(
                            topStart = 18.dp,
                            topEnd = 18.dp,
                            bottomStart = if (isUser) 18.dp else 4.dp,
                            bottomEnd = if (isUser) 4.dp else 18.dp
                        )
                    )
                    .then(if (!isUser) Modifier.border(1.dp, Theme.ChatAiBorder, RoundedCornerShape(
                        topStart = 18.dp, topEnd = 18.dp, bottomStart = 4.dp, bottomEnd = 18.dp
                    )) else Modifier)
                    .padding(12.dp)
            ) {
                Text(msg.content, fontSize = 14.sp, color = Theme.TextPrimary, lineHeight = 22.sp)
            }
            Spacer(Modifier.height(4.dp))
            if (msg.createdAt != null) {
                Text(
                    msg.createdAt.substringAfterLast(":").take(5),
                    fontSize = 10.sp,
                    color = Theme.TextTertiary,
                    modifier = Modifier.padding(horizontal = 8.dp)
                )
            }
        }
    }
}
