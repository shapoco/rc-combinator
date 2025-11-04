import * as RcmbJS from '../../../lib/ts/src/RcmbJS';

import * as RcmbUi from './RcmbUi';
import * as Schematics from './Schematics';
import {getStr} from './Text';
import * as UiPages from './UiPages';
import {WorkerAgent} from './WorkerAgents';

export class CombinationFinderUi extends UiPages.UiPage {
  rangeSelector: RcmbUi.ValueRangeSelector|null = null;
  numElemRangeBox =
      new RcmbUi.RangeBox(true, false, 1, RcmbJS.MAX_COMBINATION_ELEMENTS);
  topTopologySelector = RcmbUi.makeTopologySelector();
  maxDepthInput = RcmbUi.makeDepthSelector();
  statusBox = RcmbUi.makeP();
  resultBox = RcmbUi.makeDiv();
  targetInput: RcmbUi.ValueBox|null = null;
  targetToleranceBox = new RcmbUi.RangeBox(false, true);

  unit: string = '';

  workerAgent = new WorkerAgent();

  lastResult: any = null;

  constructor(public capacitor: boolean) {
    super(getStr((capacitor ? 'Capacitor' : 'Resistor') + ' Combination'));

    this.unit = capacitor ? 'F' : 'Ω';
    this.rangeSelector = new RcmbUi.ValueRangeSelector(capacitor);
    this.targetInput = new RcmbUi.ValueBox(false, capacitor ? '3.14μ' : '5.1k');
    this.targetToleranceBox.setDefaultValue(-50, 50)
    this.numElemRangeBox.minValue = 1;
    this.numElemRangeBox.maxValue = 3;

    const paramTable = RcmbUi.makeTable([
      [getStr('Item'), getStr('Value'), getStr('Unit')],
      [getStr('E Series'), this.rangeSelector.seriesSelect, ''],
      [getStr('Custom Values'), this.rangeSelector.customValuesBox, this.unit],
      [getStr('Element Range'), this.rangeSelector.elementRangeBox.ui, 'Ω'],
      [getStr('Element Tolerance'), this.rangeSelector.toleranceUi.ui, '%'],
      [getStr('Number of Elements'), this.numElemRangeBox.ui, ''],
      [getStr('Top Topology'), this.topTopologySelector, ''],
      [getStr('Max Nests'), this.maxDepthInput, ''],
      [
        RcmbUi.strong(getStr('Target Value')), this.targetInput.inputBox,
        this.unit
      ],
      [getStr('Target Tolerance'), this.targetToleranceBox.ui, '%'],
    ]);

    this.ui = RcmbUi.makeDiv([
      RcmbUi.makeH2(
          this.capacitor ? getStr('Find Capacitor Combinations') :
                           getStr('Find Resistor Combinations')),
      paramTable,
      this.statusBox,
      this.resultBox,
      RcmbUi.makeH2('誤差について (Tolerance)'),
      RcmbUi.makeP(
          '探索結果の目標値からの誤差が e で、使用される素子の誤差が ±t の場合、最終的な誤差は (e × ±t) ＋ e±t となります。'),
      RcmbUi.makeP(
          '例えば、探索結果の目標値からの誤差が 3% で、素子の誤差が ±5% の場合、最終的な誤差は (3±5.15)% となります。'),
      RcmbUi.makeP(
          'トポロジーの複雑さは誤差の範囲の大小には影響しませんが、範囲内の誤差の分布は変化します。'),
    ]);

    this.rangeSelector.setOnChange(() => this.conditionChanged());
    this.numElemRangeBox.addEventListener(() => this.conditionChanged());
    this.topTopologySelector.addEventListener(
        'change', () => this.conditionChanged());
    this.maxDepthInput.addEventListener(
        'change', () => this.conditionChanged());
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

      const args: RcmbJS.FindCombinationArgs = {
        capacitor: this.capacitor,
        elementValues: rangeSelector.getAvailableValues(targetValue),
        elementTolMin: rangeSelector.toleranceUi.minValue / 100,
        elementTolMax: rangeSelector.toleranceUi.maxValue / 100,
        numElemsMin: this.numElemRangeBox.minValue,
        numElemsMax: this.numElemRangeBox.maxValue,
        topologyConstraint: topoConstr,
        maxDepth: parseInt(this.maxDepthInput.value),
        targetValue: targetValue,
        targetMin: targetValue * (1 + this.targetToleranceBox.minValue / 100),
        targetMax: targetValue * (1 + this.targetToleranceBox.maxValue / 100),
      };

      const cmd: RcmbJS.WorkerCommand = {
        method: RcmbJS.Method.FindCombination,
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
    const args = cmd.args as RcmbJS.FindCombinationArgs;
    this.statusBox.style.color = '';
    this.statusBox.innerHTML = '';
    const msg = `${getStr('Searching...')} (${
        RcmbUi.formatValue(args.targetValue, this.unit)}):`;
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

      const args = ret.command.args as RcmbJS.FindCombinationArgs;
      const targetValue = args.targetValue as number;
      const timeSpentMs = ret.timeSpent as number;

      let msg = getStr('No combinations found');
      if (ret.result.length > 0) {
        msg = `${getStr('<n> combinations found', {n: ret.result.length})}`;
      }
      msg += ` (${timeSpentMs.toFixed(2)} ms):`;
      this.statusBox.appendChild(RcmbUi.makeIcon('✅'));
      this.statusBox.appendChild(document.createTextNode(msg));
      for (const combJson of ret.result) {
        const PADDING = 20;
        const TOP_PADDING = 20;
        const CAPTION_HEIGHT = 70;
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
          const text = RcmbUi.formatValue(tree.value, this.unit, true);
          ctx.font = `${24 * Schematics.SCALE}px sans-serif`;
          ctx.fillText(text, 0, y);
          y += 24 + 10;
        }
        {
          const typ = tree.value;
          const min = tree.value * (1 + args.elementTolMin);
          const max = tree.value * (1 + args.elementTolMax);
          y = UiPages.drawErrorText(
              ctx, y, typ, min, max, args.targetValue, args.targetMin,
              args.targetMax);
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
      this.statusBox.appendChild(RcmbUi.makeIcon('❌'));
      this.statusBox.appendChild(
          document.createTextNode(`${getStr('Search error')}: ${getStr(msg)}`));
      this.resultBox.innerHTML = '';
    }
  }
}
