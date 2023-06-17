import { reativeHandlers, shallowReativeHandlers, readonlyHandlers, shallowReadonlyHandlers } from "./baseHandler"
import { isObject } from "@vue/shared"
import { ReactiveFlags, type Target } from "../types/index"

export const reactiveMap = new WeakMap<Target, any>();
export const shallowReactiveMap = new WeakMap<Target, any>();
export const readonlyMap = new WeakMap<Target, any>();
export const shallowReadonlyMap = new WeakMap<Target, any>();

/**
 * 响应式
 */
export function reactive(target) {
    return createReactObject(target, false, reativeHandlers, reactiveMap)
    // 使用了高阶函数，函数的返回值也是函数
}
/**
 * 浅层次响应式
 */
export function shallowReactive(target) {
    return createReactObject(target, false, shallowReativeHandlers, shallowReactiveMap)
}

/**
 * 只读
 *  */
export function readonly(target) {
    return createReactObject(target, true, readonlyHandlers, readonlyMap)
}

/**
 * 浅层只读
 */
export function shallowReadonly(target) {
    return createReactObject(target, true, shallowReadonlyHandlers, shallowReadonlyMap)
}

/**
 * 创建reactive对象的函数
 * 柯里化好处，复用逻辑，根据不同参数产生不同代理对象
 * @param target 原始对象
 * @param isReadonly 是否只读 
 * @param baseHandlers 基础拦截器，用于拦截object，普通对象，数组
 */
function createReactObject(target: Target, isReadonly: boolean, baseHandlers: ProxyHandler<any>, proxyMap: WeakMap<Target, any>) {
    if (!isObject(target)) {
        return target
    }

    // 被加了不用代理标记或者不是（只读+响应式）
    if (
        target[ReactiveFlags.RAW] &&
        !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
    ) {
        return target;
    }

    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy;
    }


    const proxy = new Proxy(target, baseHandlers)
    proxyMap.set(target, proxy)
    return proxy;
}


export function isReadonly(value: unknown): boolean {
    return !!(value && (value as Target)[ReactiveFlags.IS_READONLY]);
}













// export const enum ReactiveFlags {
//     //跳过
//     SKIP = "__v_skip",
//     //是否是响应式
//     IS_REACTIVE = "__v_isReactive",
//     //是否是只读
//     IS_READONLY = "__v_isReadonly",
//     //是否是浅层次
//     IS_SHALLOW = "__v_isShallow",
//     //proxy对应的源数据
//     RAW = "__v_raw",
// }

// export interface Target {
//     [ReactiveFlags.SKIP]?: boolean; //不做响应式处理的数据
//     [ReactiveFlags.IS_REACTIVE]?: boolean; //target是否是响应式
//     [ReactiveFlags.IS_READONLY]?: boolean; //target是否是只读
//     [ReactiveFlags.IS_SHALLOW]?: boolean; //是否是浅层次
//     [ReactiveFlags.RAW]?: any; //proxy对应的源数据
// }