import * as RcmbJS from '../../../lib/ts/src/RcmbJS';

import * as RcmbUi from './RcmbUi';
import * as Series from './Series';
import {getStr} from './Text';
import * as UiPages from './UiPages';

export class CurrentLimitterFinderUi extends UiPages.UiPage {
  powerVoltageInput = new RcmbUi.ValueBox('3.3');
  forwardVoltageInput = new RcmbUi.ValueBox('2');
  forwardCurrentInput = new RcmbUi.ValueBox('1m');
  filterSelector = new RcmbUi.FilterBox();
  resultBox = RcmbUi.makeDiv();

  constructor() {
    super(getStr('Current Limitting'));

    this.ui = RcmbUi.makeDiv([
      RcmbUi.makeH2(getStr('Find LED Current Limiting Resistor')),
      RcmbUi.makeTable([
        [getStr('Item'), getStr('Value'), getStr('Unit')],
        [getStr('Power Voltage'), this.powerVoltageInput.inputBox, 'V'],
        [getStr('Forward Voltage'), this.forwardVoltageInput.inputBox, 'V'],
        [
          RcmbUi.strong(getStr('Target Current')),
          this.forwardCurrentInput.inputBox, 'A'
        ],
        [getStr('Filter'), this.filterSelector.ui, ''],
      ]),
      RcmbUi.makeP('結果:'),
      this.resultBox,
    ]);

    this.powerVoltageInput.setOnChange(() => this.conditionChanged());
    this.forwardVoltageInput.setOnChange(() => this.conditionChanged());
    this.forwardCurrentInput.setOnChange(() => this.conditionChanged());
    this.filterSelector.setOnChange(() => this.conditionChanged());
    this.conditionChanged();
  }

  conditionChanged() {
    this.resultBox.innerHTML = '';
    try {
      const vCC = this.powerVoltageInput.value;
      const vF = this.forwardVoltageInput.value;
      const iF = this.forwardCurrentInput.value;

      const vR = vCC - vF;
      const rIdeal = vR / iF;

      let results = [
        {
          label: getStr('Ideal Value'),
          r: RcmbJS.formatValue(rIdeal, '', true),
          i: RcmbJS.formatValue(iF, '', true),
          e: '',
          p: RcmbJS.formatValue(vR * iF, '', true),
        },
      ];

      let rLast = 0;
      for (const seriesName in Series.Serieses) {
        const series = Series.makeAvaiableValues(seriesName);
        const filter = this.filterSelector.value;

        let rApprox = NaN;
        {
          const epsilon = iF * 1e-6;
          let bestDiff = Number.MAX_VALUE;
          for (const r of series) {
            const i = (vCC - vF) / r;

            if ((filter & RcmbJS.Filter.Below) === 0 && (i < iF - epsilon)) {
              continue;
            }
            if ((filter & RcmbJS.Filter.Above) === 0 && (i > iF + epsilon)) {
              continue;
            }

            const diff = Math.abs(iF - i);
            if (diff - epsilon < bestDiff) {
              bestDiff = diff;
              rApprox = r;
            }
          }
        }

        if (isNaN(rApprox)) {
          results.push({
            label: seriesName,
            r: `(${getStr('None')})`,
            i: '',
            e: '',
            p: '',
          });
        } else if (rApprox === rLast) {
          results.push({
            label: seriesName,
            r: `(${getStr('Same as Above')})`,
            i: '',
            e: '',
            p: '',
          });
        } else {
          const iApprox = (vCC - vF) / rApprox;
          const pApprox = vR * iApprox;
          const eApprox = Math.round((iApprox - iF) / iF * 10000) / 100;
          results.push({
            label: seriesName,
            r: RcmbJS.formatValue(rApprox, '', true),
            i: RcmbJS.formatValue(iApprox, '', true),
            e: (eApprox > 0 ? '+' : '') + eApprox.toFixed(2),
            p: RcmbJS.formatValue(pApprox, '', true),
          });
          if (Math.abs(rApprox - rIdeal) < rIdeal * 1e-6) {
            break;
          }
        }
        rLast = rApprox;
      }

      let rows = [[
        getStr('E Series'),
        getStr('Resistor') + ' [Ω]',
        getStr('Current') + ' [A]',
        getStr('Error') + ' [%]',
        getStr('Power Loss') + ' [W]',
      ]];
      for (const res of results) {
        rows.push([res.label, res.r, res.i, res.e, res.p]);
      }
      const table = RcmbUi.makeTable(rows);
      this.resultBox.appendChild(table);
    } catch (e) {
      const msg = getStr('Invalid input');
      this.resultBox.appendChild(RcmbUi.makeP(`Error: ${msg}`));
    }
  }
}
