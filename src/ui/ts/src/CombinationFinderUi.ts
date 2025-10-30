import * as RcmbJS from '../../../lib/ts/src/RcmbJS';

import * as RcmbUi from './RcmbUi';
import * as Schematics from './Schematics';
import {getStr} from './Text';
import {WorkerAgent} from './WorkerAgents';

export class CombinationFinderUi {
  rangeSelector: RcmbUi.ValueRangeSelector|null = null;
  numElementsInput =
      RcmbUi.makeNumElementInput(RcmbJS.MAX_COMBINATION_ELEMENTS, 3);
  topTopologySelector = RcmbUi.makeTopologySelector();
  maxDepthInput = RcmbUi.makeDepthSelector();
  statusBox = RcmbUi.makeP();
  resultBox = RcmbUi.makeDiv();
  targetInput: RcmbUi.ValueBox|null = null;
  ui: HTMLDivElement|null = null;

  workerAgent = new WorkerAgent();

  lastResult: any = null;

  constructor(
      public commonSettingsUi: RcmbUi.CommonSettingsUi,
      public capacitor: boolean) {
    const unit = capacitor ? 'F' : 'Ω';
    this.rangeSelector = new RcmbUi.ValueRangeSelector(capacitor);
    this.targetInput = new RcmbUi.ValueBox(capacitor ? '3.14μ' : '5.1k');

    this.ui = RcmbUi.makeDiv([
      RcmbUi.makeH2(
          this.capacitor ? getStr('Find Capacitor Combinations') :
                           getStr('Find Resistor Combinations')),
      RcmbUi.makeTable([
        [getStr('Item'), getStr('Value'), getStr('Unit')],
        [getStr('E Series'), this.rangeSelector.seriesSelect, ''],
        [getStr('Custom Values'), this.rangeSelector.customValuesInput, unit],
        [getStr('Minimum'), this.rangeSelector.minResisterInput.inputBox, unit],
        [getStr('Maximum'), this.rangeSelector.maxResisterInput.inputBox, unit],
        [getStr('Max Elements'), this.numElementsInput.inputBox, ''],
        [getStr('Top Topology'), this.topTopologySelector, ''],
        [getStr('Max Nests'), this.maxDepthInput, ''],
        [getStr('Target Value'), this.targetInput.inputBox, unit],
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
    this.targetInput.setOnChange(() => this.conditionChanged());

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

      const targetValue = this.targetInput!.value;
      const topoConstr =
          parseInt(this.topTopologySelector.value) as RcmbJS.TopologyConstraint

      const p = {
        useWasm: this.commonSettingsUi.useWasmCheckbox.checked,
        method: RcmbJS.Method.FindCombination,
        capacitor: this.capacitor,
        values: rangeSelector.getAvailableValues(targetValue),
        maxElements: this.numElementsInput.value,
        topologyConstraint: topoConstr,
        maxDepth: parseInt(this.maxDepthInput.value),
        targetValue: targetValue,
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

      const targetValue = ret.params.targetValue as number;
      const timeSpentMs = ret.timeSpent as number;

      const msg = `${getStr('<n> combinations found', {
        n: ret.result.length
      })} (${getStr('Search Time')}: ${timeSpentMs.toFixed(2)} ms):`;
      this.statusBox.textContent = msg;
      for (const combJson of ret.result) {
        const PADDING = 20;
        const TOP_PADDING = 20;
        const CAPTION_HEIGHT = 50;
        const LEAD_LENGTH = 40 * Schematics.SCALE;

        const tree = Schematics.TreeNode.fromJSON(this.capacitor, combJson);
        tree.offset(-tree.x, -tree.y);

        const DISP_W = 300;
        const DISP_H = 300;

        const EDGE_SIZE = Math.max(
            tree.width + LEAD_LENGTH * 2 + PADDING * 2,
            tree.height + CAPTION_HEIGHT + TOP_PADDING + PADDING * 3);

        const W = Math.max(DISP_W, EDGE_SIZE);
        const H = Math.max(DISP_H, EDGE_SIZE);

        const FIGURE_PLACE_W = W - PADDING * 2;
        const FIGURE_PLACE_H = H - CAPTION_HEIGHT - TOP_PADDING - PADDING * 3;

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = `${DISP_W}px`;
        canvas.style.height = 'auto';
        canvas.className = 'figure';

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
          const text =
              RcmbUi.formatValue(tree.value, this.capacitor ? 'F' : 'Ω', true);
          ctx.font = `${24 * Schematics.SCALE}px sans-serif`;
          ctx.fillText(text, 0, 0);
        }
        {
          let error = (tree.value - targetValue) / targetValue;
          let errorStr = getStr('No Error');
          ctx.save();
          if (Math.abs(error) > targetValue / 1e9) {
            errorStr = `${getStr('Error')}: ${error > 0 ? '+' : ''}${
                (error * 100).toFixed(4)}%`;
            ctx.fillStyle = error > 0 ? '#c00' : '#00c';
          }
          ctx.font = `${16 * Schematics.SCALE}px sans-serif`;
          ctx.fillText(`(${errorStr})`, 0, 30);
          ctx.restore();
        }
        ctx.restore();

        this.resultBox.appendChild(canvas);
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
