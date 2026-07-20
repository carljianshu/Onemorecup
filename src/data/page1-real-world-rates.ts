/** 1/16 决赛真实世界晋级概率（百分数），按热门胜率从高到低排列。 */
export interface Page1RealWorldRate {
  favoriteTeam: string;
  favoriteRate: number;
  underdogTeam: string;
  underdogRate: number;
  pattern: string;
}

export const PAGE1_REAL_WORLD_RATES: Page1RealWorldRate[] = [
  { favoriteTeam: "阿根廷", favoriteRate: 92.6, underdogTeam: "佛得角", underdogRate: 7.4, pattern: "绝对悬殊" },
  { favoriteTeam: "西班牙", favoriteRate: 87.2, underdogTeam: "奥地利", underdogRate: 12.8, pattern: "绝对悬殊" },
  { favoriteTeam: "法国", favoriteRate: 86.7, underdogTeam: "瑞典", underdogRate: 13.3, pattern: "绝对悬殊" },
  { favoriteTeam: "英格兰", favoriteRate: 85.3, underdogTeam: "民主刚果", underdogRate: 14.7, pattern: "一边倒" },
  { favoriteTeam: "美国", favoriteRate: 83.9, underdogTeam: "波黑", underdogRate: 16.1, pattern: "一边倒" },
  { favoriteTeam: "德国", favoriteRate: 83.9, underdogTeam: "巴拉圭", underdogRate: 16.1, pattern: "一边倒" },
  { favoriteTeam: "哥伦比亚", favoriteRate: 79.3, underdogTeam: "加纳", underdogRate: 20.7, pattern: "优势明显" },
  { favoriteTeam: "加拿大", favoriteRate: 73.6, underdogTeam: "南非", underdogRate: 26.4, pattern: "优势明显" },
  { favoriteTeam: "巴西", favoriteRate: 72.0, underdogTeam: "日本", underdogRate: 28.0, pattern: "稳占上风" },
  { favoriteTeam: "葡萄牙", favoriteRate: 71.5, underdogTeam: "克罗地亚", underdogRate: 28.5, pattern: "稳占上风" },
  { favoriteTeam: "瑞士", favoriteRate: 64.7, underdogTeam: "阿尔及利亚", underdogRate: 35.3, pattern: "稍占优势" },
  { favoriteTeam: "挪威", favoriteRate: 62.1, underdogTeam: "科特迪瓦", underdogRate: 37.9, pattern: "稍占优势" },
  { favoriteTeam: "墨西哥", favoriteRate: 61.5, underdogTeam: "厄瓜多尔", underdogRate: 38.5, pattern: "稍占优势" },
  { favoriteTeam: "比利时", favoriteRate: 59.1, underdogTeam: "塞内加尔", underdogRate: 40.9, pattern: "均势肉搏" },
  { favoriteTeam: "荷兰", favoriteRate: 58.1, underdogTeam: "摩洛哥", underdogRate: 41.9, pattern: "均势肉搏" },
  { favoriteTeam: "埃及", favoriteRate: 55.7, underdogTeam: "澳大利亚", underdogRate: 44.3, pattern: "五五开对局" }
];
