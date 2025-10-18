import * as RcComb from './RcComb';
import {getStr} from './Text';
import * as Ui from './Ui';

export function main() {
  document.querySelector('#rcCombinator')?.appendChild(Ui.makeDiv([
    makeResistorCombinatorUI(),
    makeDividerCombinatorUI(),
    makeCapacitorCombinatorUI(),
  ]));
}

function makeResistorCombinatorUI(): HTMLDivElement {
  const rangeSelector =
      new Ui.ValueRangeSelector(RcComb.ComponentType.Resistor);
  const targetInput = new Ui.ValueBox('5.1k');
  const numElementsInput = new Ui.ValueBox('4');
  const resultBox = document.createElement('pre') as HTMLPreElement;

  const ui = Ui.makeDiv([
    Ui.makeH2(getStr('Find Resistor Combinations')),
    Ui.makeTable([
      [getStr('Item'), getStr('Value'), getStr('Unit')],
      [getStr('E Series'), rangeSelector.seriesSelect, ''],
      [getStr('Custom Values'), rangeSelector.customValuesInput, 'Ω'],
      [getStr('Minimum'), rangeSelector.minResisterInput.inputBox, 'Ω'],
      [getStr('Maximum'), rangeSelector.maxResisterInput.inputBox, 'Ω'],
      [getStr('Max Elements'), numElementsInput.inputBox, ''],
      [getStr('Target Value'), targetInput.inputBox, 'Ω'],
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
  rangeSelector.onChange(callback);
  targetInput.setOnChange(callback);
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
  rangeSelector.onChange(callback);
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
  rangeSelector.onChange(callback);
  targetInput.setOnChange(callback);
  numElementsInput.setOnChange(callback);
  totalMinBox.setOnChange(callback);
  totalMaxBox.setOnChange(callback);

  callback();

  return ui;
}
