import {evalExpr} from './Calc';
import * as RcComb from './RcComb';
import {getStr} from './Text';

export class ValueRangeSelector {
  seriesSelect = makeSeriesSelector();
  customValuesInput = document.createElement('textarea') as HTMLTextAreaElement;
  minResisterInput = new ValueBox();
  maxResisterInput = new ValueBox();

  constructor(public cType: RcComb.ComponentType) {
    if (cType === RcComb.ComponentType.Resistor) {
      this.customValuesInput.value = '100, 1k, 10k';
      this.customValuesInput.placeholder = 'e.g.\n100, 1k, 10k';
    } else {
      this.customValuesInput.value = '1n, 10n, 100n';
      this.customValuesInput.placeholder = 'e.g.\n1n, 10n, 100n';
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
        const val = evalExpr(str);
        if (!isNaN(val) && !values.includes(val)) {
          values.push(val);
        }
      }
      return values;
    } else {
      const defaultMin = Math.max(1e-12, targetValue / 100);
      const defaultMax = Math.min(1e15, targetValue * 100);
      this.minResisterInput.inputBox.placeholder =
          `(${RcComb.formatValue(defaultMin, '', true)})`;
      this.maxResisterInput.inputBox.placeholder =
          `(${RcComb.formatValue(defaultMax, '', true)})`;
      const minValue = this.minResisterInput.value;
      const maxValue = this.maxResisterInput.value;
      return RcComb.makeAvaiableValues(series, minValue, maxValue);
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
    return evalExpr(text);
  }

  setOnChange(callback: () => void) {
    this.onChangeCallback = callback;
    this.inputBox.addEventListener('input', () => this.onChange());
    this.inputBox.addEventListener('change', () => this.onChange());
  }

  onChange() {
    try {
      this.inputBox.title = RcComb.formatValue(this.value);
    } catch (e) {
      this.inputBox.title = (e as Error).message;
    }
    this.onChangeCallback();
  }
}

export function makeBr(): HTMLBRElement {
  return document.createElement('br');
}

export function makeH2(label: string): HTMLHeadingElement {
  const elm = document.createElement('h2');
  elm.textContent = label;
  return elm;
}

export function makeDiv(
    children: string|Node|Array<string|Node>|null,
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

export function makeParagraph(
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
  for (const key of Object.keys(RcComb.SERIESES)) {
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
