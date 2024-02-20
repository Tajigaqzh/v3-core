import { ReactiveEffect } from "./effect"

// 当前激活的作用域
let activeEffectScope: EffectScope | undefined

/**
 * 把effect存到scope中
 * @see ReactiveEffect.constructor
 * @param effect 当前effect
 * @param scope 父级作用域
 */
export function recordEffectScope(
  effect: ReactiveEffect,
  scope: EffectScope | undefined = activeEffectScope,
) {
  if (scope && scope.active) {
    scope.effects.push(effect)
  }
}

/**
 * 应用。在组件中应用了一堆副作用，比如计算属性，侦听器等
 * 在组件销毁时，需要停止所有副作用
 * 可以创建一个 effect 作用域，可以捕获其中所创建的响应式副作用 (即计算属性和侦听器)，这样捕获到的副作用可以一起处理
 *
 */
export class EffectScope{
  /**
   * @internal 该scope中的副作用默认激活
   */
  private _active = true
  /**
   * @internal 该scope中的所有
   */
  effects: ReactiveEffect[] = []
  /**
   * @internal 清楚函数
   */
  cleanups: (() => void)[] = []
  parent: EffectScope | undefined//父scope
  scopes: EffectScope[] | undefined //子scope

  /**
   * 上面两个属性是为了处理scope的嵌套关系
   * const scope1 = new EffectScope();
   * scope1.run(()=>{
   *     //...
   *     effect(()=>{
   *        //...
   *     })
   *     const scope2 = new EffectScope();
   *     scope2.run(()=>{
   *       //...
   *       effect(()=>{
   *          //...
   *       })
   *     })
   * })

   */

  /**
   * @internal 当前scope在父scope中的索引
   * @private
   */
  private index: number | undefined
  
  constructor(public detached = false) {
    // 构建的时候先设置父scope
    this.parent = activeEffectScope
    // 如果当前scope是激活的，将当前scope挂到activeEffectScope的scopes中
    if (!detached && activeEffectScope) {
      this.index =
        (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(
          this,
        ) - 1
    }
  }
  get active() {
    return this._active
  }

  run<T>(fn: () => T): T | undefined {
    if (this._active) {//如果当前scope是激活的

      const currentEffectScope = activeEffectScope
      // 设置当前激活的作用域

      try {
        activeEffectScope = this
        // 将当前scope挂到全局变量上
        return fn()
        //运行里面记录的effect
      } finally {
        // 恢复之前的激活作用域
        activeEffectScope = currentEffectScope
      }
    }
  }

  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    activeEffectScope = this
  }

  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    activeEffectScope = this.parent
  }

  /**
   * 停止scope
   * @param fromParent 是否是通过父级停止的
   */
  stop(fromParent?: boolean) {
    if (this._active) {
      let i, l
      for (i = 0, l = this.effects.length; i < l; i++) {
        // 停止所有的effect
        this.effects[i].stop()
      }
      // 清除所有的清除函数
      for (i = 0, l = this.cleanups.length; i < l; i++) {
        this.cleanups[i]()
      }
      // 如果有子scope，停止子scope
      if (this.scopes) {
        for (i = 0, l = this.scopes.length; i < l; i++) {
          this.scopes[i].stop(true)
        }
      }
      // 嵌套作用域，从父级取消引用以避免内存泄漏，如果detached为true，并且不是从父级停止的，也要从父级取消引用
      if (!this.detached && this.parent && !fromParent) {
        // optimized O(1) removal
        const last = this.parent.scopes!.pop()
        if (last && last !== this) {
          this.parent.scopes![this.index!] = last
          last.index = this.index!
        }
      }
      // 把父亲置为undefined
      this.parent = undefined
      this._active = false
    }
  }
}
/**
 * pinia中就使用了effectScope
 * 创建一个 effect 作用域，可以捕获其中所创建的响应式副作用 (即计算属性和侦听器)，这样捕获到的副作用可以一起处理
 * @param detached 
 * @returns 
 */
export function effectScope(detached?: boolean) {
  return new EffectScope(detached)
}
export function getCurrentScope() {
  return activeEffectScope
}

export function onScopeDispose(fn: () => void) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  }
}