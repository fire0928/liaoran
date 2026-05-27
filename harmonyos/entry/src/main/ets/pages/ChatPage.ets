/**
 * 了然APP - AI对话页（HarmonyOS版）
 */
import router from '@ohos.router';
import { Theme } from '../common/Theme';
import { createSession, sendMessage } from '../services/ApiService';
import { ChatMessage } from '../model/Models';

@Entry
@Component
struct ChatPage {
  @State messages: ChatMessage[] = [];
  @State inputText: string = '';
  @State sessionId: string = '';
  @State isLoading: boolean = false;

  aboutToAppear() {
    this.startChat();
  }

  async startChat() {
    try {
      const res = await createSession('general');
      this.sessionId = res.session.id;
      this.messages = [res.welcomeMessage];
    } catch (err) { console.error('创建对话失败'); }
  }

  build() {
    Column() {
      // 头部
      Row() {
        Row() {
          Text('AI').width(32).height(32).borderRadius(8).backgroundColor(Theme.Primary).fontColor('#FFFFFF').fontSize(12).textAlign(TextAlign.Center)
          Text('AI倾听伙伴').fontSize(15).fontWeight(FontWeight.Medium).margin({ left: 12 })
        }
        Text('在线 · 秒回').fontSize(11).fontColor(Theme.Success)
      }
      .width('100%').padding(16).backgroundColor(Theme.Background)

      // 消息列表
      Scroll() {
        Column({ space: 12 }) {
          ForEach(this.messages, (msg: ChatMessage) => {
            Row() {
              Column() {
                Text(msg.content)
                  .fontSize(14)
                  .padding(12)
                  .borderRadius(msg.role === 'user' ? { topLeft: 18, topRight: 18, bottomLeft: 18, bottomRight: 4 }
                    : { topLeft: 18, topRight: 18, bottomLeft: 4, bottomRight: 18 })
                  .backgroundColor(msg.role === 'user' ? Theme.ChatUserBg : Theme.Surface)
                  .constraintSize({ maxWidth: 280 })
              }
            }
            .width('100%')
            .justifyContent(msg.role === 'user' ? FlexAlign.End : FlexAlign.Start)
          }, (item: ChatMessage) => item.id)
        }
        .padding(16)
      }
      .layoutWeight(1)

      // 输入区
      Row() {
        TextInput({ placeholder: '输入你想说的话...', text: this.inputText })
          .height(44).borderRadius(22).backgroundColor(Theme.ChatInputBg)
          .layoutWeight(1)
          .onChange((value: string) => { this.inputText = value; })

        Button('发送')
          .width(48).height(48).borderRadius(24).backgroundColor(Theme.Primary).fontColor('#FFFFFF')
          .margin({ left: 8 })
          .onClick(async () => {
            if (this.inputText.trim().length === 0) return;
            const text = this.inputText.trim();
            this.messages.push({ id: Date.now().toString(), role: 'user', content: text });
            this.inputText = '';
            try {
              const res = await sendMessage(this.sessionId, text);
              this.messages.push(res.aiMessage);
            } catch (err) { console.error('发送失败'); }
          })
      }
      .width('100%').padding(12).backgroundColor(Theme.Surface)
    }
    .width('100%').height('100%').backgroundColor(Theme.Background)
  }
}
