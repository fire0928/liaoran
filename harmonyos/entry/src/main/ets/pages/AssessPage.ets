/**
 * 了然APP - 测评页（HarmonyOS版）
 */
import router from '@ohos.router';
import { Theme } from '../common/Theme';
import { getScales } from '../services/ApiService';
import { AssessmentScale } from '../model/Models';

@Entry
@Component
struct AssessPage {
  @State scales: AssessmentScale[] = [];
  @State selectedCategory: string = 'all';

  aboutToAppear() { this.loadScales(); }

  async loadScales(cat?: string) {
    try { this.scales = await getScales(cat); } catch (err) { console.error('加载失败'); }
  }

  build() {
    Column() {
      Row() {
        Text('📋 科学测评').fontSize(20).fontWeight(FontWeight.Bold)
      }
      .width('100%').padding(16).backgroundColor(Theme.Background)

      Scroll() {
        Column() {
          // Hero
          Column() {
            Text('认识真实的自己').fontSize(20).fontWeight(FontWeight.Bold)
            Text('基于心理学专业量表，多维度探索').fontSize(13).fontColor(Theme.TextSecondary).margin({ top: 8 })
          }
          .width('100%').padding(24).borderRadius(20).backgroundColor(Theme.PrimaryLight).margin(16)

          // 分类标签
          Row({ space: 8 }) {
            this.CategoryTab('全部', 'all')
            this.CategoryTab('情绪筛查', 'emotion')
            this.CategoryTab('压力评估', 'stress')
            this.CategoryTab('人格特质', 'personality')
          }
          .width('100%').padding({ left: 16, right: 16 }).margin({ bottom: 12 })

          // 量表列表
          ForEach(this.scales, (scale: AssessmentScale) => {
            Column() {
              Text(scale.name).fontSize(16).fontWeight(FontWeight.Medium)
              Text(scale.description).fontSize(13).fontColor(Theme.TextSecondary).maxLines(2).margin({ top: 4 })
              Row({ space: 16 }) {
                Text(`📝 ${scale.question_count}题`).fontSize(12).fontColor(Theme.TextTertiary)
                Text(`⏱ ${scale.estimated_minutes}分钟`).fontSize(12).fontColor(Theme.TextTertiary)
                if (scale.completedCount > 0) { Text(`✅ 已完成${scale.completedCount}次`).fontSize(12).fontColor(Theme.Success) }
              }.margin({ top: 8 })
            }
            .width('100%').padding(20).borderRadius(16).backgroundColor(Theme.Surface).margin({ bottom: 8 })
            .onClick(() => {
              router.pushUrl({ url: 'pages/AssessQuestionsPage', params: { scaleId: scale.id, scaleName: scale.name } });
            })
          }, (item: AssessmentScale) => item.id)
        }.padding({ left: 16, right: 16 })
      }.layoutWeight(1)

      this.BottomNav()
    }
    .width('100%').height('100%').backgroundColor(Theme.Background)
  }

  @Builder CategoryTab(label: string, key: string) {
    Button(label)
      .fontSize(12)
      .height(32)
      .borderRadius(16)
      .backgroundColor(this.selectedCategory === key ? Theme.Primary : Theme.Surface)
      .fontColor(this.selectedCategory === key ? '#FFFFFF' : Theme.TextSecondary)
      .onClick(() => { this.selectedCategory = key; this.loadScales(key === 'all' ? undefined : key); })
  }

  @Builder BottomNav() {
    Row() {
      ForEach(['首页','测评','对话','树洞','我的'], (_, index) => {
        Text(_ as string).fontSize(11).layoutWeight(1).textAlign(TextAlign.Center)
          .fontColor(index === 1 ? Theme.Primary : Theme.TextTertiary)
      })
    }.width('100%').height(56).backgroundColor(Theme.Surface)
  }
}
