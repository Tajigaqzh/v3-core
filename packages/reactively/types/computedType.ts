import { Ref } from "./refType"

declare const ComputedRefSymbol: unique symbol

export interface ComputedRef<T = any> extends WritableComputedRef<T> {
    readonly value: T
    [ComputedRefSymbol]: true
}

export interface WritableComputedRef<T> extends Ref<T> {
    readonly effect
}

export interface WritableComputedOptions<T> {
    get: ComputedGetter<T>
    set: ComputedSetter<T>
  }

export type ComputedGetter<T> = (...args: any[]) => T
export type ComputedSetter<T> = (v: T) => void
