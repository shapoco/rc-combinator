import * as RcComb from './RcComb';
import * as Ui from './Ui';

export function main() {
  document.querySelector('#rcCombinator')?.appendChild(Ui.makeDiv([
    makeCombinatorUI(),
  ]));
}

function makeCombinatorUI(): HTMLDivElement {
  const rangeSelector = new Ui.ResistorRangeSelector();
  const targetInput = new Ui.ResistorInput('5.1k');
  const numElementsInput = Ui.makeTextBox('4');
  const resultBox = document.createElement('pre') as HTMLPreElement;

  const ui = Ui.makeDiv([
    Ui.makeH2('合成抵抗計算機'),
    Ui.makeTable([
      ['Item', 'Value', 'Unit'],
      ['Series', rangeSelector.seriesSelect, ''],
      ['Custom Values', rangeSelector.customValuesInput, 'Ω'],
      ['Minimum', rangeSelector.minResisterInput.inputBox, 'Ω'],
      ['Maximum', rangeSelector.maxResisterInput.inputBox, 'Ω'],
      ['Max Elements', numElementsInput, ''],
      ['Target', targetInput.inputBox, 'Ω'],
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
        throw new Error('Too many value combinations.');
      }

      const combs = RcComb.findCombinations(
          RcComb.ComponentType.Resistor, availableValues, targetValue,
          maxElements);

      let resultText = '';
      if (combs.length > 0) {
        resultText += `Found ${combs.length} combination(s):\n\n`;
        for (const comb of combs) {
          resultText += comb.toString() + '\n';
        }
      } else {
        resultText = 'No combinations found.';
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
