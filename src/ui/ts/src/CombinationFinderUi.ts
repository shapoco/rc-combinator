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
  resultBox = RcmbUi.makeDiv();
  resCombInputBox: RcmbUi.ValueBox|null = null;
  ui: HTMLDivElement|null = null;

  workerAgent = new WorkerAgent();

  lastResult: any = null;

  constructor(
      public commonSettingsUi: RcmbUi.CommonSettingsUi,
      public capacitor: boolean) {
    const unit = capacitor ? 'F' : 'Ω';
    this.rangeSelector = new RcmbUi.ValueRangeSelector(capacitor);
    this.resCombInputBox = new RcmbUi.ValueBox(capacitor ? '3.14μ' : '5.1k');

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
        [getStr('Target Value'), this.resCombInputBox.inputBox, unit],
      ]),
      this.resultBox,
    ]);

    this.commonSettingsUi.onChanged.push(() => this.conditionChanged());
    this.rangeSelector.setOnChange(() => this.conditionChanged());
    this.resCombInputBox.setOnChange(() => this.conditionChanged());
    this.numElementsInput.setOnChange(() => this.conditionChanged());
    this.topTopologySelector.addEventListener(
        'change', () => this.conditionChanged());
    this.maxDepthInput.addEventListener(
        'change', () => this.conditionChanged());

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

      const targetValue = this.resCombInputBox!.value;
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

  onFinished(e: any): void {
    this.lastResult = e;
    this.showResult();
  }

  onAborted(msg: string): void {
    console.log(`Aborted with message: '${msg}'`);
    this.resultBox.textContent = getStr(msg);
  }

  showResult(): void {
    this.resultBox.innerHTML = '';
    const ret = this.lastResult;
    if (ret === null) return;

    try {
      this.resultBox.innerHTML = '';
      if (ret.error && ret.error.length > 0) {
        throw new Error(ret.error);
      }

      const targetValue = ret.params.targetValue as number;
      const timeSpentMs = ret.timeSpent as number;

      const msg = `${getStr('<n> combinations found', {
        n: ret.result.length
      })} (${getStr('Search Time')}: ${timeSpentMs.toFixed(2)} ms):`;
      this.resultBox.appendChild(RcmbUi.makeP(msg));
      for (const combJson of ret.result) {
        const PADDING = 20;
        const CAPTION_HEIGHT = 50;
        const LEAD_LENGTH = 40 * Schematics.SCALE;

        const node = Schematics.TreeNode.fromJSON(this.capacitor, combJson);
        node.offset(-node.x, -node.y);

        const DISP_W = 300;
        const DISP_H = 300;

        const EDGE_SIZE = Math.max(
            node.width + LEAD_LENGTH * 2 + PADDING * 2,
            node.height + CAPTION_HEIGHT + PADDING * 3);

        const W = Math.max(DISP_W, EDGE_SIZE);
        const H = Math.max(DISP_H, EDGE_SIZE);

        const FIGURE_PLACE_W = W - PADDING * 2;
        const FIGURE_PLACE_H = H - CAPTION_HEIGHT - PADDING * 3;

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
          const dx = PADDING + (FIGURE_PLACE_W - node.width) / 2;
          const dy = PADDING + (FIGURE_PLACE_H - node.height) / 2;
          ctx.translate(dx, dy);
          node.draw(ctx, this.commonSettingsUi.showColorCodeCheckbox.checked);
          const y = node.height / 2;
          const x0 = -LEAD_LENGTH;
          const x1 = 0;
          const x2 = node.width;
          const x3 = node.width + LEAD_LENGTH;
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
              RcmbUi.formatValue(node.value, this.capacitor ? 'F' : 'Ω', true);
          ctx.font = `${24 * Schematics.SCALE}px sans-serif`;
          ctx.fillText(text, 0, 0);
        }
        {
          let error = (node.value - targetValue) / targetValue;
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
    } catch (e: any) {
      let msg = 'Unknown error';
      if (e.message) msg = e.message;
      this.resultBox.textContent = getStr(msg);
    }
  }
}
