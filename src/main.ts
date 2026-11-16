import '@fontsource/press-start-2p';
import '@fontsource/kanit/400.css';
import './style.css';
import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { Audio } from './audio/AudioEngine';
import { Input } from './systems/InputState';

const game = new Phaser.Game(gameConfig);

// Browsers only allow audio after a user gesture.
const unlock = () => Audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
window.addEventListener('touchstart', unlock, { passive: true });

// Prevent page scrolling / zooming gestures on mobile.
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
window.addEventListener('contextmenu', (e) => e.preventDefault());

// expose for debugging / automated tests in dev only
if (import.meta.env.DEV) {
  const w = window as unknown as { game: Phaser.Game; __input: typeof Input };
  w.game = game;
  w.__input = Input;
}
