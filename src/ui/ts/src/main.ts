
import {CombinationFinderUi} from './CombinationFinderUi';
import {CurrentLimitterFinderUi} from './CurrentLimitterFinderUi';
import {DividerFinderUi} from './DividerFinderUi';
import {HomeUi} from './HomeUi';
import * as RcmbUi from './RcmbUi';
import * as UiPages from './UiPages';

const commonSettingsUi = new RcmbUi.CommonSettingsUi();
const homeUi = new HomeUi();
const resCombFinderUi = new CombinationFinderUi(commonSettingsUi, false);
const capCombFinderUi = new CombinationFinderUi(commonSettingsUi, true);
const currLimitFinderUi = new CurrentLimitterFinderUi();
const dividerFinderUi = new DividerFinderUi(commonSettingsUi);

const pages: Record<string, UiPages.UiPage> = {
  home: homeUi,
  rcmb: resCombFinderUi,
  rdiv: dividerFinderUi,
  rled: currLimitFinderUi,
  ccmb: capCombFinderUi,
};

const menuButtons: Record<string, HTMLButtonElement> = {};

const menuBar = RcmbUi.makeDiv([], 'menuBar');
const pageContainer = RcmbUi.makeDiv([], 'pageContainer');

const defaultTitle = document.title;
let currentPageId = '';

export function main(
    container: HTMLElement, titleElement: HTMLElement,
    followingElement: HTMLElement): void {
  titleElement.remove();
  followingElement.remove();
  homeUi.ui!.appendChild(titleElement);
  homeUi.ui!.appendChild(followingElement);

  for (const pageId in pages) {
    const page = pages[pageId];

    const buttonImage = document.createElement('img');
    buttonImage.src = `./img/menu_icon_${pageId}.png`;

    const menuButton = RcmbUi.makeButton();
    menuButton.appendChild(buttonImage);
    menuButton.appendChild(RcmbUi.makeSpan(page.title, 'menuButtonLabel'));
    menuButtons[pageId] = menuButton;

    menuBar.appendChild(menuButton);
    menuBar.appendChild(document.createTextNode(' '));

    menuButton.addEventListener('click', () => {
      showPage(pageId);
    });

    // ページ遷移を検出
    window.addEventListener('hashchange', () => {
      let hash = window.location.hash;
      if (hash.startsWith('#')) {
        hash = hash.substring(1);
      }
      if (hash in pages) {
        showPage(hash);
      }
    });
  }

  container.appendChild(RcmbUi.makeDiv([
    menuBar,
    pageContainer,
  ]));

  window.addEventListener('resize', () => {onResize()});

  onHashChange();
  onResize();
}

function showPage(pageId: string): void {
  if (pageId && ! (pageId in pages)) return;
  if (currentPageId === pageId) return;
  currentPageId = pageId;

  if (pageId === 'home') {
    window.location.hash = '';
    document.title = defaultTitle;
  }
  else {
    window.location.hash = pageId;
    document.title = `${pages[pageId].title} | ${defaultTitle}`;
  }

  pageContainer.innerHTML = '';
  pageContainer.appendChild(pages[pageId].ui!);

  for (const id in menuButtons) {
    const btn = menuButtons[id];
    if (id === pageId) {
      btn.classList.add('menuButtonSelected');
    } else {
      btn.classList.remove('menuButtonSelected');
    }
  }
}

function onHashChange(): void {
  let hash = window.location.hash;
  if (hash.startsWith('#')) {
    hash = hash.substring(1);
  }
  if (hash === '') {
    hash = 'home';
  }
  if (hash in pages) {
    showPage(hash);
  }
}

function onResize(): void {
  const w = window.innerWidth;

  const labels = Array.from(document.querySelectorAll('.menuButtonLabel'));
  for (const label of labels) {
    (label as HTMLElement).style.display = (w < 1200) ? 'none' : 'inline';
  }
}