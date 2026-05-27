// 了然小程序 - 全局应用
App({
  globalData: {
    baseUrl: 'http://localhost:3000',  // 开发环境API地址
    token: null,
    userInfo: null,
    isLoggedIn: false,
  },

  onLaunch() {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.globalData.isLoggedIn = true;
      this.getUserInfo();
    }
  },

  setToken(token) {
    this.globalData.token = token;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('token', token);
  },

  clearToken() {
    this.globalData.token = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('token');
  },

  getUserInfo() {
    this.request('/api/v1/auth/me').then(res => {
      if (res.code === 0) {
        this.globalData.userInfo = res.data;
      }
    });
  },

  // 通用请求方法
  request(path, method = 'GET', data = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.baseUrl + path,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': this.globalData.token ? 'Bearer ' + this.globalData.token : ''
        },
        success(res) {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res.data);
          }
        },
        fail(err) {
          wx.showToast({ title: '网络请求失败', icon: 'none' });
          reject(err);
        }
      });
    });
  },

  // 登录
  login(phone, code) {
    return this.request('/api/v1/auth/login', 'POST', { phone, code });
  },

  // 获取测评列表
  getScales(category) {
    const path = category ? `/api/v1/assessments/scales?category=${category}` : '/api/v1/assessments/scales';
    return this.request(path);
  },

  // 获取测评题目
  getQuestions(scaleId) {
    return this.request(`/api/v1/assessments/scales/${scaleId}/questions`);
  },

  // 提交测评
  submitAssessment(scaleId, answers) {
    return this.request(`/api/v1/assessments/scales/${scaleId}/submit`, 'POST', { answers });
  },

  // 对话相关
  getSessions() {
    return this.request('/api/v1/chat/sessions');
  },

  createSession(agentType) {
    return this.request('/api/v1/chat/sessions', 'POST', { agentType });
  },

  sendMessage(sessionId, content) {
    return this.request(`/api/v1/chat/sessions/${sessionId}/messages`, 'POST', { content });
  },

  // 树洞
  getTreeholeEntries() {
    return this.request('/api/v1/treehole/entries');
  },

  createTreehole(content, mood, intensity) {
    return this.request('/api/v1/treehole/entries', 'POST', { content, mood, moodIntensity: intensity, privacy: 'public' });
  },

  // 打卡
  checkin(mood, intensity) {
    return this.request('/api/v1/users/checkin', 'POST', { mood, moodIntensity: intensity });
  },

  // 统计
  getUserStats() {
    return this.request('/api/v1/users/stats');
  },

  // 会员
  getMemberPlans() {
    return this.request('/api/v1/members/plans');
  },

  getMemberStatus() {
    return this.request('/api/v1/members/status');
  },

  // 积分
  getPointsBalance() {
    return this.request('/api/v1/points/balance');
  }
});
