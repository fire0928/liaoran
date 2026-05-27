// 了然小程序 - 测评答题页
const app = getApp();

Page({
  data: {
    scaleId: '',
    scaleName: '',
    scaleInfo: null,
    questions: [],
    currentIndex: 0,
    answers: [],
    submitting: false
  },

  onLoad(options) {
    this.setData({
      scaleId: options.id,
      scaleName: decodeURIComponent(options.name || '')
    });
    this.loadQuestions();
  },

  async loadQuestions() {
    try {
      wx.showLoading({ title: '加载题目...' });
      const res = await app.getQuestions(this.data.scaleId);
      if (res.code === 0) {
        const questions = res.data.questions;
        this.setData({
          scaleInfo: res.data.scale,
          questions,
          answers: new Array(questions.length).fill(null)
        });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
    wx.hideLoading();
  },

  // 选择选项
  onSelectOption(e) {
    const value = parseInt(e.currentTarget.dataset.value);
    const { currentIndex, answers } = this.data;
    answers[currentIndex] = { selectedIndex: value, score: value };
    this.setData({ answers });
  },

  // 上一题
  onPrev() {
    if (this.data.currentIndex > 0) {
      this.setData({ currentIndex: this.data.currentIndex - 1 });
    }
  },

  // 下一题
  onNext() {
    if (this.data.currentIndex < this.data.questions.length - 1) {
      this.setData({ currentIndex: this.data.currentIndex + 1 });
    }
  },

  // 提交答案
  async onSubmit() {
    const { answers, questions } = this.data;

    // 检查是否全部答完
    const unanswered = answers.findIndex(a => a === null);
    if (unanswered >= 0) {
      wx.showModal({
        title: '提示',
        content: `还有 ${answers.filter(a => a === null).length} 题未作答，确定提交吗？`,
        success: (res) => {
          if (res.confirm) this.doSubmit();
        }
      });
      return;
    }

    this.doSubmit();
  },

  async doSubmit() {
    this.setData({ submitting: true });
    try {
      const res = await app.submitAssessment(this.data.scaleId, this.data.answers);
      if (res.code === 0) {
        wx.redirectTo({
          url: `/pages/assess/result?data=${encodeURIComponent(JSON.stringify(res.data))}`
        });
      } else {
        wx.showToast({ title: '提交失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
    this.setData({ submitting: false });
  },

  // 跳到指定题
  onJumpTo(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    this.setData({ currentIndex: idx });
  }
});
