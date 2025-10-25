import * as Svg from './Svg';
import {getStr} from './Text';

export const SERIESES: Record<string, number[]> = {
  'E1': [100],
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
  private complexity_: number = -1;
  public hash: number = -1;

  constructor(
      public iLeft: number, public iRight: number, public parallel: boolean,
      public children: Array<TopologyNode>) {
    if (children.length === 0) {
      this.hash = 1;
    } else {
      const POLY = 0x80200003;
      let lfsr = parallel ? 0xAAAAAAAA : 0x55555555;
      for (const child of children) {
        lfsr ^= child.hash;
        const msb = (lfsr & 0x80000000) !== 0;
        lfsr = (lfsr & 0x7FFFFFFF) << 1;
        if (msb) lfsr ^= POLY;
      }
      this.hash = lfsr;
    }
  }

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

const FIGURE_SCALE = 10;


export class Combination {
  cType = ComponentType.Resistor;
  parallel = false;
  children: Combination[] = [];
  value = 0;
  complexity = -1;

  x = 0;
  y = 0;
  width = 0;
  height = 0;

  constructor() {}

  get isLeaf(): boolean {
    return this.children.length === 0;
  }

  get unit(): string {
    switch (this.cType) {
      case ComponentType.Resistor:
        return 'Ω';
      case ComponentType.Capacitor:
        return 'F';
      default:
        return '';
    }
  }

  layout(): void {
    let maxChildWidth = 0;
    let maxChildHeight = 0;
    for (const child of this.children) {
      child.layout();
      maxChildWidth = Math.max(maxChildWidth, child.width);
      maxChildHeight = Math.max(maxChildHeight, child.height);
    }

    if (this.isLeaf) {
      this.width = FIGURE_SCALE * 2;
      this.height = FIGURE_SCALE * 2;
    } else if (this.parallel) {
      let y = 0;
      this.width = maxChildWidth + FIGURE_SCALE * 2;
      for (const child of this.children) {
        child.x = (this.width - child.width) / 2;
        child.y = y;
        y += child.height + FIGURE_SCALE;
      }
      this.height = y - FIGURE_SCALE;
    } else {
      let x = 0;
      this.height = maxChildHeight + FIGURE_SCALE * 2;
      for (const child of this.children) {
        child.x = x;
        child.y = (this.height - child.height) / 2;
        x += child.width + FIGURE_SCALE * 1.5;
      }
      this.width = x - FIGURE_SCALE * 1.5;
    }
  }

  paint(svg: Svg.SvgCanvas): void {
    svg.pushState();
    svg.offsetState(this.x, this.y);
    if (this.isLeaf) {
      if (this.cType === ComponentType.Resistor) {
        const h = this.height / 3;
        const y = (this.height - h) / 2;
        svg.setBackColor('white');
        svg.drawFillRect(0, y, this.width, h);
        svg.setFontSize(9);
        svg.drawText(
            this.width / 2, y - FIGURE_SCALE / 4,
            formatValue(this.value, this.unit));
      } else {
        const w = this.width / 3;
        const h = this.height * 2 / 3;
        const x0 = this.width / 2 - w / 2;
        const x1 = this.width / 2 + w / 2;
        const y = (this.height - h) / 2;
        svg.setForeColor('transparent');
        svg.drawFillRect(x0, y, w, h);
        svg.setForeColor('black');
        svg.drawLine(x0, y, x0, y + h);
        svg.drawLine(x1, y, x1, y + h);
        svg.setFontSize(9);
        svg.drawText(
            this.width / 2, y - FIGURE_SCALE / 3,
            formatValue(this.value, this.unit));
      }
    } else if (this.parallel) {
      svg.setForeColor('transparent');
      svg.drawFillRect(0, 0, this.width, this.height);
      svg.setForeColor('black');
      let y0 = -1;
      let y1 = this.height;
      for (const child of this.children) {
        const y = child.y + child.height / 2;
        svg.drawLine(0, y, this.width, y);
        if (y0 < 0) y0 = y;
        y1 = y;
      }
      svg.drawLine(0, y0, 0, y1);
      svg.drawLine(this.width, y0, this.width, y1);
    }
    for (const child of this.children) {
      child.paint(svg);
    }
    svg.popState();
  }

  generateSvg(target: number): HTMLImageElement {
    const canvas = new Svg.SvgCanvas();
    this.layout();
    {
      const x0 = this.x - 20;
      const x1 = x0 + this.width + 40;
      const y = this.y + this.height / 2;
      canvas.drawLine(x0, y, x1, y);
    }
    this.paint(canvas);
    {
      const x = this.x + this.width / 2;
      const y = this.y + this.height + 12;
      canvas.setFontSize(12);
      canvas.drawText(x, y, formatValue(this.value, this.unit));

      canvas.setFontSize(9);
      const error = (this.value - target) / target;
      let errorText = `(${getStr('No Error')})`;
      if (Math.abs(error) > 1e-6) {
        errorText = `(${getStr('Error')}: ${error > 0 ? '+' : ''}${
            (error * 100).toFixed(3)}%)`;
      }
      canvas.drawText(x, y + 15, errorText);
    }
    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(canvas.build());
    img.src = 'data:image/svg+xml;base64,' + bytesToBase64(svgData);
    img.style.backgroundColor = 'white';
    img.style.border = '1px solid black';
    img.style.width = '300px';
    img.style.height = '300px';
    return img;
  }

  toString(indent: string = ''): string {
    if (this.isLeaf) {
      return `${indent}${formatValue(this.value, this.unit)}\n`;
    } else {
      let ret = '';
      for (const child of this.children) {
        ret += child.toString(indent + '    ');
      }
      ret = `${indent}${getStr(this.parallel ? 'Parallel' : 'Series')} ` +
          `(${formatValue(this.value, this.unit)}):\n${ret}`;
      return ret;
    }
  }

  static fromJson(cType: ComponentType, obj: any): Combination {
    const comb = new Combination();
    comb.cType = cType;
    if (typeof obj === 'number') {
      comb.parallel = false;
      comb.value = obj;
    } else {
      comb.parallel = !!obj.parallel;
      comb.value = obj.value!;
      if (obj.children) {
        for (const childObj of obj.children) {
          const childComb = Combination.fromJson(cType, childObj);
          comb.children.push(childComb);
        }
      }
    }
    return comb;
  }

  toJson(): any {
    if (this.isLeaf) {
      return this.value;
    } else {
      return {
        parallel: this.parallel,
        children: this.children.map(child => child.toJson()),
      };
    }
  }
}

export class DividerCombination {
  x = 0;
  y = 0;
  width = 0;
  height = 0;

  constructor(
      public upper: Combination[], public lower: Combination[],
      public ratio: number) {}

  toString(): string {
    const up = this.upper[0];
    const lo = this.lower[0];
    let ret = `R2 / (R1 + R2) = ${this.ratio.toFixed(6)}\n` +
        `R1 + R2 = ${formatValue(up.value + lo.value, 'Ω')}\n`;
    ret += 'R1:\n';
    ret += up.toString('    ');
    ret += 'R2:\n';
    ret += lo.toString('    ');
    return ret;
  }

  layout(): void {
    const upper = this.upper[0];
    const lower = this.lower[0];
    upper.layout();
    lower.layout();
    const padding = FIGURE_SCALE * 4;
    this.width = upper.width + lower.width + padding;
    this.height = Math.max(upper.height, lower.height);
    lower.x += upper.width + padding;
    upper.y += (this.height - upper.height) / 2;
    lower.y += (this.height - lower.height) / 2;
  }

  generateSvg(target: number): HTMLImageElement {
    const upper = this.upper[0];
    const lower = this.lower[0];
    const canvas = new Svg.SvgCanvas();
    this.layout();
    {
      const x0 = this.x - 20;
      const x1 = x0 + this.width + 40;
      const y = this.y + this.height / 2;
      canvas.drawLine(x0, y, x1, y);
    }
    upper.paint(canvas);
    {
      const x = upper.x + upper.width / 2;
      const y = this.y + this.height + 9;
      canvas.setFontSize(9);
      canvas.drawText(x, y, 'R1 = ' + formatValue(upper.value, upper.unit));
    }
    lower.paint(canvas);
    {
      const x = lower.x + lower.width / 2;
      const y = this.y + this.height + 9;
      canvas.setFontSize(9);
      canvas.drawText(x, y, 'R2 = ' + formatValue(lower.value, lower.unit));
    }
    {
      const x = this.x + this.width / 2;
      const y = this.y + this.height + 32;
      canvas.setFontSize(12);
      canvas.drawText(x, y, 'R2 / (R1 + R2) = ' + formatValue(this.ratio, ''));

      canvas.setFontSize(9);
      const error = (this.ratio - target) / target;
      let errorText = `(${getStr('No Error')})`;
      if (Math.abs(error) > 1e-6) {
        errorText = `(${getStr('Error')}: ${error > 0 ? '+' : ''}${
            (error * 100).toFixed(3)}%)`;
      }
      canvas.drawText(x, y + 15, errorText);
    }

    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(canvas.build());
    img.src = 'data:image/svg+xml;base64,' + bytesToBase64(svgData);
    img.style.backgroundColor = 'white';
    img.style.border = '1px solid black';
    img.style.width = '400px';
    img.style.height = '200px';
    return img;
  }

  static fromJson(cType: ComponentType, obj: any): DividerCombination {
    const ratio = obj.ratio!;
    let uppers: Combination[] = [];
    let lowers: Combination[] = [];
    for (const childObj of obj.uppers!) {
      uppers.push(Combination.fromJson(cType, childObj));
    }
    for (const childObj of obj.lowers!) {
      lowers.push(Combination.fromJson(cType, childObj));
    }
    return new DividerCombination(uppers, lowers, ratio);
  }
}

export function findCombinations(
    cType: ComponentType, values: number[], targetValue: number,
    maxElements: number): Combination[] {
  const epsilon = targetValue * 1e-9;
  const retMin = targetValue / 2;
  const retMax = targetValue * 2;

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
        const value =
            calcValue(cType, values, indices, topo, null, retMin, retMax);
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
        calcValue(cType, values, indices, topo, comb);
        bestCombinations.push(comb);
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
  const epsilon = 1e-9;

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
        const lowerValue =
            calcValue(cType, values, indices, topo, null, 0, totalMax);
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
        if (error - epsilon > bestError) {
          continue;
        }

        if (error + epsilon < bestError) {
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
    topo: TopologyNode, comb: Combination|null = null, min = 0,
    max = Number.POSITIVE_INFINITY): number {
  if (comb) {
    comb.cType = cType;
    comb.parallel = topo.parallel;
    comb.complexity = topo.complexity;
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
  if (cType === ComponentType.Resistor) {
    invSum = topo.parallel;
  } else {
    invSum = !topo.parallel;
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
        cType, values, indices, childTopo, childComb, childMin, childMax);

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

export function makeAvaiableValues(
    series: string, minValue: number = 1e-12,
    maxValue: number = 1e12): number[] {
  const baseValues = SERIESES[series];
  if (!baseValues) {
    throw new Error(`Unknown series: ${series}`);
  }
  const values = [];
  for (let exp = -11; exp <= 15; exp++) {
    const multiplier = pow10(exp - 3);
    for (const base of baseValues) {
      const value = base * multiplier;
      const epsilon = value / 1e6;
      if ((minValue - epsilon) < value && value < (maxValue + epsilon)) {
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

function bytesToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  const binString = Array
                        .from(
                            bytes,
                            (byte) => String.fromCodePoint(byte),
                            )
                        .join('');
  return btoa(binString);
}
