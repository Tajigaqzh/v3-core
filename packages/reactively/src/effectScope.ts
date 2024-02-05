import { ReactiveEffect } from "./effect"

export class EffectScope{
     /**
   * @internal
   */
  private _active = true
  /**
   * @internal
   */
  effects: ReactiveEffect[] = []
  /**
   * @internal
   */
  cleanups: (() => void)[] = []
}