/**
 * Secret owner-only cheat mode.
 * Enable on a device by opening the game once with  ?cheat=gato  in the URL
 * (it is remembered in that browser). Disable with  ?cheat=off .
 * On other devices the cheat keys do nothing.
 */
const KEY = 'thwni_owner';

function init() {
  try {
    const p = new URLSearchParams(window.location.search).get('cheat');
    if (p === 'gato') localStorage.setItem(KEY, '1');
    else if (p === 'off') localStorage.removeItem(KEY);
    if (p) {
      // remove the parameter from the address bar so it isn't shared by accident
      const url = new URL(window.location.href);
      url.searchParams.delete('cheat');
      window.history.replaceState(null, '', url.toString());
    }
    return { enabled: localStorage.getItem(KEY) === '1', justChanged: p === 'gato' || p === 'off' };
  } catch {
    return { enabled: false, justChanged: false };
  }
}

export const Cheat = init();
