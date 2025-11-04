import * as RcmbJS from '../../../lib/ts/src/RcmbJS';

import * as RcmbUi from './RcmbUi';
import * as Schematics from './Schematics';
import {getStr} from './Text';
import * as UiPages from './UiPages';
import {WorkerAgent} from './WorkerAgents';

export class DividerFinderUi extends UiPages.UiPage {
  rangeSelector: RcmbUi.ValueRangeSelector|null = null;
  numElemRangeBox =
      new RcmbUi.RangeBox(true, false, 2, RcmbJS.MAX_COMBINATION_ELEMENTS);
  topTopologySelector = RcmbUi.makeTopologySelector();
  maxDepthInput = RcmbUi.makeDepthSelector();
  statusBox = RcmbUi.makeP();
  resultBox = RcmbUi.makeDiv();
  totalRangeBox = new RcmbUi.RangeBox(false, false, '10k', '100k');
  targetInput: RcmbUi.ValueBox|null = null;
  targetToleranceBox = new RcmbUi.RangeBox(false, true, -10, 10);

  workerAgent = new WorkerAgent();

  lastResult: any = null;

  constructor() {
    super(getStr('Voltage Divider'));

    this.rangeSelector = new RcmbUi.ValueRangeSelector(false);
    this.targetInput = new RcmbUi.ValueBox(false, '3.3 / 5.0');
    this.numElemRangeBox.minValue = 2;
    this.numElemRangeBox.maxValue = 4;

    this.ui = RcmbUi.makeDiv([
      RcmbUi.makeH2(getStr('Find Voltage Dividers')),
      RcmbUi.makeP(
          `R1: ${getStr('Upper Resistor')}, R2: ${getStr('Lower Resistor')}, ${
              getStr('Voltage Ratio')}: Vout / Vin = R2 / (R1 + R2)`),
      RcmbUi.makeTable([
        [getStr('Item'), getStr('Value'), getStr('Unit')],
        [getStr('E Series'), this.rangeSelector.seriesSelect, ''],
        [getStr('Custom Values'), this.rangeSelector.customValuesBox, 'Ω'],
        [getStr('Element Range'), this.rangeSelector.elementRangeBox.ui, 'Ω'],
        [getStr('Element Tolerance'), this.rangeSelector.toleranceUi.ui, '%'],
        [getStr('Number of Elements'), this.numElemRangeBox.ui, ''],
        [getStr('Top Topology'), this.topTopologySelector, ''],
        [getStr('Max Nests'), this.maxDepthInput, ''],
        ['R1 + R2', this.totalRangeBox.ui, 'Ω'],
        [
          RcmbUi.makeSpan([RcmbUi.strong(getStr('Target')), ' (Vout / Vin)']),
          this.targetInput.inputBox, ''
        ],
        [getStr('Target Tolerance'), this.targetToleranceBox.ui, '%'],
      ]),
      this.statusBox,
      this.resultBox,
      RcmbUi.makeH2('誤差について (Tolerance)'),
      RcmbUi.makeP(
          '探索結果の誤差は、分圧比の目標値からの誤差として計算されます。'),
      RcmbUi.makeP(
          '誤差の typ 値は、全ての素子の誤差がゼロのときの値です。' +
          '誤差の min/max 値は、R1 と R2 の間の誤差の偏りが最悪のときの値です。'),
    ]);

    this.rangeSelector.setOnChange(() => this.conditionChanged());
    this.numElemRangeBox.addEventListener(() => this.conditionChanged());
    this.topTopologySelector.addEventListener(
        'change', () => this.conditionChanged());
    this.maxDepthInput.addEventListener(
        'change', () => this.conditionChanged());
    this.totalRangeBox.addEventListener(() => this.conditionChanged());
    this.targetInput.setOnChange(() => this.conditionChanged());
    this.targetToleranceBox.addEventListener(() => this.conditionChanged());

    this.workerAgent.onLaunched = (p) => this.onLaunched(p);
    this.workerAgent.onFinished = (e) => this.onFinished(e);
    this.workerAgent.onAborted = (msg) => this.onAborted(msg);

    this.conditionChanged();
  }

  override onActivate(): void {
    this.targetInput?.focus();
  }

  conditionChanged(): void {
    try {
      const rangeSelector = this.rangeSelector!;
      const custom = rangeSelector.seriesSelect.value === 'custom';
      RcmbUi.setVisible(
          RcmbUi.parentTrOf(rangeSelector.customValuesBox)!, custom);
      RcmbUi.setVisible(
          RcmbUi.parentTrOf(rangeSelector.elementRangeBox.ui)!, !custom);

      const targetValue = this.targetInput!.value;
      const topoConstr =
          parseInt(this.topTopologySelector.value) as RcmbJS.TopologyConstraint

      const args: RcmbJS.FindDividerArgs = {
        elementValues: rangeSelector.getAvailableValues(targetValue),
        numElemsMin: this.numElemRangeBox.minValue,
        numElemsMax: this.numElemRangeBox.maxValue,
        elementTolMin: rangeSelector.toleranceUi.minValue / 100,
        elementTolMax: rangeSelector.toleranceUi.maxValue / 100,
        topologyConstraint: topoConstr,
        maxDepth: parseInt(this.maxDepthInput.value),
        totalMin: this.totalRangeBox.minValue,
        totalMax: this.totalRangeBox.maxValue,
        targetValue: targetValue,
        targetMin: targetValue * (1 + this.targetToleranceBox.minValue / 100),
        targetMax: targetValue * (1 + this.targetToleranceBox.maxValue / 100),
      };

      const cmd: RcmbJS.WorkerCommand = {
        method: RcmbJS.Method.FindDivider,
        args: args
      };

      if (!this.workerAgent.requestStart(cmd)) {
        this.showResult();
      }
    } catch (e) {
      this.workerAgent.cancelRequest();
    }
  }

  onLaunched(cmd: RcmbJS.WorkerCommand): void {
    const args = cmd.args as RcmbJS.FindDividerArgs;
    this.statusBox.style.color = '';
    this.statusBox.innerHTML = '';
    const msg = `${getStr('Searching...')} (${
        RcmbUi.formatValue(args.targetValue, '', false)}):`;
    this.statusBox.appendChild(RcmbUi.makeIcon('⌛', true));
    this.statusBox.appendChild(document.createTextNode(' ' + msg));
    this.resultBox.style.opacity = '0.5';
  }

  onFinished(e: any): void {
    this.lastResult = e;
    this.showResult();
  }

  onAborted(msg: string): void {
    console.log(`Aborted with message: '${msg}'`);
    this.statusBox.innerHTML = '';
    this.statusBox.style.color = msg ? '#c00' : '#000';
    if (msg) {
      this.statusBox.appendChild(RcmbUi.makeIcon('❌'));
      this.statusBox.appendChild(document.createTextNode(getStr(msg)));
    }
    this.resultBox.innerHTML = '';
  }

  showResult(): void {
    this.resultBox.innerHTML = '';
    this.statusBox.innerHTML = '';
    const ret = this.lastResult;
    if (ret === null) return;

    try {
      if (ret.error && ret.error.length > 0) {
        throw new Error(ret.error);
      }

      const timeSpentMs = ret.timeSpent as number;

      let msg = getStr('No combinations found');
      if (ret.result.length > 0) {
        msg = `${getStr('<n> combinations found', {n: ret.result.length})}`;
      }
      msg += ` (${timeSpentMs.toFixed(2)} ms):`;
      this.statusBox.appendChild(RcmbUi.makeIcon('✅'));
      this.statusBox.appendChild(document.createTextNode(msg));

      for (const combJson of ret.result) {
        const resultUi = new ResultUi(ret.command, combJson);
        this.resultBox.appendChild(resultUi.ui);
        this.resultBox.appendChild(document.createTextNode(' '));
      }

      this.statusBox.style.color = '';
      this.resultBox.style.opacity = '';
    } catch (e: any) {
      let msg = 'Unknown error';
      if (e.message) msg = e.message;
      this.statusBox.style.color = '#c00';
      this.statusBox.appendChild(RcmbUi.makeIcon('❌'));
      this.statusBox.appendChild(
          document.createTextNode(`${getStr('Search error')}: ${getStr(msg)}`));
      this.resultBox.innerHTML = '';
    }
  }
}


class ResultUi {
  uppers: Schematics.TreeNode[] = [];
  lowers: Schematics.TreeNode[] = [];
  buttons = RcmbUi.makeP();
  canvas = document.createElement('canvas');
  ui = RcmbUi.makeDiv([this.buttons, this.canvas]);

  constructor(public command: RcmbJS.WorkerCommand, combJson: any) {
    this.ui.className = 'figure';

    for (const upperJson of combJson.uppers) {
      const tree = Schematics.TreeNode.fromJSON(false, upperJson);
      this.uppers.push(tree);
    }
    for (const lowerJson of combJson.lowers) {
      const tree = Schematics.TreeNode.fromJSON(false, lowerJson);
      this.lowers.push(tree);
    }
    this.selectUpperLower(0, 0);
  }

  selectUpperLower(iUpper: number, iLower: number) {
    const args = this.command.args as RcmbJS.FindDividerArgs;
    const upperTree = this.uppers[iUpper];
    const lowerTree = this.lowers[iLower];
    const totalValue = upperTree.value + lowerTree.value;
    const computedValue = lowerTree.value / totalValue;
    const tree = new Schematics.TreeNode(
        false, false, [upperTree, lowerTree], totalValue);

    // R1 と R2 の間隔を広げる
    lowerTree.x += 40 * Schematics.SCALE;
    tree.width += 40 * Schematics.SCALE;

    const PADDING = 20;
    const TOP_PADDING = 20;
    const CAPTION_HEIGHT = 100;
    const LEAD_LENGTH = 40 * Schematics.SCALE;

    tree.offset(-tree.x, -tree.y);

    const VIEW_W = 500;
    const VIEW_H = 300;

    const REQ_W = tree.width + LEAD_LENGTH * 2 + PADDING * 2;
    const REQ_H = tree.height + CAPTION_HEIGHT + TOP_PADDING + PADDING * 3;
    const X_SCALE = Math.max(1, REQ_W / VIEW_W);
    const Y_SCALE = Math.max(1, REQ_H / VIEW_H);
    const SCALE = Math.max(X_SCALE, Y_SCALE);

    const W = VIEW_W * SCALE;
    const H = VIEW_H * SCALE;

    const FIGURE_PLACE_W = W - PADDING * 2;
    const FIGURE_PLACE_H = H - CAPTION_HEIGHT - TOP_PADDING - PADDING * 3;

    const canvas = this.canvas;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${VIEW_W}px`;
    canvas.style.height = 'auto';

    const ctx = canvas.getContext('2d')!;
    // ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    {
      ctx.save();
      ctx.strokeStyle = '#000';
      const dx = PADDING + (FIGURE_PLACE_W - tree.width) / 2;
      const dy = PADDING + (FIGURE_PLACE_H - tree.height) / 2 + TOP_PADDING;
      ctx.translate(dx, dy);
      tree.draw(ctx, false);
      const y = tree.height / 2;
      const x0 = -LEAD_LENGTH;
      const x1 = 0;
      const x2 = tree.width;
      const x3 = tree.width + LEAD_LENGTH;
      Schematics.drawWire(ctx, x0, y, x1, y);
      Schematics.drawWire(ctx, x2, y, x3, y);
      ctx.restore();
    }

    let y = 0;
    ctx.save();
    ctx.translate(W / 2, H - PADDING - CAPTION_HEIGHT);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    {
      const text = `R1 + R2 = ` +
          `${RcmbUi.formatValue(upperTree.value, 'Ω', true, 3)} + ` +
          `${RcmbUi.formatValue(lowerTree.value, 'Ω', true, 3)} = ` +
          `${RcmbUi.formatValue(totalValue, 'Ω', true, 3)}`;
      ctx.font = `${16 * Schematics.SCALE}px sans-serif`;
      ctx.fillText(text, 0, y);
      y += 16 + 10;
    }
    {
      const text = `R2 / (R1 + R2) = ${RcmbUi.formatValue(computedValue)}`;
      ctx.font = `${24 * Schematics.SCALE}px sans-serif`;
      ctx.fillText(text, 0, y);
      y += 24 + 10;
    }
    {
      const lowerMin = lowerTree.value * (1 + args.elementTolMin);
      const lowerMax = lowerTree.value * (1 + args.elementTolMax);
      const upperMin = upperTree.value * (1 + args.elementTolMin);
      const upperMax = upperTree.value * (1 + args.elementTolMax);
      const typ = computedValue;
      const min = lowerMin / (lowerMin + upperMax);
      const max = lowerMax / (lowerMax + upperMin);
      y = UiPages.drawErrorText(
          ctx, y, typ, min, max, args.targetValue, args.targetMin,
          args.targetMax);
    }
    ctx.restore();
  }
}