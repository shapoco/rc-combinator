
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
  constructor(
      public iLeft: number, public iRight: number, public parallel: boolean,
      public children: Array<TopologyNode>) {}
  get isLeaf(): boolean {
    return this.iLeft + 1 >= this.iRight;
  }
}

const memo = new Map<number, TopologyNode[]>();

export function formatValue(value: number): string {
  if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  } else if (value >= 1e3) {
    return (value / 1e3).toFixed(2) + 'k';
  } else if (value >= 1) {
    return value.toFixed(2);
  } else if (value >= 1e-3) {
    return (value * 1e3).toFixed(2) + 'm';
  } else if (value >= 1e-6) {
    return (value * 1e6).toFixed(2) + 'u';
  } else {
    return value.toExponential(2);
  }
}

export class Combination {
  constructor(
      public parallel: boolean = false, public children: Combination[] = [],
      public value: number = 0) {}

  toString(indent: string = ''): string {
    if (this.children.length === 0) {
      return `${indent}${formatValue(this.value)} Ω\n`;
    } else {
      let ret = '';
      for (const child of this.children) {
        ret += child.toString(indent + '    ');
      }
      ret = `${indent}${this.parallel ? 'Parallel' : 'Series'}: ` +
          `${formatValue(this.value)} Ω\n${ret}`;
      return ret;
    }
  }
}

export function findCombinations(
    cType: ComponentType, values: number[], targetValue: number,
    maxElements: number): Combination[] {
  let bestError: number = Number.POSITIVE_INFINITY;
  let bestComplexity: number = Number.POSITIVE_INFINITY;
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
        const complexity = calcComplexity(topo);
        const error = Math.abs(value - targetValue);

        let update = false;
        if (error < bestError ||
            (error === bestError && complexity < bestComplexity)) {
          bestCombinations = [];
          update = true;
        } else if (error === bestError && complexity === bestComplexity) {
          update = true;
        }

        if (update) {
          // console.log(`Error: ${error}`);
          bestComplexity = complexity;
          bestError = error;
          const comb = new Combination();
          calcValue(cType, values, indices, topo, comb);
          bestCombinations.push(comb);
        }
      }

      // increment indices
      for (let i = 0; i < numElem; i++) {
        indices[i]++;
        if (indices[i] < values.length) {
          break;
        } else if (i + 1 >= numElem) {
          break;
        } else {
          indices[i] = 0;
        }
      }
    }

    if (bestError <= targetValue * 1e-6) {
      break;
    }
  }

  return bestCombinations;
}

function calcValue(
    cType: ComponentType, values: number[], indices: number[],
    topo: TopologyNode, comb: Combination|null = null): number {
  if (comb) comb.parallel = topo.parallel;

  if (topo.isLeaf) {
    const val = values[indices[topo.iLeft]];
    if (comb) comb.value = val;
    return val;
  }

  let invSum = false;
  switch (cType) {
    case ComponentType.Resistor:
      invSum = topo.parallel;
      break;
    case ComponentType.Capacitor:
      invSum = !topo.parallel;
      break;
  }

  let ret = 0;
  let lastVal = Number.POSITIVE_INFINITY;
  for (const childTopo of topo.children) {
    const childComb = comb ? new Combination() : null;
    const childVal = calcValue(cType, values, indices, childTopo, childComb);
    if (isNaN(childVal) || childVal > lastVal) {
      // This combination is invalid because the values are not sorted.
      return NaN;
    }
    lastVal = childVal;
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

function calcComplexity(node: TopologyNode): number {
  if (node.isLeaf) {
    return 1;
  }
  let ret = 0;
  for (const child of node.children) {
    ret += calcComplexity(child);
  }
  return ret;
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
  if (memo.has(key)) {
    return memo.get(key)!;
  }

  const ret = new Array<TopologyNode>();

  if (iLeft + 1 >= iRight) {
    ret.push(new TopologyNode(iLeft, iRight, parallel, []));
    memo.set(key, ret);
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

  memo.set(key, ret);
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