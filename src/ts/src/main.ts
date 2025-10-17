import * as RcComb from './RcComb';
import * as Ui from './Ui';

export function main() {
  document.querySelector('#rcCombinator')?.appendChild(Ui.makeDiv([
    makeCombinatorUI(),
  ]));
}

function makeCombinatorUI(): HTMLDivElement {
  const rangeSelector = new Ui.ResistorRangeSelector();
  const targetInput = new Ui.ResistorInput('目標値', '50k');
  const numElementsInput = Ui.makeTextBox('3');
  const resultBox = document.createElement('pre') as HTMLPreElement;

  const ui = Ui.makeDiv([
    Ui.makeH2('合成抵抗計算機'),
    Ui.makeParagraph([
      rangeSelector.container,
      Ui.makeBr(),
      targetInput.container,
      Ui.makeBr(),
      Ui.makeLabel('最大素子数', numElementsInput),
    ]),
    resultBox,
  ]);

  const callback = () => {
    try {
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
