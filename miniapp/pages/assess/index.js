// 了然小程序 - 测评页
const app = getApp();

Page({
  data: {
    scales: [],
    categories: [
      { label: '全部', key: 'all' },
      { label: '情绪筛查', key: 'emotion' },
      { label: '压力评估', key: 'stress' },
      { label: '人格特质', key: 'personality' },
      { label: '幸福感', key: 'wellbeing' },
      { label: '人际关系', key: 'relationship' }
    ],
    selectedCategory: 'all'
  },

  onShow() {
    this.loadScales();
  },

  async loadScales(category) {
    try {
      const res = await app.getScales(category);
      if (res.code === 0) {
        this.setData({ scales: res.data });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onSelectCategory(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ selectedCategory: key });
    this.loadScales(key === 'all' ? null : key);
  },

  onStartAssess(e) {
    const scale = e.currentTarget.dataset.scale;
    wx.navigateTo({
      url: `/pages/assess/questions?id=${scale.id}&name=${encodeURIComponent(scale.name)}`
    });
  }
});
