import {CombinationFinderUi} from './CombinationFinderUi';
import {CurrentLimitterFinderUi} from './CurrentLimitterFinderUi';
import {DividerFinderUi} from './DividerFinderUi';
import * as RcmbUi from './RcmbUi';

export function main(container: HTMLElement): void {
  const commonSettingsUi = new RcmbUi.CommonSettingsUi();
  const resCombFinderUi = new CombinationFinderUi(commonSettingsUi, false);
  const capCombFinderUi = new CombinationFinderUi(commonSettingsUi, true);
  const currLimitFinderUi = new CurrentLimitterFinderUi();
  const dividerFinderUi = new DividerFinderUi(commonSettingsUi);
  container.appendChild(RcmbUi.makeDiv([
    commonSettingsUi.ui,
    resCombFinderUi.ui!,
    dividerFinderUi.ui!,
    currLimitFinderUi.ui!,
    capCombFinderUi.ui!,
  ]));
}
