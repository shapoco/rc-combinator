import * as RcComb from './RcComb';
import {getStr} from './Text';
import * as Ui from './Ui';

const resCombHeader = Ui.makeH2(getStr('Find Resistor Combinations'));
const resCombInputBox = new Ui.ValueBox('5.1k');

export function main() {
  document.querySelector('#rcCombinator')?.appendChild(Ui.makeDiv([
    makeResistorCombinatorUI(),
    makeDividerCombinatorUI(),
    makeCapacitorCombinatorUI(),
    makeCurrentLimitingUI(),
  ]));
}

function makeResistorCombinatorUI(): HTMLDivElement {
  const rangeSelector =
      new Ui.ValueRangeSelector(RcComb.ComponentType.Resistor);
  const numElementsInput = new Ui.ValueBox('4');
  const resultBox = document.createElement('pre') as HTMLPreElement;

  const ui = Ui.makeDiv([
    resCombHeader,
    Ui.makeTable([
      [getStr('Item'), getStr('Value'), getStr('Unit')],
      [getStr('E Series'), rangeSelector.seriesSelect, ''],
      [getStr('Custom Values'), rangeSelector.customValuesInput, 'Ω'],
      [getStr('Minimum'), rangeSelector.minResisterInput.inputBox, 'Ω'],
      [getStr('Maximum'), rangeSelector.maxResisterInput.inputBox, 'Ω'],
      [getStr('Max Elements'), numElementsInput.inputBox, ''],
      [getStr('Target Value'), resCombInputBox.inputBox, 'Ω'],
    ]),
    resultBox,
  ]);

  const callback = () => {
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

      const combs = RcComb.findCombinations(
          RcComb.ComponentType.Resistor, availableValues, targetValue,
          maxElements);

      let resultText = '';
      if (combs.length > 0) {
        resultText +=
            getStr('Found <n> combination(s):', {n: combs.length}) + '\n\n';
        for (const comb of combs) {
          resultText += comb.toString() + '\n';
        }
      } else {
        resultText = getStr('No combinations found.');
      }
      resultBox.textContent = resultText;
    } catch (e) {
      resultBox.textContent = `Error: ${(e as Error).message}`;
    }
  };
  rangeSelector.setOnChange(callback);
  resCombInputBox.setOnChange(callback);
  numElementsInput.setOnChange(callback);

  callback();

  return ui;
}

function makeCapacitorCombinatorUI(): HTMLDivElement {
  const rangeSelector =
      new Ui.ValueRangeSelector(RcComb.ComponentType.Capacitor);
  const targetInput = new Ui.ValueBox('3.14μ');
  const numElementsInput = new Ui.ValueBox('4');
  const resultBox = document.createElement('pre') as HTMLPreElement;

  const ui = Ui.makeDiv([
    Ui.makeH2(getStr('Find Capacitor Combinations')),
    Ui.makeTable([
      [getStr('Item'), getStr('Value'), getStr('Unit')],
      [getStr('E Series'), rangeSelector.seriesSelect, ''],
      [getStr('Custom Values'), rangeSelector.customValuesInput, 'F'],
      [getStr('Minimum'), rangeSelector.minResisterInput.inputBox, 'F'],
      [getStr('Maximum'), rangeSelector.maxResisterInput.inputBox, 'F'],
      [getStr('Max Elements'), numElementsInput.inputBox, ''],
      [getStr('Target Value'), targetInput.inputBox, 'F'],
    ]),
    resultBox,
  ]);

  const callback = () => {
    try {
      const custom = rangeSelector.seriesSelect.value === 'custom';
      Ui.setVisible(Ui.parentTrOf(rangeSelector.customValuesInput)!, custom);
      Ui.setVisible(
          Ui.parentTrOf(rangeSelector.minResisterInput.inputBox)!, !custom);
      Ui.setVisible(
          Ui.parentTrOf(rangeSelector.maxResisterInput.inputBox)!, !custom);

      const targetValue = targetInput.value;
      const availableValues = rangeSelector.getAvailableValues(targetValue);
      const maxElements = numElementsInput.value;

      const combs = RcComb.findCombinations(
          RcComb.ComponentType.Capacitor, availableValues, targetValue,
          maxElements);

      let resultText = '';
      if (combs.length > 0) {
        resultText +=
            getStr('Found <n> combination(s):', {n: combs.length}) + '\n\n';
        for (const comb of combs) {
          resultText += comb.toString() + '\n';
        }
      } else {
        resultText = getStr('No combinations found.');
      }
      resultBox.textContent = resultText;
    } catch (e) {
      resultBox.textContent = `Error: ${(e as Error).message}`;
    }
  };
  rangeSelector.setOnChange(callback);
  targetInput.setOnChange(callback);
  numElementsInput.setOnChange(callback);

  callback();

  return ui;
}

function makeDividerCombinatorUI(): HTMLDivElement {
  const rangeSelector =
      new Ui.ValueRangeSelector(RcComb.ComponentType.Resistor);
  const targetInput = new Ui.ValueBox('3.3 / 5.0');
  const totalMinBox = new Ui.ValueBox('10k');
  const totalMaxBox = new Ui.ValueBox('100k');
  const numElementsInput = new Ui.ValueBox('2');
  const resultBox = document.createElement('pre') as HTMLPreElement;

  const ui = Ui.makeDiv([
    Ui.makeH2(getStr('Find Voltage Dividers')),
    Ui.makeParagraph(`R1: ${getStr('Upper Resistor')}, R2: ${
        getStr('Lower Resistor')}, Vout / Vin = R2 / (R1 + R2)`),
    Ui.makeTable([
      [getStr('Item'), getStr('Value'), getStr('Unit')],
      [getStr('E Series'), rangeSelector.seriesSelect, ''],
      [getStr('Custom Values'), rangeSelector.customValuesInput, 'Ω'],
      [getStr('Minimum'), rangeSelector.minResisterInput.inputBox, 'Ω'],
      [getStr('Maximum'), rangeSelector.maxResisterInput.inputBox, 'Ω'],
      [getStr('Max Elements'), numElementsInput.inputBox, ''],
      ['R1 + R2 (min)', totalMinBox.inputBox, 'Ω'],
      ['R1 + R2 (max)', totalMaxBox.inputBox, 'Ω'],
      ['R2 / (R1 + R2)', targetInput.inputBox, ''],
    ]),
    resultBox,
  ]);

  const callback = () => {
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

      const combs = RcComb.findDividers(
          RcComb.ComponentType.Resistor, availableValues, targetValue, totalMin,
          totalMax, maxElements);

      let resultText = '';
      if (combs.length > 0) {
        resultText +=
            getStr('Found <n> combination(s):', {n: combs.length}) + '\n\n';
        for (const comb of combs) {
          resultText += comb.toString() + '\n';
        }
      } else {
        resultText = getStr('No combinations found.');
      }
      resultBox.textContent = resultText;
    } catch (e) {
      resultBox.textContent = `Error: ${(e as Error).message}`;
    }
  };
  rangeSelector.setOnChange(callback);
  targetInput.setOnChange(callback);
  numElementsInput.setOnChange(callback);
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
      const vcc = powerVoltageInput.value;
      const vForward = forwardVoltageInput.value;
      const iForward = forwardCurrentInput.value;

      const rIdeal = (vcc - vForward) / iForward;

      let results = [
        {
          label: getStr('Ideal Value'),
          r: RcComb.formatValue(rIdeal, 'Ω'),
          i: RcComb.formatValue(iForward, 'A'),
          p: RcComb.formatValue(vcc * iForward, 'W'),
        },
      ];

      let rLast = 0;
      for (const seriesName in RcComb.SERIESES) {
        const series = RcComb.makeAvaiableValues(seriesName);
        const combs = RcComb.findCombinations(
            RcComb.ComponentType.Resistor, series, rIdeal, 1);
        if (combs.length === 0) continue;
        const rApprox = combs[0].value;
        if (rApprox !== rLast) {
          const iApprox = (vcc - vForward) / rApprox;
          const pApprox = vcc * iApprox;
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
