// 了然小程序 - 个人中心
const app = getApp();

Page({
  data: {
    userInfo: null,
    stats: { assessCount: 0, chatCount: 0, treeholeCount: 0, checkinCount: 0, streak: 0 }
  },

  onShow() {
    this.setData({ userInfo: app.globalData.userInfo });
    app.getUserStats().then(res => {
      if (res.code === 0) {
        this.setData({ stats: res.data });
      }
    });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success(res) {
        if (res.confirm) {
          app.clearToken();
          wx.redirectTo({ url: '/pages/login/index' });
        }
      }
    });
  },

  goToProfile() { wx.showToast({ title: '功能开发中', icon: 'none' }); },
  goToSecurity() { wx.showToast({ title: '功能开发中', icon: 'none' }); },
  goToPrivacy() { wx.showToast({ title: '功能开发中', icon: 'none' }); },
  goToAbout() {
    wx.showModal({
      title: '关于了然',
      content: '了然 - AI心理认知与自我疗愈\n版本 1.0.0\n\n懂你 · 帮你 · 愈己',
      showCancel: false
    });
  }
});
