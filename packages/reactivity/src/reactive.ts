import { def, isObject, toRawType } from "@vue/shared";
import { ReactiveFlags } from "./constants";
import {
	mutableHandlers,
	readonlyHandlers,
	shallowReactiveHandlers,
	shallowReadonlyHandlers,
} from "./baseHandler";
import {
	mutableCollectionHandlers,
	readonlyCollectionHandlers,
	shallowCollectionHandlers,
	shallowReadonlyCollectionHandlers,
} from "./collectionHandler";
import { Ref, UnwrapRefSimple } from "./ref";

export declare const RawSymbol: unique symbol;

export interface Target {
	[ReactiveFlags.SKIP]?: boolean; //不做响应式处理的数据
	[ReactiveFlags.IS_REACTIVE]?: boolean; //target是否是响应式
	[ReactiveFlags.IS_READONLY]?: boolean; //target是否是只读
	[ReactiveFlags.IS_SHALLOW]?: boolean; //是否是浅层次
	[ReactiveFlags.RAW]?: any; //proxy对应的源数据
}
export declare const ShallowReactiveMarker: unique symbol;

export type ShallowReactive<T> = T & { [ShallowReactiveMarker]?: true };

// only unwrap nested ref
export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>;

export type EffectScheduler = (...args: any[]) => any;

export type Raw<T> = T & { [RawSymbol]?: true };

export const reactiveMap = new WeakMap<Target, any>();
export const shallowReactiveMap = new WeakMap<Target, any>();
export const readonlyMap = new WeakMap<Target, any>();
export const shallowReadonlyMap = new WeakMap<Target, any>();

//泛型约束
// export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>;
/**
 * 响应式
 */
export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>;
export function reactive(target: object) {
	if (isReadonly(target)) {
		return target;
	}
	return createReactiveObject(
		target,
		false,
		mutableHandlers,
		mutableCollectionHandlers,
		reactiveMap
	);
	// 使用了高阶函数，函数的返回值也是函数
}
/**
 * 浅层次响应式
 */
export function shallowReactive<T extends object>(
	target: T
): ShallowReactive<T> {
	return createReactiveObject(
		target,
		false,
		shallowReactiveHandlers,
		shallowCollectionHandlers,
		shallowReactiveMap
	);
}

/**
 * 只读
 *  */
export function readonly(target) {
	return createReactiveObject(
		target,
		true,
		readonlyHandlers,
		readonlyCollectionHandlers,
		readonlyMap
	);
}

/**
 * 浅层只读
 */
export function shallowReadonly<T extends object>(target: T): Readonly<T> {
	return createReactiveObject(
		target,
		true,
		shallowReadonlyHandlers,
		shallowReadonlyCollectionHandlers,
		shallowReadonlyMap
	);
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
/**
 * 内部方法
 * @param value 原始值
 * @returns 
 */
export const toReactive = <T extends unknown>(value: T): T =>
	//@ts-ignore
	isObject(value) ? reactive(value) : value;

// export const toReactive = <T extends unknown>(value: T): T =>{
//     return isObject(value)? reactive(value as object) :value;
// }
//   return isObject(value) ? reactive(value) : value

/**
 * @description 创建reactive对象
 * @param target 源对象
 * @param isReadonly 是否是只读
 * @param baseHandlers 基本的handlers
 * @param collectionHandlers 主要针对set，map，weakSet，weakMap的handlers
 */
function createReactiveObject(
	target: Target,
	isReadonly: boolean,
	baseHandlers: ProxyHandler<any>,
	collectionHandlers: ProxyHandler<any>,
	proxyMap: WeakMap<Target, any>
) {
	// 不是对象直接返回提示
	if (!isObject(target)) {
		console.warn(`value cannot be made reactive: ${String(target)}`);
		return target;
	}
	//已经是就返回
	if (
		target[ReactiveFlags.RAW] &&
		!(isReadonly && target[ReactiveFlags.IS_REACTIVE])
	) {
		return target;
	}
	// 缓存中已有
	const existingProxy = proxyMap.get(target);
	if (existingProxy) {
		return existingProxy;
	}
	// 根据类型放到不同的容器中
	const targetType = getTargetType(target);

	if (targetType === TargetType.INVALID) {
		return target;
	}
	/**
	 * 当new Proxy(target, handler)时，这里的handler有两种：
    一种是针对Object、Array的baseHandlers，一种是针对集合（Set、Map、WeakMap、WeakSet）的collectionHandlers。
    对于Object、Array、集合这几种数据类型，如果使用proxy捕获它们的读取或修改操作，其实是不一样的。
    比如捕获修改操作进行依赖触发时，Object可以直接通过set（或deleteProperty）捕获器，
    而Array是可以通过pop、push等方法进行修改数组的，
    所以需要捕获它的get操作进行单独处理，
    同样对于集合来说，也需要通过捕获get方法来处理修改操作
	 */
	const proxy = new Proxy(
		target,
		targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
	);
	proxyMap.set(target, proxy);
	return proxy;
}
// function createReactObject(
// 	target: Target,
// 	isReadonly: boolean,
// 	baseHandlers: ProxyHandler<any>,
// 	proxyMap: WeakMap<Target, any>,
// 	collectionHandlers?: ProxyHandler<any>
// ) {
// 	if (!isObject(target)) {
// 		console.warn(`不是对象: ${String(target)}`);
// 		return target;
// 	}

// 	// 被加了不用代理标记或者不是（只读+响应式）
// 	if (
// 		target[ReactiveFlags.RAW] &&
// 		!(isReadonly && target[ReactiveFlags.IS_REACTIVE])
// 	) {
// 		return target;
// 	}

// 	//已有直接返回
// 	const existingProxy = proxyMap.get(target);
// 	if (existingProxy) {
// 		return existingProxy;
// 	}

// 	//没有的话就新建，并保存
// 	const proxy = new Proxy(target, baseHandlers);
// 	proxyMap.set(target, proxy);
// 	return proxy;
// }
/**
 * 判断是不是只读
 * @param value value
 * @returns boolean
 */
export function isReadonly(value: unknown): boolean {
	return !!(value && (value as Target)[ReactiveFlags.IS_READONLY]);
}
/**
 * 判断是不是reactive
 * @param value
 * @returns
 */
export function isReactive(value: unknown): boolean {
	if (isReadonly(value)) {
		return isReactive((value as Target)[ReactiveFlags.RAW]);
	}
	return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE]);
}

/**
 * 判断是不是浅层
 * @param value
 * @returns
 */
export function isShallow(value: unknown): boolean {
	return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW]);
}

/**
 * 判断是不是被代理过
 * @param value
 * @returns
 */
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
export function markRaw<T extends object>(value: T): Raw<T> {
	def(value, ReactiveFlags.SKIP, true);
	return value;
}

export const toReadonly = <T extends unknown>(value: T): T =>
	isObject(value) ? readonly(value) : value;

enum TargetType {
	INVALID = 0,
	COMMON = 1,
	COLLECTION = 2,
}
function targetTypeMap(rawType: string) {
	switch (rawType) {
		case "Object":
		case "Array":
			return TargetType.COMMON;
		case "Map":
		case "Set":
		case "WeakMap":
		case "WeakSet":
			return TargetType.COLLECTION;
		default:
			return TargetType.INVALID;
	}
}
function getTargetType(value: Target) {
	return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
		? TargetType.INVALID
		: targetTypeMap(toRawType(value));
}
