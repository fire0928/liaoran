/**
 * 了然APP - 测评结果页（HarmonyOS版）
 */
import router from '@ohos.router';
import { Theme } from '../common/Theme';
import { AssessmentResult } from '../model/Models';

@Entry
@Component
struct AssessResultPage {
  @State result: AssessmentResult | null = null;

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>;
    if (params && params['result']) {
      this.result = JSON.parse(params['result']) as AssessmentResult;
    }
  }

  build() {
    if (!this.result) return Text('加载中...');

    Column() {
      Text(this.result.scaleName).fontSize(22).fontWeight(FontWeight.Bold).margin({ top: 32 })

      // 得分
      Column() {
        Text(this.result.totalScore.toString()).fontSize(48).fontWeight(FontWeight.Bold).fontColor(Theme.Primary)
        Text(this.result.severityLabel).fontSize(16).fontColor(Theme.TextSecondary)
      }
      .width(140).height(140).borderRadius(70).backgroundColor(Theme.PrimaryLight)
      .justifyContent(FlexAlign.Center).margin({ top: 24 })

      // 解读
      Column() {
        Text('AI解读').fontSize(14).fontColor(Theme.TextSecondary)
        Text(this.result.interpretation).fontSize(15).margin({ top: 8 })
      }
      .width('100%').padding(20).borderRadius(16).backgroundColor(Theme.SurfaceWarm).margin({ top: 24 })

      Button('返回测评列表')
        .width('100%').height(52).fontSize(16).borderRadius(12).backgroundColor(Theme.Primary)
        .margin({ top: 24 })
        .onClick(() => router.replaceUrl({ url: 'pages/AssessPage' }))
    }
    .width('100%').height('100%').padding(20).backgroundColor(Theme.Background)
  }
}
