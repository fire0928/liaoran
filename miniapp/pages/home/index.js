// 了然小程序 - 首页
const app = getApp();

Page({
  data: {
    userInfo: null,
    stats: { assessCount: 0, chatCount: 0, treeholeCount: 0, checkinCount: 0, streak: 0 },
    moods: [
      { label: '😊 很不错', value: 'great' },
      { label: '🙂 还可以', value: 'good' },
      { label: '😐 一般般', value: 'okay' },
      { label: '😔 有点低落', value: 'low' },
      { label: '😰 不太好', value: 'bad' }
    ],
    agents: [
      { name: '青年知音', desc: '擅长校园生活、成长困惑', tag: '青少年方向', type: 'teen' },
      { name: '通用助手', desc: '全能型心理支持，日常情绪疏导', tag: '通用方向', type: 'general' },
      { name: '情绪导航员', desc: '帮你识别和理解复杂情绪', tag: '情绪疏导', type: 'emotion' },
      { name: '认知重构师', desc: '引导发现不合理思维模式', tag: '认知疗法', type: 'general' },
      { name: '正念陪伴者', desc: '正念冥想引导，呼吸练习', tag: '正念疗愈', type: 'general' }
    ]
  },

  onLoad() {
    if (!app.globalData.isLoggedIn) {
      wx.redirectTo({ url: '/pages/login/index' });
      return;
    }
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const res = await app.getUserStats();
      if (res.code === 0 && res.data) {
        this.setData({ stats: res.data });
      }
      this.setData({ userInfo: app.globalData.userInfo });
    } catch (err) {
      console.error('加载失败', err);
    }
  },

  onCheckin(e) {
    const { mood } = e.currentTarget.dataset;
    app.checkin(mood, 3).then(res => {
      wx.showToast({ title: res.data.message, icon: 'none' });
      this.loadData();
    });
  },

  onStartChat(e) {
    const { type } = e.currentTarget.dataset;
    app.createSession(type || 'general').then(res => {
      if (res.code === 0) {
        wx.navigateTo({ url: '/pages/chat/conversation?id=' + res.data.session.id });
      }
    });
  },

  goAssess() { wx.switchTab({ url: '/pages/assess/index' }); },
  goChat() { wx.switchTab({ url: '/pages/chat/index' }); },
  goTreehole() { wx.switchTab({ url: '/pages/treehole/index' }); }
});
