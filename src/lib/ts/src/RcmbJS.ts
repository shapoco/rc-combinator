
export const enum Method {
  FindCombination = 1,
  FindDivider = 2,
}

export const enum TopologyConstraint {
  Series = 1,
  Parallel = 2,
  NoLimit = Series | Parallel,
}

export type FindCombinationArgs = {
  capacitor: boolean,
  elementValues: number[],
  elementTolMin: number,
  elementTolMax: number,
  numElemsMin: number,
  numElemsMax: number,
  topologyConstraint: TopologyConstraint,
  maxDepth: number,
  targetValue: number,
  targetMin: number,
  targetMax: number,
};

export type FindDividerArgs = {
  elementValues: number[],
  elementTolMin: number,
  elementTolMax: number,
  numElemsMin: number,
  numElemsMax: number,
  topologyConstraint: TopologyConstraint,
  maxDepth: number,
  totalMin: number,
  totalMax: number,
  targetValue: number,
  targetMin: number,
  targetMax: number,
};

export type WorkerCommand = {
  method: Method,
  args: FindCombinationArgs|FindDividerArgs,
}

export const MAX_COMBINATION_ELEMENTS = 15;

export function formatValue(
    value: number, unit: string = '', usePrefix: boolean|null = null): string {
  if (!isFinite(value) || isNaN(value)) {
    return 'NaN';
  }

  if (usePrefix === null) {
    usePrefix = unit !== '';
  }

  let prefix = '';
  if (usePrefix) {
    if (value >= 0.999999e12) {
      value /= 1e12;
      prefix = 'T';
    } else if (value >= 0.999999e9) {
      value /= 1e9;
      prefix = 'G';
    } else if (value >= 0.999999e6) {
      value /= 1e6;
      prefix = 'M';
    } else if (value >= 0.999999e3) {
      value /= 1e3;
      prefix = 'k';
    } else if (value >= 0.999999) {
      prefix = '';
    } else if (value >= 0.999999e-3) {
      value *= 1e3;
      prefix = 'm';
    } else if (value >= 0.999999e-6) {
      value *= 1e6;
      prefix = 'μ';
    } else if (value >= 0.999999e-9) {
      value *= 1e9;
      prefix = 'n';
    } else if (value >= 0.999999e-12) {
      value *= 1e12;
      prefix = 'p';
    }
  }

  const minDigits = usePrefix ? 3 : 6;

  value = Math.round(value * pow10(minDigits));
  let s = '';
  while (s.length <= (minDigits + 1) || value > 0) {
    const digit = value % 10;
    value = Math.floor(value / 10);
    s = digit.toString() + s;
    if (s.length === minDigits) s = '.' + s;
  }
  s = s.replace(/\.?0+$/, '');
  return `${s} ${prefix}${unit}`.trim();
}

function valueKey(value: number): number {
  const clog10 = Math.floor(Math.log10(Math.abs(value)) + 1e-9);
  return Math.round(value / pow10(clog10 - 6));
}

function pow10(exp: number): number {
  let ret = 1;
  const neg = exp < 0;
  if (neg) exp = -exp;
  if (exp >= 16) {
    ret *= 1e16;
    exp -= 16;
  }
  if (exp >= 8) {
    ret *= 1e8;
    exp -= 8;
  }
  if (exp >= 4) {
    ret *= 1e4;
    exp -= 4;
  }
  if (exp >= 2) {
    ret *= 1e2;
    exp -= 2;
  }
  if (exp >= 1) {
    ret *= 1e1;
    exp -= 1;
  }
  ret *= Math.pow(10, exp);
  if (neg) {
    ret = 1 / ret;
  }
  return ret;
}
