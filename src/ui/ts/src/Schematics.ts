import {formatValue} from './RcmbUi';

export const SCALE = 1;
const ELEMENT_SIZE = 40 * SCALE;

const R_WIDTH = ELEMENT_SIZE;
const R_HEIGHT = Math.round(ELEMENT_SIZE * 0.4);

const C_WIDTH = Math.round(ELEMENT_SIZE * 0.3);
const C_HEIGHT = Math.round(ELEMENT_SIZE * 0.7);

const COLOR_CODE_TABLE = [
  '#000',
  '#864',
  '#c00',
  '#f80',
  '#cc0',
  '#080',
  '#04c',
  '#c4c',
  '#888',
  '#fff',
];

function drawResistor(
    ctx: CanvasRenderingContext2D, x: number, y: number, value: number) {
  ctx.save();
  ctx.translate(x, y);
  let colors: string[];
  if (value >= 1e-6) {
    const exp = Math.floor(Math.log10(value) + 1e-10) - 1;
    const frac = Math.round(value / Math.pow(10, exp));
    const digits1 = Math.floor(frac / 10) % 10;
    const digits2 = frac % 10;
    const digits3 = exp;
    colors = [
      COLOR_CODE_TABLE[digits1],
      COLOR_CODE_TABLE[digits2],
      COLOR_CODE_TABLE[digits3],
      '#870',
    ]
  } else {
    colors = [COLOR_CODE_TABLE[0]];
  }

  const bandWidth = R_WIDTH * 0.125;
  const bandGap = bandWidth / 2;
  const bandX0 =
      (R_WIDTH - (bandWidth * colors.length + bandGap * (colors.length - 1))) /
      2;

  y += (ELEMENT_SIZE - R_HEIGHT) / 2;
  for (let i = 0; i < colors.length; i++) {
    const x = bandX0 + i * (bandWidth + bandGap);
    ctx.fillStyle = colors[i];
    ctx.fillRect(x, y, bandWidth, R_HEIGHT);
  }
  ctx.lineWidth = 2 * SCALE;
  ctx.strokeRect(0, y, R_WIDTH, R_HEIGHT);

  ctx.font = `${16 * SCALE}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const text = formatValue(value, 'Ω', true);
  ctx.fillStyle = '#000';
  ctx.fillText(text, R_WIDTH / 2, y - 5 * SCALE);

  ctx.restore();
}

function drawCapacitor(
    ctx: CanvasRenderingContext2D, x: number, y: number, value: number) {
  ctx.save();
  ctx.translate(x, y);

  const x0 = (ELEMENT_SIZE - C_WIDTH) / 2;
  const x1 = x0 + C_WIDTH;
  const y0 = (ELEMENT_SIZE - C_HEIGHT) / 2;
  const y1 = y0 + C_HEIGHT;
  ctx.lineWidth = 4 * SCALE;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y1);
  ctx.moveTo(x1, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  const yCenter = ELEMENT_SIZE / 2;
  drawWire(ctx, 0, yCenter, x0, yCenter);
  drawWire(ctx, x1, yCenter, ELEMENT_SIZE, yCenter);

  ctx.font = `${16 * SCALE}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const text = formatValue(value, 'F', true);
  ctx.fillStyle = '#000';
  ctx.fillText(text, R_WIDTH / 2, y0 - 5 * SCALE);

  ctx.restore();
}

export function drawWire(
    ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number,
    y1: number) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 2 * SCALE;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

export class TreeNode {
  x = 0;
  y = 0;
  width = 0;
  height = 0;

  constructor(
      public capacitor: boolean, public parallel: boolean,
      public children: TreeNode[], public value: number = -1) {
    if (this.isLeaf) {
      // 抵抗素子
      this.width = ELEMENT_SIZE;
      this.height = ELEMENT_SIZE;
    } else if (this.parallel) {
      // 並列接続の配置
      const X_PADDING = 20 * SCALE;
      const Y_PADDING = 20 * SCALE;
      let maxWidth = 0;
      let totalHeight = 0;
      for (const c of this.children) {
        c.y = totalHeight;
        maxWidth = Math.max(maxWidth, c.width);
        totalHeight += c.height + Y_PADDING;
      }
      for (const c of this.children) {
        c.x = (maxWidth - c.width) / 2 + X_PADDING;
      }
      totalHeight -= Y_PADDING;
      this.width = maxWidth + X_PADDING * 2;
      this.height = totalHeight;
    } else {
      // 直列接続の配置
      const X_PADDING = 20 * SCALE;
      let totalWidth = 0;
      let maxHeight = 0;
      for (const c of this.children) {
        c.x = totalWidth;
        totalWidth += c.width + X_PADDING;
        maxHeight = Math.max(maxHeight, c.height);
      }
      for (const c of this.children) {
        c.y = (maxHeight - c.height) / 2;
      }
      totalWidth -= X_PADDING;
      this.width = totalWidth;
      this.height = maxHeight;
    }
  }

  static fromJSON(capacitor: boolean, json: any): TreeNode {
    if (typeof json === 'number') {
      return new TreeNode(capacitor, false, [], json);
    } else {
      const value = json.value! as number;
      const parallel = json.parallel! as boolean;
      const children: TreeNode[] = [];
      for (const childJson of json.children!) {
        children.push(TreeNode.fromJSON(capacitor, childJson));
      }
      return new TreeNode(capacitor, parallel, children, value);
    }
  }

  scale(dx: number, dy: number, xScale: number, yScale: number) {
    this.x *= xScale;
    this.y *= yScale;
    this.width *= xScale;
    this.height *= yScale;
    for (const c of this.children) {
      c.scale(dx, dy, xScale, yScale);
    }
  }

  offset(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.isLeaf) {
      // 素子の描画
      if (this.capacitor) {
        drawCapacitor(ctx, 0, 0, this.value);
      } else {
        drawResistor(ctx, 0, 0, this.value);
      }
    } else if (this.parallel) {
      // 並列接続の描画
      let y0 = 0;
      let y1 = 0;
      for (let i = 0; i < this.children.length; i++) {
        const c = this.children[i];
        const x0 = c.x;
        const x1 = c.x + c.width;
        const y = c.y + c.height / 2;
        drawWire(ctx, 0, y, x0, y);
        drawWire(ctx, x1, y, this.width, y);
        if (i === 0) y0 = y;
        y1 = y;
      }
      drawWire(ctx, 0, y0, 0, y1);
      drawWire(ctx, this.width, y0, this.width, y1);
    } else {
      // 直列接続の描画
      const y = this.height / 2;
      for (let i = 0; i < this.children.length - 1; i++) {
        const x0 = this.children[i].x + this.children[i].width;
        const x1 = this.children[i + 1].x;
        drawWire(ctx, x0, y, x1, y);
      }
    }
    for (const c of this.children) {
      c.draw(ctx);
    }
    ctx.restore();
  }

  get isLeaf() {
    return this.children.length === 0;
  }
}
