/**
 * 了然APP - 树洞页（HarmonyOS版）
 */
import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { Theme } from '../common/Theme';
import { getTreeholeEntries, createTreehole } from '../services/ApiService';
import { TreeholeEntry } from '../model/Models';

@Entry
@Component
struct TreeholePage {
  @State entries: TreeholeEntry[] = [];
  @State showComposer: boolean = false;
  @State composerText: string = '';

  aboutToAppear() { this.loadEntries(); }

  async loadEntries() {
    try { this.entries = await getTreeholeEntries(); } catch (err) { console.error('加载失败'); }
  }

  build() {
    Stack() {
      Column() {
        Row() {
          Text('🌳 匿名树洞').fontSize(20).fontWeight(FontWeight.Bold)
          Blank()
          Button('写下心情').fontSize(13).height(32).borderRadius(16).backgroundColor(Theme.PrimaryLight)
            .onClick(() => { this.showComposer = true; })
        }
        .width('100%').padding(16).backgroundColor(Theme.Background)

        // 横幅
        Column() {
          Text('卸下所有面具').fontSize(18).fontWeight(FontWeight.Bold)
          Text('完全匿名 · 安全加密 · 温暖社区').fontSize(12).fontColor(Theme.Secondary).margin({ top: 8 })
        }
        .width('100%').padding(20).borderRadius(20).backgroundColor(Theme.SecondaryLight).margin(16)

        // 列表
        Scroll() {
          Column() {
            ForEach(this.entries, (entry: TreeholeEntry) => {
              Column() {
                Row() {
                  Row() {
                    Text('👤').fontSize(16).margin({ right: 8 })
                    Text('匿名用户').fontSize(14).fontWeight(FontWeight.Medium)
                  }
                  Text(entry.created_at?.substring(0, 10) || entry.createdAt?.substring(0, 10) || '刚刚')
                    .fontSize(12).fontColor(Theme.TextTertiary)
                }
                .width('100%').justifyContent(FlexAlign.SpaceBetween)

                Text(entry.content).fontSize(14).margin({ top: 12 })
                if (entry.mood && entry.mood !== 'other') {
                  Text(`💭 ${entry.mood}`).fontSize(12).fontColor(Theme.TextTertiary).margin({ top: 8 })
                }
              }
              .width('100%').padding(20).borderRadius(16).backgroundColor(Theme.Surface).margin({ bottom: 8 })
            }, (item: TreeholeEntry) => item.id)
          }.padding({ left: 16, right: 16 })
        }.layoutWeight(1)

        this.BottomNav()
      }
      .width('100%').height('100%').backgroundColor(Theme.Background)

      // 发布弹窗
      if (this.showComposer) {
        Column() {
          Column() {
            Text('发布树洞').fontSize(18).fontWeight(FontWeight.Bold).margin({ bottom: 16 })
            TextArea({ placeholder: '说出你想说的话...', text: this.composerText })
              .width('100%').height(120).borderRadius(12)
              .maxLength(500)
              .onChange((value: string) => { this.composerText = value; })
            Text(`${this.composerText.length}/500`).fontSize(11).fontColor(Theme.TextTertiary).margin({ top: 8 })
          }
          .padding(24).borderRadius(20).backgroundColor(Theme.Surface)

          Row() {
            Button('取消').borderRadius(12).onClick(() => { this.showComposer = false; })
            Button('发布').borderRadius(12).backgroundColor(Theme.Primary)
              .enabled(this.composerText.trim().length > 0)
              .onClick(async () => {
                try {
                  await createTreehole(this.composerText.trim(), 'other', 5);
                  promptAction.showToast({ message: '发布成功！+5积分' });
                  this.showComposer = false;
                  this.composerText = '';
                  this.loadEntries();
                } catch (err) { console.error('发布失败'); }
              })
          }
          .width('100%').justifyContent(FlexAlign.SpaceEvenly).margin({ top: 16 })
        }
        .padding(24)
        .width('100%').height('100%').backgroundColor('rgba(0,0,0,0.3)')
        .justifyContent(FlexAlign.Center)
        .onClick(() => { this.showComposer = false; })
      }
    }
  }

  @Builder BottomNav() {
    Row() {
      ForEach(['首页','测评','对话','树洞','我的'], (_, index) => {
        Text(_ as string).fontSize(11).layoutWeight(1).textAlign(TextAlign.Center)
          .fontColor(index === 3 ? Theme.Primary : Theme.TextTertiary)
      })
    }.width('100%').height(56).backgroundColor(Theme.Surface)
  }
}
