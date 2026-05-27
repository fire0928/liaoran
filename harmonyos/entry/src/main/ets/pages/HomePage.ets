/**
 * 了然APP - 首页（HarmonyOS版）
 */
import router from '@ohos.router';
import { Theme } from '../common/Theme';
import { getMe, getUserStats, checkin } from '../services/ApiService';
import { UserInfo, UserStats } from '../model/Models';

@Entry
@Component
struct HomePage {
  @State userInfo: UserInfo | null = null;
  @State stats: UserStats = { assessCount: 0, chatCount: 0, treeholeCount: 0, checkinCount: 0, streak: 0 };

  aboutToAppear() {
    this.loadData();
  }

  async loadData() {
    try {
      this.userInfo = await getMe();
      this.stats = await getUserStats();
    } catch (err) {
      console.error('加载数据失败');
    }
  }

  build() {
    Column() {
      // 顶部
      Row() {
        Text('首页')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(Theme.TextPrimary)
        Blank()
        Image($r(''))
          .width(36)
          .height(36)
          .borderRadius(18)
          .backgroundColor(Theme.PrimaryLight)
          .onClick(() => router.pushUrl({ url: 'pages/ProfilePage' }))
      }
      .width('100%')
      .padding(16)
      .backgroundColor(Theme.Background)

      // 内容
      Scroll() {
        Column() {
          // 欢迎横幅
          Column() {
            Text(`下午好，${this.userInfo?.nickname || '了然用户'} ☀️`)
              .fontSize(22)
              .fontWeight(FontWeight.Bold)
            Text('今天也是了解自己的好日子')
              .fontSize(14)
              .fontColor(Theme.TextSecondary)
              .margin({ top: 8 })
            Column() {
              Text('「认识你自己」— 苏格拉底')
                .fontSize(16)
                .fontWeight(FontWeight.Medium)
            }
            .padding(16)
            .margin({ top: 12 })
            .backgroundColor(Theme.Surface)
            .borderRadius(12)
          }
          .width('100%')
          .padding(24)
          .borderRadius(20)
          .linearGradient({ direction: GradientDirection.Right, colors: [[Theme.PrimaryLight, 0], [Theme.SecondaryLight, 1]] })
          .margin(16)

          // 心情打卡
          Column() {
            Text('今天心情怎么样？')
              .fontSize(16)
              .fontWeight(FontWeight.Medium)
            Text(`连续打卡 ${this.stats.streak} 天 🔥`)
              .fontSize(12)
              .fontColor(Theme.TextTertiary)
              .margin({ top: 4 })
            Row({ space: 8 }) {
              this.MoodChip('😊 很不错', 'great')
              this.MoodChip('🙂 还可以', 'good')
              this.MoodChip('😐 一般般', 'okay')
              this.MoodChip('😔 低落', 'low')
              this.MoodChip('😰 不太好', 'bad')
            }
            .margin({ top: 12 })
            .width('100%')
          }
          .width('100%')
          .padding(20)
          .borderRadius(16)
          .backgroundColor(Theme.SurfaceWarm)
          .margin({ left: 16, right: 16, bottom: 12 })

          // 快捷入口
          Row({ space: 12 }) {
            this.QuickCard('开始测评', '科学量表帮你深度\n了解情绪', Theme.PrimaryLight, () => router.pushUrl({ url: 'pages/AssessPage' }))
            this.QuickCard('和AI聊聊', '找一位懂你的\nAI伙伴', Theme.SecondaryLight, () => router.pushUrl({ url: 'pages/ChatPage' }))
            this.QuickCard('匿名树洞', '安全地说出\n心里话', Theme.InfoBg, () => router.pushUrl({ url: 'pages/TreeholePage' }))
          }
          .width('100%')
          .padding({ left: 16, right: 16 })
          .margin({ bottom: 12 })

          // 数据
          Column() {
            Text('我的动态')
              .fontSize(16)
              .fontWeight(FontWeight.Medium)
            Row() {
              this.StatItem(this.stats.assessCount.toString(), '完成测评')
              this.StatItem(this.stats.chatCount.toString(), '对话次数')
              this.StatItem(this.stats.streak.toString(), '连续打卡')
              this.StatItem(this.stats.treeholeCount.toString(), '树洞互动')
            }
            .width('100%')
            .justifyContent(FlexAlign.SpaceEvenly)
            .margin({ top: 12 })
          }
          .width('100%')
          .padding(20)
          .borderRadius(16)
          .backgroundColor(Theme.Surface)
          .margin({ left: 16, right: 16 })
        }
      }
      .layoutWeight(1)

      // 底部导航
      this.BottomNav()
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Theme.Background)
  }

  @Builder MoodChip(text: string, mood: string) {
    Button(text)
      .fontSize(13)
      .height(36)
      .borderRadius(18)
      .backgroundColor(Theme.Surface)
      .fontColor(Theme.TextSecondary)
      .onClick(() => {
        checkin(mood, 3).then(() => this.loadData());
      })
  }

  @Builder QuickCard(title: string, desc: string, bgColor: string, onClick: () => void) {
    Column() {
      Text(title)
        .fontSize(14)
        .fontWeight(FontWeight.Medium)
      Text(desc)
        .fontSize(11)
        .fontColor(Theme.TextSecondary)
        .margin({ top: 4 })
    }
    .padding(16)
    .borderRadius(16)
    .backgroundColor(bgColor)
    .layoutWeight(1)
    .onClick(onClick)
  }

  @Builder StatItem(value: string, label: string) {
    Column() {
      Text(value)
        .fontSize(28)
        .fontWeight(FontWeight.Bold)
        .fontColor(Theme.Primary)
      Text(label)
        .fontSize(12)
        .fontColor(Theme.TextTertiary)
        .margin({ top: 4 })
    }
    .alignItems(HorizontalAlign.Center)
  }

  @Builder BottomNav() {
    Row() {
      this.NavItem('首页', 0)
      this.NavItem('测评', 1)
      this.NavItem('对话', 2)
      this.NavItem('树洞', 3)
      this.NavItem('我的', 4)
    }
    .width('100%')
    .height(56)
    .backgroundColor(Theme.Surface)
  }

  @Builder NavItem(label: string, index: number) {
    Column() {
      Text(label)
        .fontSize(11)
        .fontColor(index === 0 ? Theme.Primary : Theme.TextTertiary)
        .fontWeight(index === 0 ? FontWeight.Medium : FontWeight.Normal)
    }
    .layoutWeight(1)
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .onClick(() => {
      const routes = ['pages/HomePage', 'pages/AssessPage', 'pages/ChatPage', 'pages/TreeholePage', 'pages/ProfilePage'];
      router.replaceUrl({ url: routes[index] });
    })
  }
}
