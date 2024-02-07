// 对简单数据类型实现代理
// ref，普通对象的响应式
// 返回RefImpl实例对象，属性：value和_value

import { IfAny, hasChanged, isArray, isFunction } from "@vue/shared";

import {
	activeEffect,
	shouldTrack,
	trackEffect,
	triggerEffects,
} from "./effect";
import {

	isReactive,
	isReadonly,
	isShallow,
	toRaw,
	toReactive,
} from "./reactive";

import { DirtyLevels, TrackOpTypes, TriggerOpTypes } from "./constants";
import { ComputedRef, ComputedRefImpl } from "./computed";
import { Dep, createDep } from "./dep";

declare const RefSymbol: unique symbol
export declare const RawSymbol: unique symbol
export declare const ShallowReactiveMarker: unique symbol;

export type MaybeRef<T = any> = T | Ref<T>;
export type MaybeRefOrGetter<T = any> = MaybeRef<T> | (() => T);

export interface Ref<T = any> {
	value: T;
	/**
	 * 仅仅是一个类型区分器，我们需要它在public d.ts中，但是不想在IDE自动补全中显示，
	 * 所以我们使用一个私有的Symbol
	 */
	[RefSymbol]: true;
}

export type ToRefs<T = any> = {
	[K in keyof T]: ToRef<T[K]>;
};

declare const ShallowRefMarker: unique symbol;
export type ShallowRef<T = any> = Ref<T> & { [ShallowRefMarker]?: true };

type DistrubuteRef<T> = T extends Ref<infer V> ? V : T;

export type ShallowUnwrapRef<T> = {
	[K in keyof T]: DistrubuteRef<T[K]>;
};

export type CustomRefFactory<T> = (
	track: () => void,
	trigger: () => void
) => {
	get: () => T;
	set: (value: T) => void;
};

type BaseTypes = string | number | boolean;
export interface RefUnwrapBailTypes {}

export type UnwrapRef<T> = T extends ShallowRef<infer V>
	? V
	: T extends Ref<infer V>
	? UnwrapRefSimple<V>
	: UnwrapRefSimple<T>;

export type UnwrapRefSimple<T> = T extends
	| Function
	| BaseTypes
	| Ref
	| RefUnwrapBailTypes[keyof RefUnwrapBailTypes]
	| { [RawSymbol]?: true }
	? T
	: T extends Map<infer K, infer V>
	? Map<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Map<any, any>>>
	: T extends WeakMap<infer K, infer V>
	? WeakMap<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof WeakMap<any, any>>>
	: T extends Set<infer V>
	? Set<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Set<any>>>
	: T extends WeakSet<infer V>
	? WeakSet<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof WeakSet<any>>>
	: T extends ReadonlyArray<any>
	? { [K in keyof T]: UnwrapRefSimple<T[K]> }
	: T extends object & { [ShallowReactiveMarker]?: never }
	? {
			[P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>;
	  }
	: T;

export type ToRef<T> = IfAny<T, Ref<T>, [T] extends [Ref] ? T : Ref<T>>;

// export let shouldTrack = true;
// export let activeEffect: ReactiveEffect | undefined;

// 方法类型限制
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>;

// isref定义
export function isRef(r: any): r is Ref {
	return !!(r && r.__v_isRef === true);
}

//ref方法类型限制重载
export function ref<T extends object>(
	value: T
): [T] extends [Ref] ? T : Ref<UnwrapRef<T>>;
export function ref<T>(value: T): Ref<UnwrapRef<T>>;
export function ref<T = any>(): Ref<T | undefined>;

//ref定义
export function ref(value?: unknown) {
	return createRef(value, false);
}

//shallowRef的方法重载
export function shallowRef<T extends object>(
	value: T
): T extends Ref ? T : ShallowRef<T>;
export function shallowRef<T>(value: T): ShallowRef<T>;
export function shallowRef<T = any>(): ShallowRef<T | undefined>;

//shallowRef，把isShallow状态设置为true
export function shallowRef(value?: unknown) {
	return createRef(value, true);
}

export function toRef<T extends object, K extends keyof T>(
	object: T,
	key: K
): ToRef<T[K]>;
export function toRef<T extends object, K extends keyof T>(
	object: T,
	key: K,
	defaultValue: T[K]
): ToRef<Exclude<T[K], undefined>>;

// toref
export function toRef<T extends object, K extends keyof T>(
	object: T,
	key: K,
	defaultValue?: T[K]
): ToRef<T[K]> {
	//从对象上取key
	const val = object[key];
	//是ref对象直接返回，不是再使用ObjectRefImpl(不会收集和触发依赖，但是可以获取到副作用函数集合)进行代理
	return isRef(val)
		? val
		: (new ObjectRefImpl(object, key, defaultValue) as any);
}

export function toRefs<T extends object>(object: T): ToRefs<T> {
	const ret: any = isArray(object) ? new Array(object.length) : {};
	for (const key in object) {
		ret[key] = toRef(object, key);
	}
	return ret;
}
/**
 * 创建ref的方法，根据不同参数创建
 * @param rawValue 原始对象
 * @param shallow 是否是浅层次
 * @returns RefImpl
 */
function createRef(rawValue: unknown, shallow: boolean) {
	//如果是ref则直接返回
	if (isRef(rawValue)) {
		return rawValue;
	}
	//如果是浅层次则返回浅层次的ref
	return new RefImpl(rawValue, shallow);
}
class RefImpl<T> {
	//私有属性value，真正.value读取的就是_value，.value改的也是_value
	// private _value: T;
	//私有属性原始对象
	// private _rawValue: T;

	private _value: T;
	private _rawValue: T;

	public dep?: Dep = undefined;
	public readonly __v_isRef = true;

	constructor(value: T, public readonly __v_isShallow: boolean) {
		//保存原始值
		// this._rawValue = __v_isShallow ? value : toRaw(value);
		//保存值
		// this._value = value;

		this._rawValue = __v_isShallow ? value : toRaw(value);
		this._value = __v_isShallow ? value : toReactive(value);
	}

	get value() {
		// 收集依赖
		trackRefValue(this);
		// track(this, TrackOpTypes.GET, "value");
		return this._value;
	}
	set value(newVal) {
		//ANCHOR - 指令

		const useDirectValue =
			this.__v_isShallow || isShallow(newVal) || isReadonly(newVal);
		newVal = useDirectValue ? newVal : toRaw(newVal);

		if (hasChanged(newVal, this._value)) {
			this._rawValue = newVal;
			this._value = useDirectValue ? newVal : toReactive(newVal);
			//触发依赖
			triggerRefValue(this, DirtyLevels.Dirty, newVal);
			// trigger(this, TriggerOpTypes.SET, "value", newValue);
		}
	}
}
/**
 * objectRef实现，没有收集依赖
 */
class ObjectRefImpl<T extends object, K extends keyof T> {
	public readonly __v_isRef = true;

	constructor(
		private readonly _object: T,
		private readonly _key: K,
		private readonly _defaultValue?: T[K]
	) {}

	get value() {
		const val = this._object[this._key];
		return val === undefined ? (this._defaultValue as T[K]) : val;
	}

	set value(newVal) {
		this._object[this._key] = newVal;
	}
}

class CustomRefImpl<T> {
	public dep?: Dep = undefined;

	private readonly _get: ReturnType<CustomRefFactory<T>>["get"];
	private readonly _set: ReturnType<CustomRefFactory<T>>["set"];

	public readonly __v_isRef = true;

	constructor(factory: CustomRefFactory<T>) {
		const { get, set } = factory(
			() => trackRefValue(this),
			() => triggerRefValue(this)
		);
		this._get = get;
		this._set = set;
	}

	get value() {
		return this._get();
	}

	set value(newVal) {
		this._set(newVal);
	}
}

type RefBase<T> = {
	dep?: Dep;
	value: T;
};

export function trackRefValue(ref: RefBase<any>) {
	if (shouldTrack && activeEffect) {
		ref = toRaw(ref);
		trackEffect(
			activeEffect,
			ref.dep ||
				(ref.dep = createDep(
					() => (ref.dep = undefined),
					ref instanceof ComputedRefImpl ? ref : undefined
				)),
			{
				target: ref,
				type: TrackOpTypes.GET,
				key: "value",
			}
		);
	}
}

export function triggerRefValue(
	ref: RefBase<any>,
	dirtyLevel: DirtyLevels = DirtyLevels.Dirty,
	newVal?: any
) {
	ref = toRaw(ref);
	const dep = ref.dep;
	if (dep) {
		triggerEffects(dep, dirtyLevel, {
			target: ref,
			type: TriggerOpTypes.SET,
			key: "value",
			newValue: newVal,
		});
	}
}

export function unref<T>(ref: MaybeRef<T> | ComputedRef<T>): T {
	return isRef(ref) ? ref.value : ref;
}

export function toValue<T>(source: MaybeRefOrGetter<T> | ComputedRef<T>): T {
	return isFunction(source) ? source() : unref(source);
}

const shallowUnwrapHandlers: ProxyHandler<any> = {
	get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
	set: (target, key, value, receiver) => {
		const oldValue = target[key];
		if (isRef(oldValue) && !isRef(value)) {
			oldValue.value = value;
			return true;
		} else {
			return Reflect.set(target, key, value, receiver);
		}
	},
};

export function proxyRefs<T extends object>(
	objectWithRefs: T
): ShallowUnwrapRef<T> {
	return isReactive(objectWithRefs)
		? objectWithRefs
		: new Proxy(objectWithRefs, shallowUnwrapHandlers);
}

export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
	return new CustomRefImpl(factory) as any;
}

export function triggerRef(ref: Ref) {
	triggerRefValue(ref, DirtyLevels.Dirty, ref.value);
}
