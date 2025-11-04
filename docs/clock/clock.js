'use strict;'

/** @type {HTMLCanvasElement} */
const canvas = document.createElement('canvas');

const eSeriesSelector = document.createElement('select');

const SCALE = 20;
const R_WIDTH = 2.5 * SCALE;
const R_HEIGHT = SCALE;
const N_PADDING = SCALE;

const COLOR_CODE_TABLE = [
  '#000',
  '#864',
  '#c00',
  '#f80',
  '#ff0',
  '#080',
  '#04c',
  '#c4c',
  '#888',
  '#fff',
];

/**
 * 角が丸い四角形のパスを作成する
 * (original: https://qiita.com/ML081/items/6fb9e9c02675be832402)
 * @param  {CanvasRenderingContext2D} ctx コンテキスト
 * @param  {Number} x   左上隅のX座標
 * @param  {Number} y   左上隅のY座標
 * @param  {Number} w   幅
 * @param  {Number} h   高さ
 * @param  {Number} r   半径
 */
function createRoundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, Math.PI * (3 / 2), 0, false);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI * (1 / 2), false);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + h - r, r, Math.PI * (1 / 2), Math.PI, false);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * (3 / 2), false);
  ctx.closePath();
}

/**
 * 角が丸い四角形を塗りつぶす
 * (original: https://qiita.com/ML081/items/6fb9e9c02675be832402)
 * @param  {CanvasRenderingContext2D} ctx コンテキスト
 * @param  {Number} x   左上隅のX座標
 * @param  {Number} y   左上隅のY座標
 * @param  {Number} w   幅
 * @param  {Number} h   高さ
 * @param  {Number} r   半径
 */
function fillRoundRect(ctx, x, y, w, h, r) {
  createRoundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

/**
 * 角が丸い四角形を描画
 * (original: https://qiita.com/ML081/items/6fb9e9c02675be832402)
 * @param  {CanvasRenderingContext2D} ctx コンテキスト
 * @param  {Number} x   左上隅のX座標
 * @param  {Number} y   左上隅のY座標
 * @param  {Number} w   幅
 * @param  {Number} h   高さ
 * @param  {Number} r   半径
 */
function strokeRoundRect(ctx, x, y, w, h, r) {
  createRoundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x 
 * @param {number} y
 * @param {number} value
 */
function drawResistor(ctx, x, y, value) {
  const r = SCALE / 2;

  ctx.save();
  ctx.translate(x, y);
  /** @type {string[]} */
  let colors;
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
  }
  else {
    colors = [COLOR_CODE_TABLE[0]];
  }

  const bandWidth = R_WIDTH / 8;
  const bandGap = bandWidth / 2;
  const bandX0 = (R_WIDTH - (bandWidth * colors.length + bandGap * (colors.length - 1))) / 2;

  ctx.fillStyle = "#eca";
  fillRoundRect(ctx, 0, 0, R_WIDTH, R_HEIGHT, r);
  for (let i = 0; i < colors.length; i++) {
    const x = bandX0 + i * (bandWidth + bandGap);
    ctx.fillStyle = colors[i];
    ctx.fillRect(x, 0, bandWidth, R_HEIGHT);
  }
  ctx.strokeStyle = "#a86";
  ctx.lineWidth = SCALE / 20;
  strokeRoundRect(ctx, 0, 0, R_WIDTH, R_HEIGHT, r);
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x0 
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 */
function drawWire(ctx, x0, y0, x1, y1) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = SCALE / 4;
  ctx.strokeStyle = "#ccc";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

class Node {
  parallel = false;

  /** @type {Node[]} */
  children = [];

  value = -1;

  x = 0;
  y = 0;
  width = 0;
  height = 0;

  /**
   * @param {boolean} parallel 
   * @param {Node[]} children 
   * @param {number} [value]
   */
  constructor(parallel, children, value = -1) {
    this.parallel = parallel;
    this.children = children;
    this.value = value;

    if (this.isLeaf) {
      // 抵抗素子
      this.width = R_WIDTH;
      this.height = R_HEIGHT;
    }
    else if (this.parallel) {
      // 並列接続の配置
      const PADDING = SCALE * 2;
      let maxWidth = 0;
      let totalHeight = 0;
      for (const c of this.children) {
        c.y = totalHeight;
        maxWidth = Math.max(maxWidth, c.width);
        totalHeight += c.height + PADDING;
      }
      for (const c of this.children) {
        c.x = (maxWidth - c.width) / 2 + SCALE;
      }
      totalHeight -= PADDING;
      this.width = maxWidth + SCALE * 2;
      this.height = totalHeight;
    }
    else {
      // 直列接続の配置
      let totalWidth = 0;
      let maxHeight = 0;
      for (const c of this.children) {
        c.x = totalWidth;
        totalWidth += c.width + SCALE;
        maxHeight = Math.max(maxHeight, c.height);
      }
      for (const c of this.children) {
        c.y = (maxHeight - c.height) / 2;
      }
      totalWidth -= SCALE;
      this.width = totalWidth;
      this.height = maxHeight;
    }
  }

  /**
   * @param {number} dx 
   * @param {number} dy 
   * @param {number} xScale 
   * @param {number} yScale 
   */
  scale(dx, dy, xScale, yScale) {
    this.x *= xScale;
    this.y *= yScale;
    this.width *= xScale;
    this.height *= yScale;
    for (const c of this.children) {
      c.scale(dx, dy, xScale, yScale);
    }
  }

  /**
   * @param {number} dx 
   * @param {number} dy 
   */
  offset(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.isLeaf) {
      // 抵抗素子の描画
      drawResistor(ctx, 0, 0, this.value);
    }
    else if (this.parallel) {
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
    }
    else {
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

/**
 * @type {Node[]}
 */
const eSerieses = {
  '10k': { label: '10k only', topologies: [], blockWidth: 40 * SCALE, blockHeight: 30 * SCALE },
  'e1': { label: 'E1', topologies: [], blockWidth: 30 * SCALE, blockHeight: 20 * SCALE },
  'e3': { label: 'E3', topologies: [], blockWidth: 20 * SCALE, blockHeight: 14 * SCALE },
  'e6': { label: 'E6', topologies: [], blockWidth: 15 * SCALE, blockHeight: 11 * SCALE },
  'e12': { label: 'E12', topologies: [], blockWidth: 12 * SCALE, blockHeight: 8 * SCALE },
  'e24': { label: 'E24', topologies: [], blockWidth: 12 * SCALE, blockHeight: 8 * SCALE },
};

let nextTickId = -1;
let lastSec = -1;

/**
 * @param {HTMLCanvasElement} canvas
 */
export async function main(container) {
  container.appendChild(canvas);

  let defaultKey = window.location.hash;
  if (defaultKey.startsWith('#')) {
    defaultKey = defaultKey.substring(1);
  }
  if (!(defaultKey in eSerieses)) {
    defaultKey = 'e12';
  }

  for (const key in eSerieses) {
    const eSeries = eSerieses[key];
    const option = document.createElement('option');
    option.value = key;
    option.textContent = eSeries.label;
    if (key === defaultKey) {
      option.selected = true;
    }
    eSeriesSelector.appendChild(option);

    const resp = await fetch(`./topologies_${key}.json?20251105005100`);
    const topos_json = await resp.json();
    topos_json.unshift([0]); // 0Ω用のダミー
    for (const topo_list_json of topos_json) {
      const topos = [];
      for (const topo_json of topo_list_json) {
        const tree = generateTree(topo_json);
        tree.offset(-tree.x, -tree.y);
        topos.push(tree);
      }
      eSeries.topologies.push(topos);
    }
  }

  const p = document.createElement('p');
  p.textContent = 'E-Series: ';
  p.appendChild(eSeriesSelector);
  p.style.textAlign = 'center';
  container.appendChild(p);

  window.addEventListener('resize', resize);

  window.setTimeout(tick, 100);

  resize();

  eSeriesSelector.addEventListener('change', () => {
    window.location.replace(`#${eSeriesSelector.value}`);
    tick(true);
  });
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 200;
  tick(true);
}

/**
 * @param {*} json
 * @return {Node}
 */
function generateTree(json) {
  if (typeof json === 'number') {
    return new Node(false, [], json);
  } else {
    const parallel = json['parallel'];
    const children = json['children'].map((c) => generateTree(c));
    return new Node(parallel, children);
  }
}

function tick(force = false) {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const millis = now.getMilliseconds();

  if (nextTickId>0) {
    window.clearTimeout(nextTickId);
  }
  nextTickId = window.setTimeout(tick, 1000 - millis);
  
  if (seconds === lastSec && !force) {
    return;
  }
  lastSec = seconds;

  const numbers = [
    hours,
    minutes,
    seconds,
  ];

  const topoIndexes = [
    (year + month + day) * hours,
    (year + month + day + hours) * minutes,
    (year + month + day + hours + minutes) * seconds,
  ];

  const eSeriesStr = eSeriesSelector.value || 'e12';
  const eSeries = eSerieses[eSeriesStr];

  const w = canvas.width;
  const h = canvas.height;

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const bw = eSeries.blockWidth;
  const bh = eSeries.blockHeight;

  const clockWidth = numbers.length * bw + (numbers.length - 1) * N_PADDING;

  const digitHeight = SCALE * 2;

  const worldWidth = clockWidth + N_PADDING * 2;
  const worldHeight = (bh + digitHeight) + N_PADDING * 2;
  const scale = Math.min(w / worldWidth, h / worldHeight);
  ctx.scale(scale, scale);
  ctx.translate((w / scale - worldWidth) / 2, (h / scale - worldHeight) / 2);

  let x = N_PADDING;
  let y = N_PADDING;

  /** @type {Array<{x: number, y: number, topo: Node}>} */
  const drawQueue = [];

  const yCenter = y + bh / 2;
  let lastX = -1000;
  for (let i = 0; i < numbers.length; i++) {
    const n = numbers[i];
    const topos = eSeries.topologies[n];
    const topo = topos[topoIndexes[i] % topos.length];
    ctx.save();
    const x0 = x + (bw - topo.width) / 2;
    const y0 = y + (bh - topo.height) / 2;
    drawWire(ctx, lastX, yCenter, x0, y + bh / 2);
    drawQueue.push({ x: x0, y: y0, topo });
    ctx.restore();
    lastX = x0 + topo.width;
    x += bw + N_PADDING;
  }
  drawWire(ctx, lastX, yCenter, lastX + 1000, yCenter);

  for (const item of drawQueue) {
    ctx.save();
    ctx.translate(item.x, item.y);
    item.topo.draw(ctx);
    ctx.restore();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ccc";
  ctx.font = `${SCALE * 1.5}px sans-serif`;
  x = N_PADDING + bw / 2;
  y = N_PADDING + bh + SCALE;
  for (const n of numbers) {
    if (n === 0) {
      ctx.fillText('0 Ω', x, y);
    }
    else {
      ctx.fillText(n.toString() + ' kΩ', x, y);
    }
    x += bw + N_PADDING;
  }

  ctx.restore();
}
