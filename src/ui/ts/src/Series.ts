import * as Calc from './Calc';

export const Series: Record<string, number[]> = {
  'E1': [100],
  'E3': [100, 220, 470],
  'E6': [100, 150, 220, 330, 470, 680],
  'E12': [100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820],
  'E24': [
    100, 110, 120, 130, 150, 160, 180, 200, 220, 240, 270, 300,
    330, 360, 390, 430, 470, 510, 560, 620, 680, 750, 820, 910
  ],
};


export function makeAvaiableValues(
    series: string, minValue: number = 1e-12,
    maxValue: number = 1e12): number[] {
  const baseValues = Series[series];
  if (!baseValues) {
    throw new Error(`Unknown series: ${series}`);
  }
  const values = [];
  for (let exp = -11; exp <= 15; exp++) {
    const multiplier = Calc.pow10(exp - 3);
    for (const base of baseValues) {
      const value = base * multiplier;
      const epsilon = value / 1e6;
      if ((minValue - epsilon) <= value && value <= (maxValue + epsilon)) {
        values.push(value);
      }
    }
  }
  values.sort((a, b) => a - b);
  return values;
}
