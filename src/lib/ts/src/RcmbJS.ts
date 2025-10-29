
export const enum Method {
  FindCombination = 1,
  FindDivider = 2,
}

export const enum TopologyConstraint {
  Series = 1,
  Parallel = 2,
  NoLimit = Series | Parallel,
}

export const MAX_COMBINATION_ELEMENTS = 10;

export class Topology {
  public num_leafs = -1;
  public depth = -1;
  public hash = -1;

  constructor(
      public iLeft: number, public iRight: number, public parallel: boolean,
      public children: Array<Topology>) {
    if (children.length === 0) {
      this.hash = 1;
      this.depth = 0;
      this.num_leafs = 1;
    } else {
      const POLY = 0x80200003;
      let lfsr = parallel ? 0xAAAAAAAA : 0x55555555;
      this.num_leafs = 0;
      for (const child of children) {
        lfsr ^= child.hash;
        const msb = (lfsr & 0x80000000) !== 0;
        lfsr = (lfsr & 0x7FFFFFFF) << 1;
        if (msb) lfsr ^= POLY;
        this.num_leafs += child.num_leafs;
        this.depth = Math.max(this.depth, child.depth + 1);
      }
      this.hash = lfsr;
    }
  }

  get isLeaf(): boolean {
    return this.iLeft + 1 >= this.iRight;
  }
}

export class Combination {
  capacitor = false;
  parallel = false;
  children: Combination[] = [];
  value = 0;
  num_leafs = -1;

  constructor() {}

  get isLeaf(): boolean {
    return this.children.length === 0;
  }

  get unit(): string {
    return this.capacitor ? 'F' : 'Ω';
  }

  toString(indent: string = ''): string {
    if (this.isLeaf) {
      return `${indent}${formatValue(this.value, this.unit)}\n`;
    } else {
      let ret = '';
      for (const child of this.children) {
        ret += child.toString(indent + '    ');
      }
      ret = `${indent}${this.parallel ? 'Parallel' : 'Series'} ` +
          `(${formatValue(this.value, this.unit)}):\n${ret}`;
      return ret;
    }
  }

  toJson(): any {
    if (this.isLeaf) {
      return this.value;
    } else {
      return {
        parallel: this.parallel,
        value: this.value,
        children: this.children.map(child => child.toJson()),
      };
    }
  }
}

export class DoubleCombination {
  constructor(
      public uppers: Combination[], public lowers: Combination[],
      public ratio: number) {}

  toString(): string {
    const up = this.uppers[0];
    const lo = this.lowers[0];
    let ret = `R2 / (R1 + R2) = ${this.ratio.toFixed(6)}\n` +
        `R1 + R2 = ${formatValue(up.value + lo.value, 'Ω')}\n`;
    ret += 'R1:\n';
    ret += up.toString('    ');
    ret += 'R2:\n';
    ret += lo.toString('    ');
    return ret;
  }

  toJson(): any {
    return {
      ratio: this.ratio,
      uppers: this.uppers.map(upper => upper.toJson()),
      lowers: this.lowers.map(lower => lower.toJson()),
    };
  }
}

const topologies = new Map<number, Topology[]>();

export function findCombinations(
    capacitor: boolean, values: number[], targetValue: number,
    maxElements: number, topoConstr: TopologyConstraint,
    maxDepth: number): any {
  try {
    const ret = searchCombinations(
        capacitor, values, targetValue, maxElements, topoConstr, maxDepth);
    return {
      error: '',
      result: ret.map(comb => comb.toJson()),
    };
  } catch (e) {
    return {
      error: (e as Error).message,
      result: [],
    };
  }
}

export function findDividers(
    capacitor: boolean, values: number[], targetRatio: number, totalMin: number,
    totalMax: number, maxElements: number, topoConstr: TopologyConstraint,
    maxDepth: number): any {
  try {
    const ret = searchDividers(
        capacitor, values, targetRatio, totalMin, totalMax, maxElements,
        topoConstr, maxDepth);
    return {
      error: '',
      result: ret.map(comb => comb.toJson()),
    };
  } catch (e) {
    return {
      error: (e as Error).message,
      result: [],
    };
  }
}

function searchCombinations(
    capacitor: boolean, values: number[], targetValue: number,
    maxElements: number, topoConstr: TopologyConstraint,
    maxDepth: number): Combination[] {
  const epsilon = targetValue * 1e-9;
  const retMin = targetValue / 2;
  const retMax = targetValue * 2;

  const numValues = topoConstr === TopologyConstraint.NoLimit ?
      values.length :
      values.length / 2;
  const numComb = Math.pow(numValues, maxElements);
  if (maxElements > MAX_COMBINATION_ELEMENTS || numComb > 1e6) {
    throw new Error('The search space is too large.');
  }

  let bestError: number = Number.POSITIVE_INFINITY;
  let bestCombinations: Combination[] = [];
  for (let numElem = 1; numElem <= maxElements; numElem++) {
    // console.log(`Searching combinations with ${numElem} elements...`);
    const topos = searchTopologies(0, numElem);
    // console.log(`Found ${topos.length} topologies.`);
    const indices = new Array<number>(numElem).fill(0);
    while (indices[numElem - 1] < values.length) {
      for (const topo of topos) {
        const t = topo.parallel ? TopologyConstraint.Parallel :
                                  TopologyConstraint.Series;
        if (numElem >= 2 && !(t & topoConstr)) continue;
        if (topo.depth > maxDepth) continue;

        const value =
            calcValue(capacitor, values, indices, topo, null, retMin, retMax);
        if (isNaN(value)) {
          continue;
        }
        // console.log(`Value: ${value}`);
        const error = Math.abs(value - targetValue);

        if (error - epsilon > bestError) {
          continue;
        }

        if (error + epsilon < bestError) {
          bestCombinations = [];
        }

        // console.log(`Error: ${error}`);
        bestError = error;
        const comb = new Combination();
        calcValue(capacitor, values, indices, topo, comb);
        bestCombinations.push(comb);
      }

      // increment indices
      incrementIndices(indices, values);
    }

    if (bestError <= epsilon) {
      break;
    }
  }

  return filterUnnormalizedCombinations(bestCombinations);
}

function searchDividers(
    capacitor: boolean, values: number[], targetRatio: number, totalMin: number,
    totalMax: number, maxElements: number, topoConstr: TopologyConstraint,
    maxDepth: number): DoubleCombination[] {
  const epsilon = 1e-9;

  if (maxElements > MAX_COMBINATION_ELEMENTS) {
    throw new Error('The search space is too large.');
  }

  let bestError: number = Number.POSITIVE_INFINITY;
  let bestCombinations: DoubleCombination[] = [];
  const combMemo = new Map<number, DoubleCombination>();

  for (let numElem = 1; numElem <= maxElements; numElem++) {
    const topos = searchTopologies(0, numElem);
    const indices = new Array<number>(numElem).fill(0);
    while (indices[numElem - 1] < values.length) {
      for (const topo of topos) {
        const t = topo.parallel ? TopologyConstraint.Parallel :
                                  TopologyConstraint.Series;
        if (numElem >= 2 && !(t & topoConstr)) continue;
        if (topo.depth > maxDepth) continue;

        const lowerValue =
            calcValue(capacitor, values, indices, topo, null, 0, totalMax);
        if (isNaN(lowerValue)) {
          continue;
        }

        const totalTargetValue = lowerValue / targetRatio;
        const upperTargetValue = totalTargetValue - lowerValue;
        if (totalTargetValue < totalMin || totalMax < totalTargetValue) {
          continue;
        }

        if (lowerValue in combMemo) {
          const lowerComb = new Combination();
          calcValue(capacitor, values, indices, topo, lowerComb);
          combMemo.get(lowerValue)?.lowers.push(lowerComb);
          continue;
        }

        const upperCombs = searchCombinations(
            capacitor, values, upperTargetValue, maxElements, topoConstr,
            maxDepth);
        if (upperCombs.length === 0) {
          continue;
        }

        const ratio = lowerValue / (upperCombs[0].value + lowerValue);
        const error = Math.abs(ratio - targetRatio);
        if (error - epsilon > bestError) {
          continue;
        }

        if (error + epsilon < bestError) {
          // console.log(`New best error: ${error}`);
          bestCombinations = [];
        }

        bestError = error;
        const lowerComb = new Combination();
        calcValue(capacitor, values, indices, topo, lowerComb);
        const dividerComb =
            new DoubleCombination(upperCombs, [lowerComb], ratio);
        bestCombinations.push(dividerComb);
        combMemo.set(lowerValue, dividerComb);
      }

      // increment indices
      incrementIndices(indices, values);
    }

    if (bestError <= epsilon) {
      break;
    }
  }

  for (const comb of bestCombinations) {
    comb.uppers = filterUnnormalizedCombinations(comb.uppers);
    comb.lowers = filterUnnormalizedCombinations(comb.lowers);
  }
  return bestCombinations;
}

function incrementIndices(indices: number[], values: number[]) {
  const n = indices.length;
  for (let i = 0; i < n; i++) {
    indices[i]++;
    if (indices[i] < values.length) {
      break;
    } else if (i + 1 >= n) {
      break;
    } else {
      indices[i] = 0;
    }
  }
}

function filterUnnormalizedCombinations(combs: Combination[]): Combination[] {
  let bestComplexity = Number.POSITIVE_INFINITY;
  for (const comb of combs) {
    if (comb.num_leafs < bestComplexity) {
      bestComplexity = comb.num_leafs;
    }
  }
  return combs.filter(comb => comb.num_leafs === bestComplexity);
}

function calcValue(
    capacitor: boolean, values: number[], indices: number[], topo: Topology,
    comb: Combination|null = null, min = 0,
    max = Number.POSITIVE_INFINITY): number {
  if (comb) {
    comb.capacitor = capacitor;
    comb.parallel = topo.parallel;
    comb.num_leafs = topo.num_leafs;
  }

  if (topo.isLeaf) {
    const val = values[indices[topo.iLeft]];
    if (val < min || max < val) {
      return NaN;
    }
    if (comb) {
      comb.value = val;
    }
    return val;
  }

  let invSum = false;
  if (capacitor) {
    invSum = !topo.parallel;
  } else {
    invSum = topo.parallel;
  }

  let accum = 0;
  let lastVal = Number.POSITIVE_INFINITY;
  let lastTopo = -1;
  for (let iChild = 0; iChild < topo.children.length; iChild++) {
    const childTopo = topo.children[iChild];
    const childComb = comb ? new Combination() : null;
    const first = (iChild === 0);
    const last = (iChild + 1 >= topo.children.length);

    let childMin = 0;
    let childMax = Number.POSITIVE_INFINITY;
    if (invSum) {
      if (last) {
        const tmp = 1 / accum;
        childMin = tmp * min / (tmp - min);
        childMax = tmp * max / (tmp - max);
        if (childMax < childMin) childMax = Number.POSITIVE_INFINITY;
      } else {
        childMin = min;
      }
    } else {
      if (last) {
        childMin = min - accum;
      }
      childMax = max - accum;
    }

    const childVal = calcValue(
        capacitor, values, indices, childTopo, childComb, childMin, childMax);

    if (isNaN(childVal)) {
      return NaN;
    }
    if (lastTopo === childTopo.hash) {
      // 重複を避けるため、同一のトポロジーが連続している場合は
      // 値が小さい順に並んでいることを要求する
      if (childVal > lastVal) return NaN;
    }
    lastTopo = childTopo.hash;
    lastVal = childVal;
    if (comb) comb.children.push(childComb!);
    if (invSum) {
      accum += 1 / childVal;
    } else {
      accum += childVal;
    }
  }

  const val = invSum ? (1 / accum) : accum;
  if (comb) comb.value = val;
  return val;
}

export function searchTopologies(iLeft: number, iRight: number) {
  let topos = searchTopologiesRecursive(iLeft, iRight, false);
  if (iLeft + 1 < iRight) {
    topos = topos.concat(searchTopologiesRecursive(iLeft, iRight, true));
  }
  return topos;
}

function searchTopologiesRecursive(
    iLeft: number, iRight: number, parallel: boolean): Topology[] {
  // console.assert(iLeft < iRight);
  const key = iLeft + iRight * 1000 + (parallel ? 1000000 : 0);
  if (topologies.has(key)) {
    return topologies.get(key)!;
  }

  const ret = new Array<Topology>();

  if (iLeft + 1 >= iRight) {
    ret.push(new Topology(iLeft, iRight, parallel, []));
    topologies.set(key, ret);
    return ret;
  }

  const n = iRight - iLeft;
  const buff = new Array<number>(n);
  // console.log(`A iLeft=${iLeft} iRight=${iRight} parallel=${parallel}`);
  divideElementsRecursive(
      buff, 0, n, (partSizes: number[], numParts: number) => {
        const parts = new Array<Topology[]>(numParts);
        let il = iLeft;
        for (let iPart = 0; iPart < numParts; iPart++) {
          const ir = il + partSizes[iPart];
          parts[iPart] = searchTopologiesRecursive(il, ir, !parallel);
          il = ir;
        }

        const indices = new Array<number>(numParts).fill(0);
        while (indices[numParts - 1] < parts[numParts - 1].length) {
          const childNodes = new Array<Topology>(numParts);
          for (let iPart = 0; iPart < numParts; iPart++) {
            childNodes[iPart] = parts[iPart][indices[iPart]];
          }
          ret.push(new Topology(iLeft, iRight, parallel, childNodes));

          // increment indices
          for (let i = 0; i < numParts; i++) {
            indices[i]++;
            if (indices[i] < parts[i].length) {
              break;
            } else if (i + 1 >= numParts) {
              break;
            } else {
              indices[i] = 0;
            }
          }
        }
      }, 0);
  // console.log('B');

  topologies.set(key, ret);
  return ret;
}

function divideElementsRecursive(
    buff: number[], buffSize: number, numElems: number,
    callback: (partSizes: number[], numParts: number) => void,
    depth: number): void {
  // console.log(`Depth ${depth}: [${buff.slice(0, buffSize).join(', ')}]`);
  if (numElems === 0) {
    callback(buff, buffSize);
  } else {
    let wMax = numElems;
    if (buffSize == 0) {
      wMax = numElems - 1;
    } else if (buffSize > 0 && buff[buffSize - 1] < wMax) {
      wMax = buff[buffSize - 1];
    }
    for (let w = 1; w <= wMax; w++) {
      buff[buffSize] = w;
      divideElementsRecursive(
          buff, buffSize + 1, numElems - w, callback, depth + 1);
    }
  }
}

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
