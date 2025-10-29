const texts: {[key: string]: {[key: string]: string}} = {
  'ja': {
    'Find Resistor Combinations': '合成抵抗を見つける',
    'Find Capacitor Combinations': '合成容量を見つける',
    'Find Voltage Dividers': '分圧抵抗を見つける',
    'Find LED Current Limiting Resistor': 'LEDの電流制限抵抗を見つける',
    'Power Voltage': '電源電圧',
    'Forward Voltage': '順方向電圧',
    'Forward Current': '順方向電流',
    'E Series': 'シリーズ',
    'Item': '項目',
    'Value': '値',
    'Unit': '単位',
    'Minimum': '素子最小値',
    'Maximum': '素子最大値',
    'Custom': 'カスタム',
    'Custom Values': 'カスタム値',
    'Max Elements': '最大素子数',
    'Target Value': '目標値',
    'The search space is too large.': '探索空間が大きすぎます。',
    'Upper Resistor': '上側の抵抗',
    'Lower Resistor': '下側の抵抗',
    'No combinations found.': '組み合わせが見つかりませんでした。',
    '<n> combinations found': '<n> 件の組み合わせが見つかりました',
    'Parallel': '並列',
    'Series': '直列',
    'Ideal Value': '理想値',
    '<s> Approximation': '<s> 近似',
    'Error': '誤差',
    'No Error': '誤差なし',
    'No Limit': '制限なし',
    'Top Topology': '最上位トポロジー',
    'Max Nests': '最大ネスト数',
    'Search Time': '探索時間',
    'Use WebAssembly': 'WebAssembly 使用',
    'Show Color Code': 'カラーコード表示',
  },
};

export function getStr(
    key: string, vars?: {[key: string]: string|number}): string {
  let ret = key;
  const lang = navigator.language;
  if ((lang in texts) && (key in texts[lang])) {
    ret = texts[lang][key];
  }
  if (vars) {
    for (const varKey of Object.keys(vars)) {
      const varValue = vars[varKey];
      ret = ret.replace(new RegExp(`<${varKey}>`, 'g'), varValue.toString());
    }
  }
  return ret;
}
