import * as Calc from './Calc';
import * as Series from './Series';
import * as RcmbJS from '../../../lib/ts/src/RcmbJS';
import {getStr} from './Text';

export class ValueRangeSelector {
  seriesSelect = makeSeriesSelector();
  customValuesInput = document.createElement('textarea') as HTMLTextAreaElement;
  minResisterInput = new ValueBox();
  maxResisterInput = new ValueBox();

  constructor(public capacitor: boolean) {
    if (capacitor) {
      this.customValuesInput.value = '1n, 10n, 100n';
      this.customValuesInput.placeholder = 'e.g.\n1n, 10n, 100n';
      this.minResisterInput.inputBox.value = '100p';
      this.maxResisterInput.inputBox.value = '100u';
    } else {
      this.customValuesInput.value = '100, 1k, 10k';
      this.customValuesInput.placeholder = 'e.g.\n100, 1k, 10k';
      this.minResisterInput.inputBox.value = '100';
      this.maxResisterInput.inputBox.value = '1M';
    }
    this.customValuesInput.disabled = true;
  }

  getAvailableValues(targetValue: number) {
    const series = this.seriesSelect.value;
    if (series === 'custom') {
      const valueStrs = this.customValuesInput.value.split(',');
      const values: number[] = [];
      for (let str of valueStrs) {
        str = str.trim();
        if (str === '') continue;
        const val = Calc.evalExpr(str);
        if (!isNaN(val) && !values.includes(val)) {
          values.push(val);
        }
      }
      return values;
    } else {
      const defaultMin = Math.max(1e-12, targetValue / 100);
      const defaultMax = Math.min(1e15, targetValue * 100);
      this.minResisterInput.inputBox.placeholder =
          `(${formatValue(defaultMin, '', true)})`;
      this.maxResisterInput.inputBox.placeholder =
          `(${formatValue(defaultMax, '', true)})`;
      const minValue = this.minResisterInput.value;
      const maxValue = this.maxResisterInput.value;
      return Series.makeAvaiableValues(series, minValue, maxValue);
    }
  }

  setOnChange(callback: () => void) {
    this.seriesSelect.addEventListener('change', () => {
      const custom = this.seriesSelect.value === 'custom';
      this.customValuesInput.disabled = !custom;
      this.minResisterInput.inputBox.disabled = custom;
      this.maxResisterInput.inputBox.disabled = custom;
      callback();
    });
    this.customValuesInput.addEventListener('input', () => callback());
    this.customValuesInput.addEventListener('change', () => callback());
    this.minResisterInput.setOnChange(callback);
    this.maxResisterInput.setOnChange(callback);
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
  }

  get value() {
    let text = this.inputBox.value.trim();
    if (text !== '') {
      return Math.floor(Calc.evalExpr(text));
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
  inputBox = makeTextBox();
  onChangeCallback: () => void = () => {};

  constructor(value: string|null = null) {
    if (value) {
      this.inputBox.value = value;
      this.onChange();
    }
  }

  get value() {
    let text = this.inputBox.value.trim();
    if (text === '') {
      text = this.inputBox.placeholder.trim();
    }
    return Calc.evalExpr(text);
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

export function makeNumElementInput(max: number, defaultValue: number): IntegerBox {
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
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: noLimit, label: getStr('No Limit') },
  ];
  return makeSelectBox(items, noLimit);
}

export function makeBr(): HTMLBRElement {
  return document.createElement('br');
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
    children: string|Node|Array<string|Node>|null,
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

export function makeSeriesSelector() {
  let items: Array<{value: string, label: string, tip?: string}> = [];
  for (const key of Object.keys(Series.Series)) {
    items.push({value: key, label: key});
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

export function makeButton(label: string): HTMLButtonElement {
  const elm = document.createElement('button');
  elm.textContent = label;
  return elm;
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

  value = Math.round(value * Calc.pow10(minDigits));
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
