import type { Page1RealWorldRate } from "@/data/page1-real-world-rates";

export type Page2RealWorldRate = Page1RealWorldRate;

/** 1/8 决赛真实世界晋级概率（百分数），按热门胜率从高到低排列。 */
export const PAGE2_REAL_WORLD_RATES: Page2RealWorldRate[] = [
  { favoriteTeam: "法国", favoriteRate: 92.1, underdogTeam: "巴拉圭", underdogRate: 7.9, pattern: "绝对悬殊" },
  { favoriteTeam: "阿根廷", favoriteRate: 85.1, underdogTeam: "埃及", underdogRate: 14.9, pattern: "绝对悬殊" },
  { favoriteTeam: "摩洛哥", favoriteRate: 72.6, underdogTeam: "加拿大", underdogRate: 27.4, pattern: "优势明显" },
  { favoriteTeam: "巴西", favoriteRate: 68.8, underdogTeam: "挪威", underdogRate: 31.2, pattern: "稳占上风" },
  { favoriteTeam: "西班牙", favoriteRate: 65.9, underdogTeam: "葡萄牙", underdogRate: 34.1, pattern: "稍占优势" },
  { favoriteTeam: "哥伦比亚", favoriteRate: 59.6, underdogTeam: "瑞士", underdogRate: 40.4, pattern: "均势肉搏" },
  { favoriteTeam: "英格兰", favoriteRate: 54.9, underdogTeam: "墨西哥", underdogRate: 45.1, pattern: "稍占优势" },
  { favoriteTeam: "比利时", favoriteRate: 51.0, underdogTeam: "美国", underdogRate: 49.0, pattern: "五五开对局" }
];
