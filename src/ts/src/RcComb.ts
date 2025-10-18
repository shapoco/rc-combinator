import {getStr} from './Text';

export const SERIESES: Record<string, number[]> = {
  'E3': [100, 220, 470],
  'E6': [100, 150, 220, 330, 470, 680],
  'E12': [100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820],
  'E24': [
    100, 110, 120, 130, 150, 160, 180, 200, 220, 240, 270, 300,
    330, 360, 390, 430, 470, 510, 560, 620, 680, 750, 820, 910
  ],
};

export const enum ComponentType {
  Resistor,
  Capacitor,
}

export class TopologyNode {
  complexity_: number = -1;
  constructor(
      public iLeft: number, public iRight: number, public parallel: boolean,
      public children: Array<TopologyNode>) {}
  get isLeaf(): boolean {
    return this.iLeft + 1 >= this.iRight;
  }

  get complexity(): number {
    if (this.complexity_ < 0) {
      if (this.isLeaf) {
        this.complexity_ = 1;
      } else {
        this.complexity_ = 0;
        for (const child of this.children) {
          this.complexity_ += child.complexity;
        }
      }
    }
    return this.complexity_;
  }
}

const RE_VALUE = /^(\d+(\.\d+)?)([kKmM]?)$/;


const topologyMemo = new Map<number, TopologyNode[]>();

export function formatValue(value: number, unit: string = ''): string {
  let prefix = '';
  if (unit) {
    if (value >= 1e12) {
      value /= 1e12;
      prefix = 'T';
    } else if (value >= 1e9) {
      value /= 1e9;
      prefix = 'G';
    } else if (value >= 1e6) {
      value /= 1e6;
      prefix = 'M';
    } else if (value >= 1e3) {
      value /= 1e3;
      prefix = 'k';
    } else if (value >= 1) {
      prefix = '';
    } else if (value >= 1e-3) {
      value *= 1e3;
      prefix = 'm';
    } else if (value >= 1e-6) {
      value *= 1e6;
      prefix = 'u';
    } else if (value >= 1e-9) {
      value *= 1e9;
      prefix = 'n';
    } else if (value >= 1e-12) {
      value *= 1e12;
      prefix = 'p';
    }
  }
  value = Math.round(value * 1000000);
  let s = '';
  while (s.length <= 7 || value > 0) {
    const digit = value % 10;
    value = Math.floor(value / 10);
    s = digit.toString() + s;
    if (s.length === 6) s = '.' + s;
  }
  s = s.replace(/\.?0+$/, '');
  return `${s} ${prefix}${unit}`.trim();
}

// export function parseValue(text: string): number {
//   const match = RE_VALUE.exec(text);
//   if (!match) {
//     throw new Error(`Invalid resistor value: ${text}`);
//   }
//   let value = parseFloat(match[1]);
//   const unit = match[3];
//   switch (unit) {
//     case 'n':
//       value *= 1e-9;
//       break;
//     case 'u':
//       value *= 1e-6;
//       break;
//     case 'm':
//       value *= 1e-3;
//       break;
//     case 'k':
//     case 'K':
//       value *= 1e3;
//       break;
//     case 'M':
//       value *= 1e6;
//       break;
//     case 'G':
//       value *= 1e9;
//       break;
//     case 'T':
//       value *= 1e12;
//       break;
//   }
//   return value;
// }

export class Combination {
  constructor(
      public parallel: boolean = false, public children: Combination[] = [],
      public value: number = 0, public complexity: number = -1) {}

  toString(indent: string = ''): string {
    if (this.children.length === 0) {
      return `${indent}${formatValue(this.value, 'Ω')}\n`;
    } else {
      let ret = '';
      for (const child of this.children) {
        ret += child.toString(indent + '    ');
      }
      ret = `${indent}${
                this.parallel ? getStr('Parallel') : getStr('Series')}: ` +
          `${formatValue(this.value, 'Ω')}\n${ret}`;
      return ret;
    }
  }
}

export class DividerCombination {
  constructor(
      public upper: Combination[], public lower: Combination[],
      public ratio: number) {}

  toString(): string {
    const up = this.upper[0];
    const lo = this.lower[0];
    let ret = `R2 / (R1 + R2) = ${this.ratio.toFixed(6)}\n` +
        `R1 + R2 = ${formatValue(up.value + lo.value, 'Ω')}\n`;
    ret += '  R1:\n';
    ret += up.toString('    ');
    ret += '  R2:\n';
    ret += lo.toString('    ');
    return ret;
  }
}

export function findCombinations(
    cType: ComponentType, values: number[], targetValue: number,
    maxElements: number): Combination[] {
  const epsilon = targetValue * 1e-6;

  const numComb = Math.pow(values.length, maxElements);
  if (maxElements > 10 || numComb > 1e6) {
    throw new Error(getStr('The search space is too large.'));
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
        const value = calcValue(cType, values, indices, topo);
        if (isNaN(value)) {
          continue;
        }
        // console.log(`Value: ${value}`);
        const error = Math.abs(value - targetValue);

        let update = false;
        if (error < bestError - epsilon) {
          bestCombinations = [];
          update = true;
        }

        if (update) {
          // console.log(`Error: ${error}`);
          bestError = error;
          const comb = new Combination();
          calcValue(cType, values, indices, topo, comb);
          bestCombinations.push(comb);
        }
      }

      // increment indices
      incrementIndices(indices, values);
    }

    if (bestError <= epsilon) {
      break;
    }
  }

  return selectSimplestCombinations(bestCombinations);
}

export function findDividers(
    cType: ComponentType, values: number[], targetRatio: number,
    totalMin: number, totalMax: number,
    maxElements: number): DividerCombination[] {
  const epsilon = 1e-6;

  const numComb = Math.pow(values.length, 2 * maxElements);
  if (maxElements > 10 || numComb > 1e7) {
    throw new Error(getStr('The search space is too large.'));
  }

  let bestError: number = Number.POSITIVE_INFINITY;
  let bestCombinations: DividerCombination[] = [];
  const combMemo = new Map<number, DividerCombination>();

  for (let numElem = 1; numElem <= maxElements; numElem++) {
    const topos = searchTopologies(0, numElem);
    const indices = new Array<number>(numElem).fill(0);
    while (indices[numElem - 1] < values.length) {
      for (const topo of topos) {
        const lowerValue = calcValue(cType, values, indices, topo);
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
          calcValue(cType, values, indices, topo, lowerComb);
          combMemo.get(lowerValue)?.lower.push(lowerComb);
          continue;
        }

        const upperCombs =
            findCombinations(cType, values, upperTargetValue, maxElements);
        if (upperCombs.length === 0) {
          continue;
        }

        const ratio = lowerValue / (upperCombs[0].value + lowerValue);
        const error = Math.abs(ratio - targetRatio);
        if (error > bestError + epsilon) {
          continue;
        }

        if (error < bestError - epsilon) {
          // console.log(`New best error: ${error}`);
          bestCombinations = [];
        }

        bestError = error;
        const lowerComb = new Combination();
        calcValue(cType, values, indices, topo, lowerComb);
        const dividerComb =
            new DividerCombination(upperCombs, [lowerComb], ratio);
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
    comb.upper = selectSimplestCombinations(comb.upper);
    comb.lower = selectSimplestCombinations(comb.lower);
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

function calcValue(
    cType: ComponentType, values: number[], indices: number[],
    topo: TopologyNode, comb: Combination|null = null): number {
  if (comb) {
    comb.parallel = topo.parallel;
    comb.complexity = topo.complexity;
  }

  if (topo.isLeaf) {
    const val = values[indices[topo.iLeft]];
    if (comb) comb.value = val;
    return val;
  }

  let invSum = false;
  if (cType === ComponentType.Resistor) {
    invSum = topo.parallel;
  } else {
    invSum = !topo.parallel;
  }

  let ret = 0;
  let lastLeafVal = Number.POSITIVE_INFINITY;
  let lastCombVal = Number.POSITIVE_INFINITY;
  for (const childTopo of topo.children) {
    const childComb = comb ? new Combination() : null;
    const childVal = calcValue(cType, values, indices, childTopo, childComb);
    if (isNaN(childVal)) {
      return NaN;
    }
    if (childTopo.isLeaf) {
      if (childVal > lastLeafVal) return NaN;
      lastLeafVal = childVal;
    } else {
      if (childVal > lastCombVal) return NaN;
      lastCombVal = childVal;
    }
    if (comb) comb.children.push(childComb!);
    if (invSum) {
      ret += 1 / childVal;
    } else {
      ret += childVal;
    }
  }

  const val = invSum ? 1 / ret : ret;
  if (comb) comb.value = val;
  return val;
}

export function makeAvaiableValues(
    series: string, minValue: number, maxValue: number): number[] {
  const baseValues = SERIESES[series];
  if (!baseValues) {
    throw new Error(`Unknown series: ${series}`);
  }
  const values = [];
  for (let exp = -9; exp <= 12; exp++) {
    const multiplier = Math.pow(10, exp);
    for (const base of baseValues) {
      const value = base * multiplier;
      if (value >= minValue && value <= maxValue) {
        values.push(value);
      }
    }
  }
  values.sort((a, b) => a - b);
  return values;
}

function selectSimplestCombinations(combs: Combination[]): Combination[] {
  let bestComplexity = Number.POSITIVE_INFINITY;
  for (const comb of combs) {
    if (comb.complexity < bestComplexity) {
      bestComplexity = comb.complexity;
    }
  }
  return combs.filter(comb => comb.complexity === bestComplexity);
}

function searchTopologies(iLeft: number, iRight: number) {
  let topos = searchTopologiesRecursive(iLeft, iRight, false);
  if (iLeft + 1 < iRight) {
    topos = topos.concat(searchTopologiesRecursive(iLeft, iRight, true));
  }
  return topos;
}

function searchTopologiesRecursive(
    iLeft: number, iRight: number, parallel: boolean): TopologyNode[] {
  // console.assert(iLeft < iRight);
  const key = iLeft + iRight * 1000 + (parallel ? 1000000 : 0);
  if (topologyMemo.has(key)) {
    return topologyMemo.get(key)!;
  }

  const ret = new Array<TopologyNode>();

  if (iLeft + 1 >= iRight) {
    ret.push(new TopologyNode(iLeft, iRight, parallel, []));
    topologyMemo.set(key, ret);
    return ret;
  }

  const n = iRight - iLeft;
  const buff = new Array<number>(n);
  // console.log(`A iLeft=${iLeft} iRight=${iRight} parallel=${parallel}`);
  divideElementsRecursive(
      buff, 0, n, (partSizes: number[], numParts: number) => {
        const parts = new Array<TopologyNode[]>(numParts);
        let il = iLeft;
        for (let iPart = 0; iPart < numParts; iPart++) {
          const ir = il + partSizes[iPart];
          parts[iPart] = searchTopologiesRecursive(il, ir, !parallel);
          il = ir;
        }

        const indices = new Array<number>(numParts).fill(0);
        while (indices[numParts - 1] < parts[numParts - 1].length) {
          const childNodes = new Array<TopologyNode>(numParts);
          for (let iPart = 0; iPart < numParts; iPart++) {
            childNodes[iPart] = parts[iPart][indices[iPart]];
          }
          ret.push(new TopologyNode(iLeft, iRight, parallel, childNodes));

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

  topologyMemo.set(key, ret);
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
    let wMax = buffSize == 0 ? numElems - 1 : numElems;
    if (buffSize > 0 && buff[buffSize - 1] < wMax) {
      wMax = buff[buffSize - 1];
    }
    for (let w = 1; w <= wMax; w++) {
      buff[buffSize] = w;
      divideElementsRecursive(
          buff, buffSize + 1, numElems - w, callback, depth + 1);
    }
  }
}