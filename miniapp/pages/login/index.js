// 了然小程序 - 登录页
const app = getApp();

Page({
  data: {
    phone: '',
    code: '',
    showCodeInput: false,
    loading: false
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value });
  },

  onGetCode() {
    if (this.data.phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    this.setData({ showCodeInput: true });
    wx.showToast({ title: '验证码已发送（测试:123456）', icon: 'none' });
  },

  async onLogin() {
    if (this.data.phone.length < 11) return;

    this.setData({ loading: true });
    try {
      const res = await app.login(this.data.phone, '123456');
      if (res.code === 0 && res.data) {
        app.setToken(res.data.token);
        app.globalData.userInfo = res.data.user;
        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/home/index' });
        }, 500);
      } else {
        wx.showToast({ title: '登录失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
    this.setData({ loading: false });
  }
});
