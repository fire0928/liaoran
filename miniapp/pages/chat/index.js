// 了然小程序 - 对话页
const app = getApp();

Page({
  data: {
    messages: [],
    inputText: '',
    sessionId: '',
    scrollToView: '',
    loading: false
  },

  onLoad() {
    this.startChat();
  },

  async startChat() {
    this.setData({ loading: true });
    try {
      const res = await app.createSession('general');
      if (res.code === 0) {
        this.setData({
          sessionId: res.data.session.id,
          messages: [res.data.welcomeMessage]
        });
      }
    } catch (err) { wx.showToast({ title: '创建对话失败', icon: 'none' }); }
    this.setData({ loading: false });
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  async onSend() {
    const text = this.data.inputText.trim();
    if (!text) return;

    // 添加用户消息
    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    const msgs = [...this.data.messages, userMsg];
    this.setData({ messages: msgs, inputText: '' });

    try {
      const res = await app.sendMessage(this.data.sessionId, text);
      if (res.code === 0) {
        this.setData({
          messages: [...this.data.messages, userMsg, res.data.aiMessage]
        });
      }
    } catch (err) {
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  }
});
