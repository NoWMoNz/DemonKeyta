export interface SettingsData {
  music: boolean;
  sfx: boolean;
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
}

const KEY = 'thwni_settings_v1';
const DEFAULTS: SettingsData = { music: true, sfx: true, musicVolume: 0.5, sfxVolume: 0.7, screenShake: true };

function load(): SettingsData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return { ...DEFAULTS };
}

export const Settings = {
  data: load(),
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  },
};
