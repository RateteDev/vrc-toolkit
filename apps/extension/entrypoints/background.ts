import { browser, defineBackground } from "#imports";

const TAB_PAGE = "/tab.html";

export default defineBackground(() => {
  // MV3 exposes the toolbar button as `action`; Firefox MV2 exposes it as
  // `browserAction`. Resolve whichever the running manifest provides.
  const toolbarAction = browser.action ?? browser.browserAction;

  toolbarAction.onClicked.addListener(() => {
    browser.tabs.create({ url: browser.runtime.getURL(TAB_PAGE) });
  });
});
