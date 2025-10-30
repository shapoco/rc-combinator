import {CombinationFinderUi} from './CombinationFinderUi';
import * as Core from './Core';
import createModule from './Core';
import {DividerFinderUi} from './DividerFinderUi';
import * as RcComb from './RcComb';
import * as RcmbUi from './RcmbUi';
import * as Svg from './Svg';
import {getStr} from './Text';
import * as Ui from './Ui';

let core: Core.RccombCore|null = null;

export function main(container: HTMLElement): void {
  const commonSettingsUi = new RcmbUi.CommonSettingsUi();
  const resCombFinderUi = new CombinationFinderUi(commonSettingsUi, false);
  const capCombFinderUi = new CombinationFinderUi(commonSettingsUi, true);
  const dividerFinderUi = new DividerFinderUi(commonSettingsUi);
  container.appendChild(Ui.makeDiv([
    commonSettingsUi.ui,
    resCombFinderUi.ui!,
    dividerFinderUi.ui!,
    capCombFinderUi.ui!,
  ]));
}

async function oldMain(container: HTMLElement, wasmCore: Core.RccombCore|null) {
  if (wasmCore) {
    core = wasmCore;
  }

  container.appendChild(Ui.makeDiv([
    makeCombinatorUI(RcComb.ComponentType.Resistor),
    makeDividerCombinatorUI(),
    makeCombinatorUI(RcComb.ComponentType.Capacitor),
    makeCurrentLimitingUI(),
  ]));
}

function makeCombinatorUI(type: RcComb.ComponentType): HTMLDivElement {
  const cap = type === RcComb.ComponentType.Capacitor;

  const rangeSelector = new Ui.ValueRangeSelector(type);
  const numElementsInput =
      Ui.makeNumElementInput(RcComb.MAX_COMBINATION_ELEMENTS, 3);
  const topTopologySelector = Ui.makeTopologySelector();
  const maxDepthInput = Ui.makeDepthSelector();
  const resultBox = Ui.makeDiv();
  const resCombInputBox = new Ui.ValueBox(cap ? '3.14μ' : '5.1k');

  const unit = cap ? 'F' : 'Ω';

  const ui = Ui.makeDiv([
    Ui.makeH2(getStr(
        cap ? 'Find Capacitor Combinations' : 'Find Resistor Combinations')),
    Ui.makeTable([
      [getStr('Item'), getStr('Value'), getStr('Unit')],
      [getStr('E Series'), rangeSelector.seriesSelect, ''],
      [getStr('Custom Values'), rangeSelector.customValuesInput, unit],
      [getStr('Minimum'), rangeSelector.minResisterInput.inputBox, unit],
      [getStr('Maximum'), rangeSelector.maxResisterInput.inputBox, unit],
      [getStr('Max Elements'), numElementsInput.inputBox, ''],
      [getStr('Top Topology'), topTopologySelector, ''],
      [getStr('Max Nests'), maxDepthInput, ''],
      [getStr('Target Value'), resCombInputBox.inputBox, unit],
    ]),
    resultBox,
  ]);

  const callback = () => {
    resultBox.innerHTML = '';
    try {
      const custom = rangeSelector.seriesSelect.value === 'custom';
      Ui.setVisible(Ui.parentTrOf(rangeSelector.customValuesInput)!, custom);
      Ui.setVisible(
          Ui.parentTrOf(rangeSelector.minResisterInput.inputBox)!, !custom);
      Ui.setVisible(
          Ui.parentTrOf(rangeSelector.maxResisterInput.inputBox)!, !custom);

      const targetValue = resCombInputBox.value;
      const availableValues = rangeSelector.getAvailableValues(targetValue);
      const maxElements = numElementsInput.value;
      const topoConstr =
          parseInt(topTopologySelector.value) as RcComb.TopologyConstraint;
      const maxDepth = parseInt(maxDepthInput.value);

      const start = performance.now();

      let combs: RcComb.Combination[] = [];
      if (core) {
        const valueVector = new core.VectorDouble();
        // let valueVector: core.VectorDouble ;
        for (const v of availableValues) {
          valueVector.push_back(v);
        }
        const retJson = JSON.parse(core.find_combinations(
            cap, valueVector, targetValue, maxElements, topoConstr, maxDepth));
        if (retJson.error) {
          throw new Error(getStr(retJson.error));
        }
        for (const combJson of retJson.result) {
          const comb = RcComb.Combination.fromJson(type, combJson);
          combs.push(comb);
        }
        valueVector.delete();
      } else {
        combs = RcComb.findCombinations(
            type, availableValues, targetValue, maxElements, topoConstr,
            maxDepth);
      }

      const end = performance.now();
      console.log(`Computation time: ${(end - start).toFixed(2)} ms`);

      if (combs.length > 0) {
        resultBox.appendChild(
            Ui.makeP(getStr('<n> combinations found', {n: combs.length})))
        for (const comb of combs) {
          // resultText += comb.toString() + '\n';
          resultBox.appendChild(comb.generateSvg(targetValue));
          resultBox.appendChild(document.createTextNode(' '));
        }
      } else {
        resultBox.appendChild(Ui.makeP(getStr('No combinations found.')))
      }
    } catch (e) {
      resultBox.appendChild(Ui.makeP(`Error: ${(e as Error).message}`));
    }
  };
  rangeSelector.setOnChange(callback);
  resCombInputBox.setOnChange(callback);
  numElementsInput.setOnChange(callback);
  topTopologySelector.addEventListener('change', () => callback());
  maxDepthInput.addEventListener('change', () => callback());

  callback();

  return ui;
}

function makeDividerCombinatorUI(): HTMLDivElement {
  const rangeSelector =
      new Ui.ValueRangeSelector(RcComb.ComponentType.Resistor);
  const totalMinBox = new Ui.ValueBox('10k');
  const totalMaxBox = new Ui.ValueBox('100k');
  const numElementsInput =
      Ui.makeNumElementInput(RcComb.MAX_DIVIDER_ELEMENTS, 2);
  const topTopologySelector = Ui.makeTopologySelector();
  const maxDepthInput = Ui.makeDepthSelector();
  const targetInput = new Ui.ValueBox('3.3 / 5.0');
  const resultBox = Ui.makeDiv();

  const ui = Ui.makeDiv([
    Ui.makeH2(getStr('Find Voltage Dividers')),
    Ui.makeP(`R1: ${getStr('Upper Resistor')}, R2: ${
        getStr('Lower Resistor')}, Vout / Vin = R2 / (R1 + R2)`),
    Ui.makeTable([
      [getStr('Item'), getStr('Value'), getStr('Unit')],
      [getStr('E Series'), rangeSelector.seriesSelect, ''],
      [getStr('Custom Values'), rangeSelector.customValuesInput, 'Ω'],
      [getStr('Minimum'), rangeSelector.minResisterInput.inputBox, 'Ω'],
      [getStr('Maximum'), rangeSelector.maxResisterInput.inputBox, 'Ω'],
      [getStr('Max Elements'), numElementsInput.inputBox, ''],
      [getStr('Top Topology'), topTopologySelector, ''],
      [getStr('Max Nests'), maxDepthInput, ''],
      ['R1 + R2 (min)', totalMinBox.inputBox, 'Ω'],
      ['R1 + R2 (max)', totalMaxBox.inputBox, 'Ω'],
      ['R2 / (R1 + R2)', targetInput.inputBox, ''],
    ]),
    resultBox,
  ]);

  const callback = () => {
    resultBox.innerHTML = '';
    try {
      const custom = rangeSelector.seriesSelect.value === 'custom';
      Ui.setVisible(Ui.parentTrOf(rangeSelector.customValuesInput)!, custom);
      Ui.setVisible(
          Ui.parentTrOf(rangeSelector.minResisterInput.inputBox)!, !custom);
      Ui.setVisible(
          Ui.parentTrOf(rangeSelector.maxResisterInput.inputBox)!, !custom);

      const targetValue = targetInput.value;
      const totalMin = totalMinBox.value;
      const totalMax = totalMaxBox.value;
      const availableValues =
          rangeSelector.getAvailableValues((totalMin + totalMax) / 2);
      const maxElements = numElementsInput.value;
      const topoConstr =
          parseInt(topTopologySelector.value) as RcComb.TopologyConstraint;
      const maxDepth = parseInt(maxDepthInput.value);

      const start = performance.now();

      let combs: RcComb.DividerCombination[] = [];
      if (core) {
        const valueVector = new core.VectorDouble();
        // let valueVector: core.VectorDouble ;
        for (const v of availableValues) {
          valueVector.push_back(v);
        }
        const retJson = JSON.parse(core.find_dividers(
            valueVector, targetValue, totalMin, totalMax, maxElements,
            topoConstr, maxDepth));
        if (retJson.error) {
          throw new Error(getStr(retJson.error));
        }
        for (const combJson of retJson.result) {
          const comb = RcComb.DividerCombination.fromJson(
              RcComb.ComponentType.Resistor, combJson);
          combs.push(comb);
        }
        valueVector.delete();
      } else {
        combs = RcComb.findDividers(
            RcComb.ComponentType.Resistor, availableValues, targetValue,
            totalMin, totalMax, maxElements, topoConstr, maxDepth);
      }

      const end = performance.now();
      console.log(`Computation time: ${(end - start).toFixed(2)} ms`);


      if (combs.length > 0) {
        resultBox.appendChild(
            Ui.makeP(getStr('<n> combinations found', {n: combs.length})))
        for (const comb of combs) {
          // resultText += comb.toString() + '\n';
          resultBox.appendChild(comb.generateSvg(targetValue));
          resultBox.appendChild(document.createTextNode(' '));
        }
      } else {
        resultBox.appendChild(Ui.makeP(getStr('No combinations found.')))
      }
    } catch (e) {
      resultBox.appendChild(Ui.makeP(`Error: ${(e as Error).message}`));
    }
  };
  rangeSelector.setOnChange(callback);
  targetInput.setOnChange(callback);
  numElementsInput.setOnChange(callback);
  topTopologySelector.addEventListener('change', () => callback());
  maxDepthInput.addEventListener('change', () => callback());
  totalMinBox.setOnChange(callback);
  totalMaxBox.setOnChange(callback);

  callback();

  return ui;
}

function makeCurrentLimitingUI(): HTMLDivElement {
  const powerVoltageInput = new Ui.ValueBox('3.3');
  const forwardVoltageInput = new Ui.ValueBox('2');
  const forwardCurrentInput = new Ui.ValueBox('1m');
  const resultBox = document.createElement('pre') as HTMLPreElement;

  const ui = Ui.makeDiv([
    Ui.makeH2(getStr('Find LED Current Limiting Resistor')),
    Ui.makeTable([
      [getStr('Item'), getStr('Value'), getStr('Unit')],
      [getStr('Power Voltage'), powerVoltageInput.inputBox, 'V'],
      [getStr('Forward Voltage'), forwardVoltageInput.inputBox, 'V'],
      [getStr('Forward Current'), forwardCurrentInput.inputBox, 'A'],
    ]),
    resultBox,
  ]);

  const callback = () => {
    try {
      const vCC = powerVoltageInput.value;
      const vF = forwardVoltageInput.value;
      const iF = forwardCurrentInput.value;

      const vR = vCC - vF;
      const rIdeal = vR / iF;

      let results = [
        {
          label: getStr('Ideal Value'),
          r: RcComb.formatValue(rIdeal, 'Ω'),
          i: RcComb.formatValue(iF, 'A'),
          p: RcComb.formatValue(vR * iF, 'W'),
        },
      ];

      let rLast = 0;
      for (const seriesName in RcComb.SERIESES) {
        const series = RcComb.makeAvaiableValues(seriesName);

        let rApprox = 0;
        {
          const epsilon = iF * 1e-6;
          let bestDiff = Infinity;
          for (const r of series) {
            const i = (vCC - vF) / r;
            const diff = Math.abs(iF - i);
            if (diff - epsilon < bestDiff) {
              bestDiff = diff;
              rApprox = r;
            }
          }
        }

        if (rApprox !== rLast) {
          const iApprox = (vCC - vF) / rApprox;
          const pApprox = vR * iApprox;
          results.push({
            label: `${getStr('<s> Approximation', {s: seriesName})}`,
            r: RcComb.formatValue(rApprox, 'Ω'),
            i: RcComb.formatValue(iApprox, 'A'),
            p: RcComb.formatValue(pApprox, 'W'),
          });
          if (Math.abs(rApprox - rIdeal) < rIdeal * 1e-6) {
            break;
          }
        }
        rLast = rApprox;
      }

      let resultText = '';
      for (const res of results) {
        resultText += `${res.label}: ` +
            `${res.r} (${res.i}, ${res.p})\n`;
      }

      resultBox.textContent = resultText;
    } catch (e) {
      resultBox.textContent = `Error: ${(e as Error).message}`;
    }
  };
  powerVoltageInput.setOnChange(callback);
  forwardVoltageInput.setOnChange(callback);
  forwardCurrentInput.setOnChange(callback);

  callback();

  return ui;
}
