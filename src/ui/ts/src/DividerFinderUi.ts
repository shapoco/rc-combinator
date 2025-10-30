import * as RcmbJS from '../../../lib/ts/src/RcmbJS';

import * as RcmbUi from './RcmbUi';
import * as Schematics from './Schematics';
import {getStr} from './Text';
import {WorkerAgent} from './WorkerAgents';

export class DividerFinderUi {
  rangeSelector: RcmbUi.ValueRangeSelector|null = null;
  numElementsInput =
      RcmbUi.makeNumElementInput(RcmbJS.MAX_COMBINATION_ELEMENTS, 4);
  topTopologySelector = RcmbUi.makeTopologySelector();
  maxDepthInput = RcmbUi.makeDepthSelector();
  statusBox = RcmbUi.makeP();
  resultBox = RcmbUi.makeDiv();
  totalMinBox = new RcmbUi.ValueBox('10k');
  totalMaxBox = new RcmbUi.ValueBox('100k');
  targetInput: RcmbUi.ValueBox|null = null;
  filterSelector = new RcmbUi.FilterBox();
  ui: HTMLDivElement|null = null;

  workerAgent = new WorkerAgent();

  lastResult: any = null;

  constructor(public commonSettingsUi: RcmbUi.CommonSettingsUi) {
    this.rangeSelector = new RcmbUi.ValueRangeSelector(false);
    this.targetInput = new RcmbUi.ValueBox('3.3 / 5.0');

    this.ui = RcmbUi.makeDiv([
      RcmbUi.makeH2(getStr('Find Voltage Dividers')),
      RcmbUi.makeP(`R1: ${getStr('Upper Resistor')}, R2: ${
          getStr('Lower Resistor')}, Vout / Vin = R2 / (R1 + R2)`),
      RcmbUi.makeTable([
        [getStr('Item'), getStr('Value'), getStr('Unit')],
        [getStr('E Series'), this.rangeSelector.seriesSelect, ''],
        [getStr('Custom Values'), this.rangeSelector.customValuesInput, 'Ω'],
        [getStr('Minimum'), this.rangeSelector.minResisterInput.inputBox, 'Ω'],
        [getStr('Maximum'), this.rangeSelector.maxResisterInput.inputBox, 'Ω'],
        [getStr('Max Elements'), this.numElementsInput.inputBox, ''],
        [getStr('Top Topology'), this.topTopologySelector, ''],
        [getStr('Max Nests'), this.maxDepthInput, ''],
        ['R1 + R2 (min)', this.totalMinBox.inputBox, 'Ω'],
        ['R1 + R2 (max)', this.totalMaxBox.inputBox, 'Ω'],
        [RcmbUi.strong('R2 / (R1 + R2)'), this.targetInput.inputBox, ''],
        [getStr('Filter'), this.filterSelector.ui, ''],
      ]),
      this.statusBox,
      this.resultBox,
    ]);

    this.commonSettingsUi.onChanged.push(() => this.conditionChanged());
    this.rangeSelector.setOnChange(() => this.conditionChanged());
    this.numElementsInput.setOnChange(() => this.conditionChanged());
    this.topTopologySelector.addEventListener(
        'change', () => this.conditionChanged());
    this.maxDepthInput.addEventListener(
        'change', () => this.conditionChanged());
    this.totalMinBox.setOnChange(() => this.conditionChanged());
    this.totalMaxBox.setOnChange(() => this.conditionChanged());
    this.targetInput.setOnChange(() => this.conditionChanged());
    this.filterSelector.setOnChange(() => this.conditionChanged());

    this.workerAgent.onLaunched = (p) => this.onLaunched(p);
    this.workerAgent.onFinished = (e) => this.onFinished(e);
    this.workerAgent.onAborted = (msg) => this.onAborted(msg);

    this.conditionChanged();
  }

  conditionChanged(): void {
    try {
      const rangeSelector = this.rangeSelector!;
      const custom = rangeSelector.seriesSelect.value === 'custom';
      RcmbUi.setVisible(
          RcmbUi.parentTrOf(rangeSelector.customValuesInput)!, custom);
      RcmbUi.setVisible(
          RcmbUi.parentTrOf(rangeSelector.minResisterInput.inputBox)!, !custom);
      RcmbUi.setVisible(
          RcmbUi.parentTrOf(rangeSelector.maxResisterInput.inputBox)!, !custom);

      const targetRatio = this.targetInput!.value;
      const topoConstr =
          parseInt(this.topTopologySelector.value) as RcmbJS.TopologyConstraint

      const p = {
        useWasm: this.commonSettingsUi.useWasmCheckbox.checked,
        method: RcmbJS.Method.FindDivider,
        capacitor: false,
        values: rangeSelector.getAvailableValues(targetRatio),
        maxElements: this.numElementsInput.value,
        topologyConstraint: topoConstr,
        maxDepth: parseInt(this.maxDepthInput.value),
        totalMin: this.totalMinBox.value,
        totalMax: this.totalMaxBox.value,
        targetRatio: targetRatio,
        filter: this.filterSelector.value,
      };

      if (!this.workerAgent.requestStart(p)) {
        this.showResult();
      }
    } catch (e) {
      this.workerAgent.cancelRequest();
    }
  }

  onLaunched(p: any): void {
    this.statusBox.style.color = '';
    this.statusBox.textContent = getStr('Searching...');
    this.resultBox.style.opacity = '0.5';
  }

  onFinished(e: any): void {
    this.lastResult = e;
    this.showResult();
  }

  onAborted(msg: string): void {
    console.log(`Aborted with message: '${msg}'`);
    this.statusBox.textContent = getStr(msg);
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
      this.statusBox.textContent = msg;

      for (const combJson of ret.result) {
        const resultUi =
            new ResultUi(this.commonSettingsUi, ret.params, combJson);
        this.resultBox.appendChild(resultUi.ui);
        this.resultBox.appendChild(document.createTextNode(' '));
      }

      this.statusBox.style.color = '';
      this.resultBox.style.opacity = '';
    } catch (e: any) {
      let msg = 'Unknown error';
      if (e.message) msg = e.message;
      this.statusBox.style.color = '#c00';
      this.statusBox.textContent = `Error: ${getStr(msg)}`;
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

  constructor(
      public commonSettingsUi: RcmbUi.CommonSettingsUi, public params: any,
      combJson: any) {
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
    const upperTree = this.uppers[iUpper];
    const lowerTree = this.lowers[iLower];
    const totalValue = upperTree.value + lowerTree.value;
    const resultRatio = lowerTree.value / totalValue;
    const targetRatio = this.params.targetRatio as number;
    const tree = new Schematics.TreeNode(
        false, false, [upperTree, lowerTree], totalValue);

    // R1 と R2 の間隔を広げる
    lowerTree.x += 40 * Schematics.SCALE;
    tree.width += 40 * Schematics.SCALE;

    const PADDING = 20;
    const TOP_PADDING = 20;
    const CAPTION_HEIGHT = 80;
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
      tree.draw(ctx, this.commonSettingsUi.showColorCodeCheckbox.checked);
      const y = tree.height / 2;
      const x0 = -LEAD_LENGTH;
      const x1 = 0;
      const x2 = tree.width;
      const x3 = tree.width + LEAD_LENGTH;
      Schematics.drawWire(ctx, x0, y, x1, y);
      Schematics.drawWire(ctx, x2, y, x3, y);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(W / 2, H - PADDING - CAPTION_HEIGHT);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    {
      const text = `R1 = ${RcmbUi.formatValue(upperTree.value, 'Ω')}, R2 = ${
          RcmbUi.formatValue(lowerTree.value, 'Ω')}`;
      ctx.font = `${16 * Schematics.SCALE}px sans-serif`;
      ctx.fillText(text, 0, 0);
    }
    {
      const text = `R2 / (R1 + R2) = ${RcmbUi.formatValue(resultRatio)}`;
      ctx.font = `${24 * Schematics.SCALE}px sans-serif`;
      ctx.fillText(text, 0, 30);
    }
    {
      let error = (resultRatio - targetRatio) / targetRatio;
      console.log(`resultRatio=${resultRatio}, targetRatio=${
          targetRatio}, error=${error}`);
      let errorStr = getStr('No Error');
      ctx.save();
      if (Math.abs(error) > 1e-9) {
        errorStr = `${getStr('Error')}: ${error > 0 ? '+' : ''}${
            (error * 100).toFixed(4)}%`;
        ctx.fillStyle = error > 0 ? '#c00' : '#00c';
      }
      ctx.font = `${16 * Schematics.SCALE}px sans-serif`;
      ctx.fillText(`(${errorStr})`, 0, 60);
      ctx.restore();
    }
    ctx.restore();
  }
}