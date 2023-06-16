import { ReactiveFlags, Target } from "../types/reactiveType"
import { reactiveHandlers, shallowReactiveHandlers, readonlyHandlers, shallowReadonlyHandlers } from "./baseHandler"
import { isObject } from "@vue/shared"



export const reactiveMap = new WeakMap<Target, any>();
export const shallowReactiveMap = new WeakMap<Target, any>();
export const readonlyMap = new WeakMap<Target, any>();
export const shallowReadonlyMap = new WeakMap<Target, any>();

/**
 * 响应式
 */
export function reactive(target) {
    return createReactObject(target, false, reactiveHandlers, reactiveMap)
    // 使用了高阶函数，函数的返回值也是函数
}
/**
 * 浅层次响应式
 */
export function shallowReactive(target) {
    return createReactObject(target, false, shallowReactiveHandlers, shallowReactiveMap)
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

    return proxy;
}



