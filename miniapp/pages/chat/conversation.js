// 了然小程序 - 对话会话页
const app = getApp();

Page({
  data: {
    sessionId: '',
    messages: [],
    inputText: '',
    loading: false
  },

  onLoad(options) {
    const sessionId = options.id;
    if (!sessionId) {
      wx.showToast({ title: '会话不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    this.setData({ sessionId });
    this.loadMessages();
  },

  async loadMessages() {
    try {
      const res = await this.requestMessages();
      if (res.code === 0) {
        this.setData({ messages: res.data.messages || [] });
      }
    } catch (err) {
      console.error('加载消息失败', err);
    }
  },

  requestMessages() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: app.globalData.baseUrl + '/api/v1/chat/sessions/' + this.data.sessionId + '/messages',
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + app.globalData.token
        },
        success(res) {
          if (res.statusCode === 200) resolve(res.data);
          else reject(res.data);
        },
        fail: reject
      });
    });
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  async onSend() {
    const text = this.data.inputText.trim();
    if (!text || this.data.loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    const msgs = [...this.data.messages, userMsg];
    this.setData({ messages: msgs, inputText: '', loading: true });

    try {
      const res = await app.sendMessage(this.data.sessionId, text);
      if (res.code === 0) {
        this.setData({
          messages: [...this.data.messages, userMsg, res.data.aiMessage],
          loading: false
        });
      }
    } catch (err) {
      wx.showToast({ title: '发送失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  onBack() {
    wx.navigateBack();
  }
});
