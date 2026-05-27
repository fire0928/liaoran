/**
 * 了然APP - 答题页（HarmonyOS版）
 */
import router from '@ohos.router';
import { Theme } from '../common/Theme';
import { getQuestions, submitAssessment } from '../services/ApiService';
import { ScaleQuestions, AssessmentQuestion, AssessmentResult } from '../model/Models';

@Entry
@Component
struct AssessQuestionsPage {
  @State scaleQuestions: ScaleQuestions | null = null;
  @State currentIndex: number = 0;
  @State answers: Map<number, number> = new Map();
  @State isLoading: boolean = false;
  private scaleId: string = '';

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>;
    if (params) this.scaleId = params['scaleId'];
    this.loadQuestions();
  }

  async loadQuestions() {
    try { this.scaleQuestions = await getQuestions(this.scaleId); } catch (err) { console.error('加载失败'); }
  }

  build() {
    if (!this.scaleQuestions) return Text('加载中...');

    const question: AssessmentQuestion = this.scaleQuestions.questions[this.currentIndex];
    const total = this.scaleQuestions.questions.length;
    const progress = (this.currentIndex + 1) / total;

    Column() {
      // 进度条
      Progress({ value: progress * 100, total: 100, type: ProgressType.Linear })
        .width('100%').height(6).color(Theme.Primary)
      Text(`${this.currentIndex + 1} / ${total}`)
        .fontSize(13).fontColor(Theme.TextTertiary).padding(8)

      Column() {
        Text(question.question_text)
          .fontSize(18).fontWeight(FontWeight.Medium).width('100%').margin({ bottom: 24 })

        ForEach(question.options || [], (opt: { label: string; score: number }) => {
          Row() {
            Text(opt.label).fontSize(15)
              .fontColor(this.answers.get(this.currentIndex) === opt.score ? Theme.Primary : Theme.TextPrimary)
          }
          .width('100%').padding(16).borderRadius(12)
          .backgroundColor(this.answers.get(this.currentIndex) === opt.score ? Theme.PrimaryLight : Theme.Surface)
          .border({ width: 1.5, color: this.answers.get(this.currentIndex) === opt.score ? Theme.Primary : Theme.Border })
          .margin({ bottom: 8 })
          .onClick(() => { this.answers.set(this.currentIndex, opt.score); this.answers = new Map(this.answers); })
        }, (item: { label: string; score: number }) => item.score.toString())
      }
      .padding(20).layoutWeight(1)

      Row() {
        if (this.currentIndex > 0) {
          Button('上一题').borderRadius(12).onClick(() => { this.currentIndex--; })
        }
        Button(this.currentIndex < total - 1 ? '下一题' : '提交')
          .borderRadius(12).backgroundColor(Theme.Primary)
          .enabled(this.answers.has(this.currentIndex))
          .onClick(async () => {
            if (this.currentIndex < total - 1) { this.currentIndex++; }
            else {
              this.isLoading = true;
              const ansList = Array.from(this.answers.entries()).map(([idx, score]) => ({ questionId: this.scaleQuestions!.questions[idx].id, score, selectedIndex: score }));
              try {
                const result = await submitAssessment(this.scaleId, ansList);
                router.replaceUrl({ url: 'pages/AssessResultPage', params: { result: JSON.stringify(result) as Record<string, Object> } });
              } catch (err) { console.error('提交失败'); }
              this.isLoading = false;
            }
          })
      }
      .width('100%').padding(20).justifyContent(FlexAlign.SpaceBetween)
    }
    .width('100%').height('100%').backgroundColor(Theme.Background)
  }
}
