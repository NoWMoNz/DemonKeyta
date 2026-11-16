/**
 * Unified input state written by keyboard/mouse (GameScene) and touch controls (HUD),
 * read by the Player. One-shot actions are "pressed" flags consumed each frame.
 */
export const Input = {
  moveX: 0,
  moveY: 0,
  touchMoveX: 0,
  touchMoveY: 0,
  attack: false,
  touchAttack: false,
  dash: false,
  swap: false,
  interact: false,
  usingTouch: false,
  reset() {
    this.moveX = this.moveY = this.touchMoveX = this.touchMoveY = 0;
    this.attack = this.touchAttack = this.dash = this.swap = this.interact = false;
  },
};
