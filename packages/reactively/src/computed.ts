import { NOOP, isFunction } from "@vue/shared";
import { ComputedGetter, ComputedRef, ComputedSetter, DebuggerOptions, ReactiveFlags, WritableComputedOptions, WritableComputedRef } from "../types";
import { ReactiveEffect } from "./effect";

// 方法重载
export function computed<T>(
    getter: ComputedGetter<T>,
    debugOptions?: DebuggerOptions
): ComputedRef<T>
export function computed<T>(
    options: WritableComputedOptions<T>,
    debugOptions?: DebuggerOptions
): WritableComputedRef<T>

export function computed<T>(
    getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
    debugOptions?: DebuggerOptions,
    isSSR = false
) {
    //定义setter和setter
    let getter: ComputedGetter<T>
    let setter: ComputedSetter<T>

    //判断getterOrOptions是否是函数
    const onlyGetter = isFunction(getterOrOptions)
    if (onlyGetter) {
        getter = getterOrOptions
        setter = NOOP
    } else {
        getter = getterOrOptions.get
        setter = getterOrOptions.set
    }
    return new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR) as any
}

export class ComputedRefImpl<T>{
    // 缓存的值
    private _value!: T

    //标记为一个ref类型
    public readonly __v_isRef = true

    // 在构造器中创建的ReactiveEffect实例
    public readonly effect: ReactiveEffect<T>

    // 只读标识
    public readonly [ReactiveFlags.IS_READONLY]: boolean = false

    // 是否为脏数据，如果是脏数据需要重新计算
    public _dirty = true


    constructor(
        //getter
        getter: ComputedGetter<T>,
        //setter，只读
        private readonly _setter: ComputedSetter<T>,
        isReadonly: boolean,
        isSSR: boolean
    ) {
        this.effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true
                //有脏数据触发依赖更新
                // triggerRefValue(this)
            }
        })

    }
}