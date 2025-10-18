import * as RcComb from './RcComb';
import { getStr } from './Text';
import * as Ui from './Ui';

export function main() {
  document.querySelector('#rcCombinator')?.appendChild(Ui.makeDiv([
    makeCombinatorUI(),
    makeDividerCombinatorUI(),
  ]));
}

function makeCombinatorUI(): HTMLDivElement {
  const rangeSelector = new Ui.ResistorRangeSelector();
  const targetInput = new Ui.ResistorInput('5.1k');
  const numElementsInput = Ui.makeTextBox('4');
  const resultBox = document.createElement('pre') as HTMLPreElement;

  const ui = Ui.makeDiv([
    Ui.makeH2(getStr('Find Resistor Combinations')),
    Ui.makeTable([
      [getStr('Item'), getStr('Value'), getStr('Unit')],
      [getStr('E Series'), rangeSelector.seriesSelect, ''],
      [getStr('Custom Values'), rangeSelector.customValuesInput, 'Ω'],
      [getStr('Minimum'), rangeSelector.minResisterInput.inputBox, 'Ω'],
      [getStr('Maximum'), rangeSelector.maxResisterInput.inputBox, 'Ω'],
      [getStr('Max Elements'), numElementsInput, ''],
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

      const availableValues = rangeSelector.availableValues;
      const targetValue = targetInput.value;
      const maxElements = parseInt(numElementsInput.value, 10);

      const numComb = Math.pow(availableValues.length, maxElements);
      if (numComb > 1e6) {
        throw new Error(getStr('The search space is too large.'));
      }

      const combs = RcComb.findCombinations(
          RcComb.ComponentType.Resistor, availableValues, targetValue,
          maxElements);

      let resultText = '';
      if (combs.length > 0) {
        resultText += getStr('Found <n> combination(s):', { n: combs.length }) + '\n\n';
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
  targetInput.onChange(callback);
  numElementsInput.addEventListener('change', () => callback());
  numElementsInput.addEventListener('input', () => callback());

  callback();

  return ui;
}


function makeDividerCombinatorUI(): HTMLDivElement {
  const rangeSelector = new Ui.ResistorRangeSelector();
  const targetInput = Ui.makeTextBox('0.3');
  const totalMinBox = new Ui.ResistorInput('10k');
  const totalMaxBox = new Ui.ResistorInput('100k');
  const numElementsInput = Ui.makeTextBox('2');
  const resultBox = document.createElement('pre') as HTMLPreElement;

  const ui = Ui.makeDiv([
    Ui.makeH2(getStr('Find Voltage Dividers')),
    Ui.makeParagraph(
        `R1: ${getStr('Upper Resistor')}, R2: ${getStr('Lower Resistor')}`),
    Ui.makeTable([
      [getStr('Item'), getStr('Value'), getStr('Unit')],
      [getStr('E Series'), rangeSelector.seriesSelect, ''],
      [getStr('Custom Values'), rangeSelector.customValuesInput, 'Ω'],
      [getStr('Minimum'), rangeSelector.minResisterInput.inputBox, 'Ω'],
      [getStr('Maximum'), rangeSelector.maxResisterInput.inputBox, 'Ω'],
      [getStr('Max Elements'), numElementsInput, ''],
      ['R1 + R2 (min)', totalMinBox.inputBox, 'Ω'],
      ['R1 + R2 (max)', totalMaxBox.inputBox, 'Ω'],
      ['R2 / (R1 + R2)', targetInput, ''],
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

      const availableValues = rangeSelector.availableValues;
      const targetValue = parseFloat(targetInput.value);
      const totalMin = totalMinBox.value;
      const totalMax = totalMaxBox.value;
      const maxElements = parseInt(numElementsInput.value, 10);

      const numComb = Math.pow(availableValues.length, 2 * maxElements);
      if (numComb > 1e7) {
        throw new Error(getStr('The search space is too large.'));
      }

      const combs = RcComb.findDividers(
          RcComb.ComponentType.Resistor, availableValues, targetValue, totalMin,
          totalMax, maxElements);

      let resultText = '';
      if (combs.length > 0) {
        resultText += getStr('Found <n> combination(s):', { n: combs.length }) + '\n\n';
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
  targetInput.addEventListener('change', () => callback());
  targetInput.addEventListener('input', () => callback());
  numElementsInput.addEventListener('change', () => callback());
  numElementsInput.addEventListener('input', () => callback());
  totalMinBox.onChange(callback);
  totalMaxBox.onChange(callback);

  callback();

  return ui;
}
