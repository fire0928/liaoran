/**
 * 了然APP - 登录页（HarmonyOS版）
 */
import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { Theme } from '../common/Theme';
import { login } from '../services/ApiService';

@Entry
@Component
struct Index {
  @State phone: string = '';
  @State code: string = '';
  @State showCodeInput: boolean = false;
  @State isLoading: boolean = false;

  build() {
    Column() {
      // Logo
      Row() {
        Text('了')
          .fontSize(36)
          .fontColor('#FFFFFF')
          .fontWeight(FontWeight.Bold)
          .width(80)
          .height(80)
          .borderRadius(20)
          .backgroundColor(Theme.Primary)
          .textAlign(TextAlign.Center)
      }
      .justifyContent(FlexAlign.Center)
      .margin({ bottom: 24 })

      Text('了然')
        .fontSize(28)
        .fontWeight(FontWeight.Bold)
        .fontColor(Theme.TextPrimary)

      Text('AI心理认知与自我疗愈')
        .fontSize(15)
        .fontColor(Theme.TextSecondary)
        .margin({ top: 4 })

      Text('懂你 · 帮你 · 愈己')
        .fontSize(13)
        .fontColor(Theme.TextTertiary)
        .margin({ top: 4, bottom: 48 })

      // 手机号输入
      TextInput({ placeholder: '请输入手机号', text: this.phone })
        .type(InputType.Number)
        .maxLength(11)
        .width('100%')
        .height(52)
        .borderRadius(12)
        .backgroundColor(Theme.Background)
        .onChange((value: string) => { this.phone = value; })
        .margin({ bottom: 12 })

      // 验证码输入
      if (this.showCodeInput) {
        TextInput({ placeholder: '验证码（测试: 123456）', text: this.code })
          .type(InputType.Number)
          .maxLength(6)
          .width('100%')
          .height(52)
          .borderRadius(12)
          .backgroundColor(Theme.Background)
          .onChange((value: string) => { this.code = value; })
          .margin({ bottom: 12 })
      }

      // 登录按钮
      Button(this.showCodeInput ? '登录' : '获取验证码')
        .width('100%')
        .height(52)
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .backgroundColor(Theme.Primary)
        .borderRadius(12)
        .enabled(!this.isLoading)
        .onClick(() => {
          if (!this.showCodeInput && this.phone.length === 11) {
            this.showCodeInput = true;
          } else if (this.showCodeInput && this.phone.length === 11) {
            this.doLogin();
          }
        })
    }
    .width('100%')
    .height('100%')
    .padding(32)
    .backgroundColor(Theme.Background)
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }

  async doLogin() {
    this.isLoading = true;
    try {
      await login(this.phone, '123456');
      promptAction.showToast({ message: '登录成功', duration: 1500 });
      router.replaceUrl({ url: 'pages/HomePage' });
    } catch (err) {
      promptAction.showToast({ message: '登录失败，请重试', duration: 2000 });
    }
    this.isLoading = false;
  }
}
