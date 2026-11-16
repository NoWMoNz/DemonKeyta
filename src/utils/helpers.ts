import Phaser from 'phaser';

export const wait = (scene: Phaser.Scene, ms: number) =>
  new Promise<void>((res) => scene.time.delayedCall(ms, () => res()));

export const tweenP = (scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig) =>
  new Promise<void>((res) => {
    scene.tweens.add({ ...cfg, onComplete: () => res() });
  });

export const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
  window.matchMedia?.('(pointer: coarse)').matches;
