// 了然小程序 - 树洞页
const app = getApp();

Page({
  data: {
    entries: [],
    showComposer: false,
    composerText: ''
  },

  onShow() {
    this.loadEntries();
  },

  async loadEntries() {
    try {
      const res = await app.getTreeholeEntries();
      if (res.code === 0) {
        this.setData({ entries: res.data });
      }
    } catch (err) {
      console.error('加载失败', err);
    }
  },

  onShowComposer() {
    this.setData({ showComposer: true, composerText: '' });
  },

  onHideComposer() {
    this.setData({ showComposer: false });
  },

  onTextInput(e) {
    this.setData({ composerText: e.detail.value });
  },

  async onSubmitTreehole() {
    const text = this.data.composerText.trim();
    if (!text) return;

    try {
      await app.createTreehole(text, 'other', 5);
      wx.showToast({ title: '发布成功！+5积分', icon: 'none' });
      this.setData({ showComposer: false, composerText: '' });
      this.loadEntries();
    } catch (err) {
      wx.showToast({ title: '发布失败', icon: 'none' });
    }
  }
});
