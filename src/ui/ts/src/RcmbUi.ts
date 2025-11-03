import * as RcmbJS from '../../../lib/ts/src/RcmbJS';

import * as Expr from './Expr';
import * as Series from './Series';
import {getStr} from './Text';

const PREFIXES = [
  {exp: -12, prefix: 'p', max: false},
  {exp: -9, prefix: 'n', max: false},
  {exp: -6, prefix: 'μ', max: false},
  {exp: -3, prefix: 'm', max: false},
  {exp: 0, prefix: '', max: false},
  {exp: 3, prefix: 'k', max: false},
  {exp: 6, prefix: 'M', max: false},
  {exp: 9, prefix: 'G', max: false},
  {exp: 12, prefix: 'T', max: true},
];

export class ValueRangeSelector {
  seriesSelect = makeSeriesSelector();
  customValuesBox = document.createElement('textarea') as HTMLTextAreaElement;
  elementRangeBox = new RangeBox();
  toleranceUi = new RangeBox(true);

  constructor(public capacitor: boolean) {
    if (capacitor) {
      this.customValuesBox.value = '1n, 10n, 100n';
      this.customValuesBox.placeholder = 'e.g.\n1n, 10n, 100n';
      this.elementRangeBox.setDefaultValue('100p', '100u', true);
      this.toleranceUi.setDefaultValue(-10, 10);
    } else {
      this.customValuesBox.value = '100, 1k, 10k';
      this.customValuesBox.placeholder = 'e.g.\n100, 1k, 10k';
      this.elementRangeBox.setDefaultValue('100', '1M', true);
      this.toleranceUi.setDefaultValue(-1, 1);
    }
  }

  getAvailableValues(targetValue: number) {
    const series = this.seriesSelect.value;
    if (series === 'custom') {
      const valueStrs = this.customValuesBox.value.split(',');
      const values: number[] = [];
      for (let str of valueStrs) {
        str = str.trim();
        if (str === '') continue;
        const val = Expr.evalExpr(str);
        if (!isNaN(val) && !values.includes(val)) {
          values.push(val);
        }
      }
      return values;
    } else {
      const defaultMin = Math.max(1e-12, targetValue / 100);
      const defaultMax = Math.min(1e15, targetValue * 100);
      this.elementRangeBox.setDefaultValue(
          `(${formatValue(defaultMin, '', true)})`,
          `(${formatValue(defaultMax, '', true)})`);
      const minValue = this.elementRangeBox.minValue;
      const maxValue = this.elementRangeBox.maxValue;
      return Series.makeAvaiableValues(series, minValue, maxValue);
    }
  }

  setOnChange(callback: () => void) {
    this.seriesSelect.addEventListener('change', () => {
      // const custom = this.seriesSelect.value === 'custom';
      // this.customValuesInput.disabled = !custom;
      // this.minResisterInput.inputBox.disabled = custom;
      // this.maxResisterInput.inputBox.disabled = custom;
      callback();
    });
    this.customValuesBox.addEventListener('input', () => callback());
    this.customValuesBox.addEventListener('change', () => callback());
    this.elementRangeBox.addEventListener(() => callback());
    this.toleranceUi.addEventListener(callback);
  }
}

export class RangeBox {
  minBox = new ValueBox();
  hyphen = makeSpan('-');
  maxBox = new ValueBox();
  ui = makeSpan([
    this.minBox.inputBox,
    this.hyphen,
    this.maxBox.inputBox,
  ]);

  callbacks: (() => void)[] = [];

  constructor(
      public symmetric: boolean = false, public defaultMin: number|string = 0,
      public defaultMax: number|string = 100) {
    this.updatePlaceholders();
    this.minBox.inputBox.style.width = '55px';
    this.maxBox.inputBox.style.width = '55px';
    this.hyphen.style.display = 'inline-block';
    this.hyphen.style.width = '15px';
    this.hyphen.style.textAlign = 'center';
    this.ui.style.whiteSpace = 'nowrap';
  }

  setDefaultValue(
      min: number|string, max: number|string, setAsValue: boolean = false) {
    this.defaultMin = min;
    this.defaultMax = max;
    if (setAsValue) {
      this.minBox.inputBox.value = min.toString();
      this.maxBox.inputBox.value = max.toString();
    }
    this.updatePlaceholders();
  }

  addEventListener(callback: () => void) {
    this.callbacks.push(callback);
    this.maxBox.setOnChange(() => this.onChange());
    this.minBox.setOnChange(() => this.onChange());
  }

  onChange() {
    this.updatePlaceholders();
    this.callbacks.forEach(cb => cb());
  }

  updatePlaceholders() {
    if (this.maxBox.empty && this.minBox.empty) {
      this.maxBox.placeholder = this.defaultMax.toString();
      this.minBox.placeholder = this.defaultMin.toString();
    } else if (this.maxBox.empty) {
      this.maxBox.placeholder = this.symmetric ?
          (-this.minBox.value).toString() :
          this.defaultMax.toString();
    } else if (this.minBox.empty) {
      this.minBox.placeholder = this.symmetric ?
          (-this.maxBox.value).toString() :
          this.defaultMin.toString();
    }
  }

  get minValue(): number {
    this.updatePlaceholders();
    return this.minBox.value;
  }

  get maxValue(): number {
    this.updatePlaceholders();
    return this.maxBox.value;
  }
}

export class IntegerBox {
  inputBox = document.createElement('input');
  onChangeCallback: () => void = () => {};

  constructor(
      value: number|null = null, min: number = 0, max: number = 9999,
      public defaultValue: number = 0, placeholder: string = '') {
    this.inputBox.type = 'number';
    this.inputBox.min = min.toString();
    this.inputBox.max = max.toString();
    this.inputBox.placeholder = placeholder;
    if (value !== null) {
      this.inputBox.value = value.toString();
    }
    this.inputBox.addEventListener('focus', () => {
      this.inputBox.select();
    });
  }

  get value() {
    let text = this.inputBox.value.trim();
    if (text !== '') {
      return Math.floor(Expr.evalExpr(text));
    } else {
      return this.defaultValue;
    }
  }

  setOnChange(callback: () => void) {
    this.onChangeCallback = callback;
    this.inputBox.addEventListener('input', () => this.onChange());
    this.inputBox.addEventListener('change', () => this.onChange());
  }

  onChange() {
    try {
      this.inputBox.title = formatValue(this.value);
    } catch (e) {
      this.inputBox.title = (e as Error).message;
    }
    this.onChangeCallback();
  }
}

export class ValueBox {
  inputBox = document.createElement('input');
  onChangeCallback: () => void = () => {};

  constructor(value: string|null = null, placeholder: string = '') {
    // PC では IME をオフにするため 'tel' にする
    this.inputBox.type = isMobile ? 'text' : 'tel';
    if (value) {
      this.inputBox.value = value;
      this.onChange();
    }
    this.inputBox.placeholder = placeholder;
    this.inputBox.addEventListener('focus', () => {
      this.inputBox.select();
    });
  }

  get empty(): boolean {
    return this.inputBox.value.trim() === '';
  }

  get value() {
    let text = this.inputBox.value.trim();
    if (text === '') {
      text = this.inputBox.placeholder.trim();
    }
    return Expr.evalExpr(text);
  }

  get placeholder(): string {
    return this.inputBox.placeholder;
  }
  set placeholder(v: string) {
    const old = this.inputBox.placeholder;
    this.inputBox.placeholder = v;
    if (this.empty && old !== v) {
      this.onChange();
    }
  }

  setOnChange(callback: () => void) {
    this.onChangeCallback = callback;
    this.inputBox.addEventListener('input', () => this.onChange());
    this.inputBox.addEventListener('change', () => this.onChange());
  }

  onChange() {
    try {
      this.inputBox.title = formatValue(this.value);
    } catch (e) {
      this.inputBox.title = (e as Error).message;
    }
    this.onChangeCallback();
  }

  focus() {
    this.inputBox.focus();
  }
}

export const isMobile = (() => {
  return !!navigator.userAgent.match(/iPhone|Android.+Mobile/);
})();

export function makeNumElementInput(
    max: number, defaultValue: number): IntegerBox {
  return new IntegerBox(defaultValue, 1, max, max, `(${getStr('No Limit')})`);
}

export function makeTopologySelector(): HTMLSelectElement {
  const items = [
    {
      value: RcmbJS.TopologyConstraint.Series.toString(),
      label: getStr('Series'),
    },
    {
      value: RcmbJS.TopologyConstraint.Parallel.toString(),
      label: getStr('Parallel'),
    },
    {
      value: RcmbJS.TopologyConstraint.NoLimit.toString(),
      label: getStr('No Limit'),
    },
  ];
  return makeSelectBox(items, RcmbJS.TopologyConstraint.NoLimit.toString());
}

export function makeDepthSelector(): HTMLSelectElement {
  const noLimit = '999';
  const items = [
    {value: '1', label: '1'},
    {value: '2', label: '2'},
    {value: '3', label: '3'},
    {value: noLimit, label: getStr('No Limit')},
  ];
  return makeSelectBox(items, noLimit);
}

export function makeBr(): HTMLBRElement {
  return document.createElement('br');
}

export function makeH1(label: string = ''): HTMLHeadingElement {
  const elm = document.createElement('h1');
  elm.textContent = label;
  return elm;
}

export function makeH2(label: string = ''): HTMLHeadingElement {
  const elm = document.createElement('h2');
  elm.textContent = label;
  return elm;
}

export function makeDiv(
    children: string|Node|Array<string|Node>|null = [],
    className: string|null = null, center: boolean = false): HTMLDivElement {
  const elm = document.createElement('div');
  toElementArray(children).forEach(child => elm.appendChild(child));
  if (className) {
    elm.classList.add(className);
  }
  if (center) {
    elm.style.textAlign = 'center';
  }
  return elm;
}

export function makeP(
    children: string|Node|Array<string|Node>|null = [],
    className: string|null = null,
    center: boolean = false): HTMLParagraphElement {
  const elm = document.createElement('p');
  toElementArray(children).forEach(child => elm.appendChild(child));
  if (className) {
    elm.classList.add(className);
  }
  if (center) {
    elm.style.textAlign = 'center';
  }
  return elm;
}

export function makeTable(rows: Array<Array<string|Node|Array<string|Node>>>):
    HTMLTableElement {
  let head = true;
  const table = document.createElement('table');
  for (const rowData of rows) {
    const row = document.createElement('tr');
    for (const cellData of rowData) {
      const cell = document.createElement(head ? 'th' : 'td');
      toElementArray(cellData).forEach(child => cell.appendChild(child));
      row.appendChild(cell);
    }
    head = false;
    table.appendChild(row);
  }
  return table;
}

export function makeSpan(
    children: string|Node|Array<string|Node>|null = null,
    className: string|null = null): HTMLSpanElement {
  const elm = document.createElement('span');
  toElementArray(children).forEach(child => elm.appendChild(child));
  if (className) {
    elm.classList.add(className);
  }
  return elm;
}

export function strong(children: string|Node|Array<string|Node>|null = null):
    HTMLElement {
  const elm = document.createElement('strong');
  toElementArray(children).forEach(child => elm.appendChild(child));
  return elm;
}

export function makeLabel(
    label: string, input: HTMLElement, unit: string|null = null) {
  const elm = document.createElement('label');
  elm.appendChild(document.createTextNode(label + ': '));
  elm.appendChild(input);
  if (unit) {
    elm.appendChild(document.createTextNode(' ' + unit));
  }
  return elm;
}

export function makeTextBox(value: string|null = null): HTMLInputElement {
  const elm = document.createElement('input');
  elm.type = 'text';
  if (value) {
    elm.value = value;
  }
  return elm;
}

export function makeCheckbox(
    labelStr: string, value: boolean = false): HTMLInputElement {
  const label = document.createElement('label');
  const elm = document.createElement('input');
  elm.type = 'checkbox';
  elm.checked = value;
  label.appendChild(elm);
  label.appendChild(document.createTextNode(' ' + labelStr));
  return elm;
}

export function makeSeriesSelector() {
  let items: Array<{value: string, label: string, tip?: string}> = [];
  for (const key of Object.keys(Series.Serieses)) {
    items.push({
      value: key,
      label: key.replace('+', ' + '),
    });
  }
  items.push({value: 'custom', label: getStr('Custom')});
  return makeSelectBox(items, 'E3');
}

export function makeSelectBox(
    items: Array<{value: string, label: string, tip?: string}>,
    defaultValue: string): HTMLSelectElement {
  const select = document.createElement('select');
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    if (item.tip) {
      option.title = item.tip;
    }
    select.appendChild(option);
  }
  select.value = defaultValue.toString();
  return select;
}

export function makeButton(label: string = ''): HTMLButtonElement {
  const elm = document.createElement('button');
  elm.textContent = label;
  return elm;
}

export function makeIcon(
    emoji: string, spin: boolean = false): HTMLSpanElement {
  const icon = makeSpan(emoji, 'icon');
  if (spin) icon.classList.add('spin');
  return icon;
}

export function toElementArray(children: string|Node|Array<string|Node>|
                               null): Array<Node> {
  if (children == null) {
    return [];
  }
  if (!Array.isArray(children)) {
    children = [children];
  }
  for (let i = 0; i < children.length; i++) {
    if (typeof children[i] === 'string') {
      children[i] = document.createTextNode(children[i] as string);
    } else if (children[i] instanceof Node) {
      // Do nothing
    } else {
      throw new Error('Invalid child element');
    }
  }
  return children as Array<Node>;
}

export function parentTrOf(element: HTMLElement): HTMLTableRowElement|null {
  let parent: HTMLElement|null = element;
  while (parent) {
    if (parent.tagName === 'TR') {
      return parent as HTMLTableRowElement;
    }
    parent = parent.parentElement;
  }
  return null;
}

export function show(elem: HTMLElement): HTMLElement {
  elem.classList.remove('hidden');
  return elem;
}

export function hide(elem: HTMLElement): HTMLElement {
  elem.classList.add('hidden');
  return elem;
}

export function setVisible(elem: HTMLElement, visible: boolean): HTMLElement {
  return visible ? show(elem) : hide(elem);
}

export function formatError(value: number) {
  if (-1e-18 < value && value < 1e-18) {
    return '0%';
  } else {
    const sign = (value >= 0) ? '+' : '';
    return `${sign}${formatValue(value * 100, '', false, 2)}%`;
  }
}

export function formatValue(
    value: number, unit: string = '', usePrefix: boolean|null = null,
    digits: number = 6): string {
  if (!isFinite(value) || isNaN(value)) {
    return 'NaN';
  }

  const neg = value < 0;
  value = Math.abs(value);

  if (usePrefix === null) {
    usePrefix = unit !== '';
  }

  let exp = Math.floor(Math.log10(Math.abs(value)) + 1e-6);

  let prefix = '';
  if (usePrefix) {
    for (const p of PREFIXES) {
      if (exp < p.exp + 3 || p.max) {
        value /= Expr.pow10(p.exp);
        exp -= p.exp;
        prefix = p.prefix;
        break;
      }
    }
  }

  if (exp < -digits) {
    digits -= exp;
  }
  digits = Math.min(5, Math.max(0, digits));

  let s = neg ? '-' : '';
  s += value.toFixed(digits);
  s = s.replace(/0+$/, '');
  s = s.replace(/\.$/, '.0');

  return `${s} ${prefix}${unit}`.trim();
}
