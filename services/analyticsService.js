class AnalyticsService {
  static calculateGrowthRate(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }

  static calculateROI(revenue, investment) {
    if (investment === 0) return 0;
    return Math.round(((revenue - investment) / investment) * 100 * 100) / 100;
  }

  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  static getSeasonFromDate(date) {
    const month = date.getMonth() + 1;
    if (month >= 6 && month <= 10) return 'Kharif';
    if (month >= 11 || month <= 4) return 'Rabi';
    return 'Zaid';
  }

  static calculateYieldEfficiency(actualYield, expectedYield) {
    if (expectedYield === 0) return 0;
    return Math.round((actualYield / expectedYield) * 100 * 100) / 100;
  }

  static groupDataByPeriod(data, period = 'month') {
    const grouped = {};
    
    data.forEach(item => {
      const date = new Date(item.createdAt);
      let key;
      
      switch (period) {
        case 'week':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    return grouped;
  }

  static calculateMovingAverage(data, periods = 3) {
    const result = [];
    for (let i = periods - 1; i < data.length; i++) {
      const sum = data.slice(i - periods + 1, i + 1).reduce((acc, val) => acc + val, 0);
      result.push(sum / periods);
    }
    return result;
  }
}

module.exports = AnalyticsService;