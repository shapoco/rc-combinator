import * as RcmbJS from '../../../lib/ts/src/RcmbJS';

import * as RcmbUi from './RcmbUi';
import * as Series from './Series';
import {getStr} from './Text';
import * as UiPages from './UiPages';

export class HomeUi extends UiPages.UiPage {
  constructor() {
    super(getStr('Home'));
    this.ui = RcmbUi.makeDiv();
  }
}
