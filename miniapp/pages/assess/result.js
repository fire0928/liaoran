// 了然小程序 - 测评结果页
const app = getApp();

Page({
  data: {
    scaleName: '',
    totalScore: 0,
    maxScore: 0,
    severity: 'healthy',
    severityLabel: '良好',
    dimensionScores: {},
    interpretation: '',
    pointsEarned: 0,
    percentRank: 0
  },

  onLoad(options) {
    if (options.data) {
      const result = JSON.parse(decodeURIComponent(options.data));
      this.setData({
        scaleName: result.scaleName || '',
        totalScore: result.totalScore || 0,
        maxScore: result.maxScore || 0,
        severity: result.severity || result.scores?.severity || 'healthy',
        severityLabel: result.severityLabel || result.scores?.severityLabel || '良好',
        dimensionScores: result.dimensionScores || {},
        interpretation: result.interpretation || '',
        pointsEarned: result.pointsEarned || 0,
        percentRank: result.scores?.percentRank || Math.min((result.totalScore / (result.maxScore || 1)) * 100, 100)
      });
    }
  },

  // 查看历史
  goHistory() {
    wx.switchTab({ url: '/pages/profile/index' });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `我完成了${this.data.scaleName}测评，状态：${this.data.severityLabel}`,
      path: '/pages/home/index'
    };
  },

  getSeverityColor(severity) {
    const map = {
      healthy: '#5BA88D',
      mild: '#D4943A',
      moderate: '#E8835A',
      'moderate-severe': '#C75C5C',
      severe: '#C0392B'
    };
    return map[severity] || '#5BA88D';
  }
});
