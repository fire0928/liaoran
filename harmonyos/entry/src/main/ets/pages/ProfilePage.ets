/**
 * 了然APP - 个人中心（HarmonyOS版）
 */
import router from '@ohos.router';
import { Theme } from '../common/Theme';
import { getMe, getUserStats } from '../services/ApiService';
import { UserInfo, UserStats } from '../model/Models';

@Entry
@Component
struct ProfilePage {
  @State userInfo: UserInfo | null = null;
  @State stats: UserStats = { assessCount: 0, chatCount: 0, treeholeCount: 0, checkinCount: 0, streak: 0 };

  aboutToAppear() { this.loadData(); }

  async loadData() {
    try {
      this.userInfo = await getMe();
      this.stats = await getUserStats();
    } catch (err) { console.error('加载失败'); }
  }

  build() {
    Column() {
      Row() { Text('我的').fontSize(20).fontWeight(FontWeight.Bold) }
      .width('100%').padding(16).backgroundColor(Theme.Background)

      Scroll() {
        Column() {
          // 个人信息
          Column() {
            Stack() {
              Circle().width(80).height(80).fill(Theme.PrimaryLight)
              Text(this.userInfo?.nickname?.charAt(0) || '了')
                .fontSize(28).fontWeight(FontWeight.Bold).fontColor(Theme.Primary)
            }.alignContent(Alignment.Center).margin({ bottom: 12 })

            Text(this.userInfo?.nickname || '了然用户').fontSize(18).fontWeight(FontWeight.Medium)
            Text(`ID: ${this.userInfo?.id?.substring(0, 12) || '---'}****`).fontSize(12).fontColor(Theme.TextTertiary)

            Row() {
              this.StatItem(this.stats.assessCount.toString(), '测评')
              this.StatItem(this.stats.chatCount.toString(), '对话')
              this.StatItem(this.stats.streak.toString(), '连续打卡')
            }
            .width('100%').justifyContent(FlexAlign.SpaceEvenly).margin({ top: 16 })
          }
          .width('100%').padding(24).borderRadius(20).backgroundColor(Theme.Surface).margin(16)

          // 菜单
          Column() {
            this.MenuItem('个人资料')
            this.MenuItem('账号安全')
            this.MenuItem('隐私设置')
            this.MenuItem('消息通知')
            this.MenuItem('关于了然')
          }
          .width('100%').padding(4).borderRadius(16).backgroundColor(Theme.Surface).margin({ left: 16, right: 16 })

          Button('退出登录')
            .width('100%').height(48).fontSize(15).borderRadius(12)
            .backgroundColor('#00000000').fontColor(Theme.Danger)
            .margin({ top: 24, left: 16, right: 16 })
            .onClick(() => { router.replaceUrl({ url: 'pages/Index' }); })
        }
      }.layoutWeight(1)
    }
    .width('100%').height('100%').backgroundColor(Theme.Background)
  }

  @Builder StatItem(value: string, label: string) {
    Column() {
      Text(value).fontSize(20).fontWeight(FontWeight.Bold).fontColor(Theme.TextPrimary)
      Text(label).fontSize(11).fontColor(Theme.TextTertiary).margin({ top: 2 })
    }.alignItems(HorizontalAlign.Center)
  }

  @Builder MenuItem(label: string) {
    Row() {
      Text(label).fontSize(15)
      Blank()
      Text('→').fontColor(Theme.TextTertiary)
    }
    .width('100%').padding({ left: 20, right: 20, top: 16, bottom: 16 })
  }
}
