// types/three-events.d.ts
import { Object3DEventMap } from 'three';
import { InteractiveEvent } from './interaction-manager';

declare module 'three' {
  interface Object3DEventMap {
    click: InteractiveEvent;
    dblclick: InteractiveEvent;
    mouseenter: InteractiveEvent;
    mouseleave: InteractiveEvent;
    mousedown: InteractiveEvent;
    mousemove: InteractiveEvent;
    mouseup: InteractiveEvent;
    touchstart: InteractiveEvent;
    touchmove: InteractiveEvent;
    touchend: InteractiveEvent;
    pointerdown: InteractiveEvent;
    pointerup: InteractiveEvent;
    pointermove: InteractiveEvent;
    pointerover: InteractiveEvent;
    pointerout: InteractiveEvent;
  }
}
