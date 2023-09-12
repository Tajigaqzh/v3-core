import { reativeHandlers, shallowReativeHandlers, readonlyHandlers, shallowReadonlyHandlers } from "./baseHandler"
import { isObject } from "@vue/shared"
import { ReactiveFlags, UnwrapNestedRefs, type ShallowReactive, type Target } from "../types/index"

export const reactiveMap = new WeakMap<Target, any>();
export const shallowReactiveMap = new WeakMap<Target, any>();
export const readonlyMap = new WeakMap<Target, any>();
export const shallowReadonlyMap = new WeakMap<Target, any>();


//泛型约束
export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>;
/**
 * 响应式
 */
export function reactive(target: object) {
    return createReactObject(target, false, reativeHandlers, reactiveMap)
    // 使用了高阶函数，函数的返回值也是函数
}
/**
 * 浅层次响应式
 */
export function shallowReactive<T extends object>(target: T): ShallowReactive<T> {
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
export function shallowReadonly<T extends object>(target: T): Readonly<T> {
    return createReactObject(target, true, shallowReadonlyHandlers, shallowReadonlyMap)
}
/**
 * 变成原始对象
 * @param observed 
 * @returns 
 */
export function toRaw<T>(observed: T): T {
    const raw = observed && (observed as Target)[ReactiveFlags.RAW];
    return raw ? toRaw(raw) : observed;
}

// export const toReactive = <T extends unknown>(value: T): T =>
//   isObject(value) ? reactive(value) : value

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

export function isReactive(value: unknown): boolean {
    if (isReadonly(value)) {
        return isReactive((value as Target)[ReactiveFlags.RAW]);
    }
    return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE]);
}
export function isShallow(value: unknown): boolean {
    return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW]);
}

export function isProxy(value: unknown): boolean {
    return isReactive(value) || isReadonly(value);
}

/*
面试响应式api的proxy和ref区别
proxy 、懒执行（性能优化）

vuex 5 state  getter actions mutations
计算属性
state响应式，通过vue的proxy代理
getter计算属性缓存，this拿到里面的值是 通过代理实现的
action、mutations发布订阅模式

分模块，作用域，所有模块都会扔到一个里面去，找到对应的执行


vue2+vue3  高阶函数，柯里化（通过参数来不同的逻辑）、结构的处理、设计模式
*/