import * as RcComb from './RcComb';

export class ResistorRangeSelector {
  seriesSelect = makeSeriesSelector();
  minResisterInput = new ResistorInput('最小値', '1k');
  maxResisterInput = new ResistorInput('最大値', '1M');
  container = makeSpan([
    makeLabel('シリーズ', this.seriesSelect),
    makeBr(),
    this.minResisterInput.container,
    makeBr(),
    this.maxResisterInput.container,
  ]);

  get availableValues() {
    const series = this.seriesSelect.value;
    const minValue = this.minResisterInput.value;
    const maxValue = this.maxResisterInput.value;
    return RcComb.makeAvaiableValues(series, minValue, maxValue);
  }

  onChange(callback: () => void) {
    this.seriesSelect.addEventListener('change', () => callback());
    this.minResisterInput.onChange(callback);
    this.maxResisterInput.onChange(callback);
  }
}

export class ResistorInput {
  RE_VALUE = /^(\d+(\.\d+)?)([kKmM]?)$/;

  inputBox = makeTextBox();
  container = makeSpan();

  constructor(label: string, value: string|null = null) {
    this.container.appendChild(makeLabel(label, this.inputBox, 'Ω'));
    if (value) {
      this.inputBox.value = value;
    }
  }

  get value() {
    let text = this.inputBox.value.trim();
    if (text === '') {
      text = this.inputBox.placeholder.trim();
    }
    const match = this.RE_VALUE.exec(text);
    if (!match) {
      throw new Error(`Invalid resistor value: ${text}`);
    }
    let value = parseFloat(match[1]);
    const unit = match[3];
    switch (unit) {
      case 'n':
        value *= 1e-9;
        break;
      case 'u':
        value *= 1e-6;
        break;
      case 'm':
        value *= 1e-3;
        break;
      case 'k':
      case 'K':
        value *= 1e3;
        break;
      case 'M':
        value *= 1e6;
        break;
      case 'G':
        value *= 1e9;
        break;
      case 'T':
        value *= 1e12;
        break;
    }
    return value;
  }

  onChange(callback: () => void) {
    this.inputBox.addEventListener('input', () => callback());
    this.inputBox.addEventListener('change', () => callback());
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
  elm.style.width = '50px';
  return elm;
}

export function makeSeriesSelector() {
  let items: Array<{value: string, label: string, tip?: string}> = [];
  for (const key of Object.keys(RcComb.SERIESES)) {
    items.push({value: key, label: key});
  }
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
  select.style.width = '50px';
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
