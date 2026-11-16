import Phaser from 'phaser';
import { GAME_W, GAME_H } from './constants';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { IntroScene } from '../scenes/IntroScene';
import { GameScene } from '../scenes/GameScene';
import { HUDScene } from '../scenes/HUDScene';
import { PauseScene } from '../scenes/PauseScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { UpgradeScene } from '../scenes/UpgradeScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { EndingScene } from '../scenes/EndingScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0d0a14',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { x: 0, y: 0 } },
  },
  input: { activePointers: 4 },
  fps: { target: 60 },
  scene: [BootScene, MenuScene, IntroScene, GameScene, HUDScene, PauseScene, SettingsScene, UpgradeScene, GameOverScene, EndingScene],
};
