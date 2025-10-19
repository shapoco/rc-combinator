class State {
  x = 0;
  y = 0;
  backColor = 'white';
  foreColor = 'black';
  textColor = 'black';
  fontSize = 12;

  clone(): State {
    const state = new State();
    state.x = this.x;
    state.y = this.y;
    state.backColor = this.backColor;
    state.foreColor = this.foreColor;
    state.textColor = this.textColor;
    state.fontSize = this.fontSize;
    return state;
  }
}

export class SvgCanvas {
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  xMin = 0;
  yMin = 0;
  xMax = 1;
  yMax = 1;

  stack: State[] = [new State()];

  constructor() {
    // this.svg.setAttribute('id', 'wipe');
    this.svg.setAttribute('viewBox', '0 0 100 100');
    // this.svg.setAttribute('preserveAspectRatio', 'none');
  }

  get state(): State {
    return this.stack[this.stack.length - 1];
  }

  pushState() {
    this.stack.push(this.state.clone());
  }

  popState() {
    if (this.stack.length > 1) {
      this.stack.pop();
    } else {
      throw new Error('State stack underflow');
    }
  }

  offsetState(dx: number, dy: number) {
    this.state.x += dx;
    this.state.y += dy;
  }

  setBackColor(color: string = 'transparent') {
    this.state.backColor = color;
  }

  setForeColor(color: string = 'black') {
    this.state.foreColor = color;
  }

  setTextColor(color: string = 'black') {
    this.state.textColor = color;
  }

  setFontSize(size: number) {
    this.state.fontSize = size;
  }

  drawFillRect(x: number, y: number, w: number, h: number) {
    // console.log(`drawFillRect(${x}, ${y}, ${w}, ${h})`);
    x += this.state.x;
    y += this.state.y;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x.toString());
    rect.setAttribute('y', y.toString());
    rect.setAttribute('width', w.toString());
    rect.setAttribute('height', h.toString());
    if (this.state.backColor !== 'transparent') {
      rect.setAttribute('fill', this.state.backColor);
    }
    if (this.state.foreColor !== 'transparent') {
      rect.setAttribute('stroke', this.state.foreColor);
    }
    this.svg.appendChild(rect);
    this.xMin = Math.min(this.xMin, x);
    this.yMin = Math.min(this.yMin, y);
    this.xMax = Math.max(this.xMax, x + w);
    this.yMax = Math.max(this.yMax, y + h);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number) {
    // console.log(`drawLine(${x1}, ${y1}, ${x2}, ${y2})`);
    x1 += this.state.x;
    y1 += this.state.y;
    x2 += this.state.x;
    y2 += this.state.y;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', y1.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', y2.toString());
    line.setAttribute('stroke', this.state.foreColor);
    this.svg.appendChild(line);
    this.xMin = Math.min(this.xMin, x1);
    this.yMin = Math.min(this.yMin, y1);
    this.xMax = Math.max(this.xMax, x2);
    this.yMax = Math.max(this.yMax, y2);
  }

  drawText(x: number, y: number, text: string) {
    // console.log(`drawText(${x}, ${y}, ${text}, ${this.state.fontSize})`);
    x += this.state.x;
    y += this.state.y;
    const textElem =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textElem.setAttribute('x', x.toString());
    textElem.setAttribute('y', y.toString());
    textElem.setAttribute('fill', this.state.textColor);
    textElem.setAttribute('font-size', this.state.fontSize.toString());
    textElem.setAttribute('font-family', 'Arial, sans-serif');
    // textElem.setAttribute('dominant-baseline', 'hanging');
    textElem.setAttribute('text-anchor', 'middle');
    textElem.textContent = text;
    this.svg.appendChild(textElem);
    const w = text.length * (this.state.fontSize * 0.6);
    this.xMin = Math.min(this.xMin, x - w / 2);
    this.yMin = Math.min(this.yMin, y - this.state.fontSize);
    this.xMax = Math.max(this.xMax, x + w / 2);
    this.yMax = Math.max(this.yMax, y);
  }

  build(): SVGSVGElement {
    const x = this.xMin - 10;
    const y = this.yMin - 10;
    const w = this.xMax - this.xMin + 20;
    const h = this.yMax - this.yMin + 20;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    return this.svg;
  }
}