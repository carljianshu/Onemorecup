const ZH_COUNTRY_TO_FIFA: Record<string, string> = {
  民主刚果: "COD",
  科特迪瓦: "CIV",
  阿尔及利亚: "ALG",
  澳大利亚: "AUS",
  厄瓜多尔: "ECU",
  克罗地亚: "CRO",
  哥伦比亚: "COL",
  巴拉圭: "PAR",
  阿根廷: "ARG",
  墨西哥: "MEX",
  英格兰: "ENG",
  葡萄牙: "POR",
  苏格兰: "SCO",
  塞内加尔: "SEN",
  摩洛哥: "MAR",
  奥地利: "AUT",
  比利时: "BEL",
  佛得角: "CPV",
  加拿大: "CAN",
  西班牙: "ESP",
  意大利: "ITA",
  乌拉圭: "URU",
  瑞士: "SUI",
  瑞典: "SWE",
  韩国: "KOR",
  日本: "JPN",
  挪威: "NOR",
  埃及: "EGY",
  伊朗: "IRN",
  法国: "FRA",
  德国: "GER",
  荷兰: "NED",
  巴西: "BRA",
  波黑: "BIH",
  南非: "RSA",
  美国: "USA",
  加纳: "GHA"
};

const EN_COUNTRY_TO_FIFA: Record<string, string> = {
  "DR Congo": "COD",
  "Ivory Coast": "CIV",
  "South Korea": "KOR",
  "South Africa": "RSA",
  "Cape Verde": "CPV",
  Netherlands: "NED",
  Switzerland: "SUI",
  Australia: "AUS",
  Argentina: "ARG",
  Colombia: "COL",
  Portugal: "POR",
  Croatia: "CRO",
  Ecuador: "ECU",
  Algeria: "ALG",
  Paraguay: "PAR",
  Scotland: "SCO",
  Senegal: "SEN",
  Morocco: "MAR",
  Austria: "AUT",
  Belgium: "BEL",
  Mexico: "MEX",
  England: "ENG",
  Canada: "CAN",
  Spain: "ESP",
  Sweden: "SWE",
  Norway: "NOR",
  Brazil: "BRA",
  Japan: "JPN",
  Bosnia: "BIH",
  France: "FRA",
  Germany: "GER",
  Ghana: "GHA",
  Egypt: "EGY",
  Iran: "IRN",
  USA: "USA"
};

function replaceCountryNames(text: string, mapping: Record<string, string>): string {
  let result = text;
  const names = Object.keys(mapping).sort((a, b) => b.length - a.length);
  for (const name of names) {
    result = result.replaceAll(name, mapping[name]!);
  }
  return result;
}

function zhCountryInitial(name: string): string {
  return name.charAt(0);
}

/** 答题总览 / 排行榜每场收益：M1-1～M1-16 列标题（中文取队名首字，英文用 FIFA 代码）。 */
export function formatM1MarketColumnLabel(
  marketId: string,
  candidates: string[] | undefined,
  locale: "zh" | "en"
): string | null {
  const match = /^m1-(\d+)$/i.exec(marketId);
  if (!match)
    return null;
  const num = Number(match[1]);
  if (num < 1 || num > 16 || !candidates || candidates.length < 2)
    return null;
  const [teamA, teamB] = candidates;
  if (locale === "zh")
    return `${zhCountryInitial(teamA)}/${zhCountryInitial(teamB)}`;
  const codeA = ZH_COUNTRY_TO_FIFA[teamA] ?? teamA;
  const codeB = ZH_COUNTRY_TO_FIFA[teamB] ?? teamB;
  return `${codeA}/${codeB}`;
}

export function displayM1MarketColumnLabel(
  marketId: string,
  candidates: string[] | undefined,
  locale: "zh" | "en",
  fallback: string
): string {
  return formatM1MarketColumnLabel(marketId, candidates, locale) ?? fallback;
}

/** 管理员「所有玩家选择」表格：将选项中的国家名替换为 FIFA 三字母代码。 */
export function formatPickTeamAsFifaCodes(team: string): string {
  return replaceCountryNames(replaceCountryNames(team, ZH_COUNTRY_TO_FIFA), EN_COUNTRY_TO_FIFA);
}
