// 对简单数据类型实现代理
// ref，普通对象的响应式，原理就是Object.defineProperty为什么不使用proxy，因为proxy只能代理对象
// 返回RefImpl实例对象，属性：value和_value

import { hasChanged, isArray } from "@vue/shared";
import { ShallowRef, type Ref, type UnwrapRef, type ToRef, type ToRefs } from "../types";
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOpTypes } from "./operations";
import { toRaw, } from "./reactive";

// 方法类型限制
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>;

// isref定义
export function isRef(r: any): r is Ref {
    return !!(r && r.__v_isRef === true);
}

//ref方法类型限制重载
export function ref<T extends object>(value: T): [T] extends [Ref] ? T : Ref<UnwrapRef<T>>;
export function ref<T>(value: T): Ref<UnwrapRef<T>>;
export function ref<T = any>(): Ref<T | undefined>;

//ref定义
export function ref(value?: unknown) {
    return createRef(value, false);
}

//shallowRef的方法重载
export function shallowRef<T extends object>(value: T): T extends Ref ? T : ShallowRef<T>;
export function shallowRef<T>(value: T): ShallowRef<T>;
export function shallowRef<T = any>(): ShallowRef<T | undefined>;

//shallowRef，把isShallow状态设置为true
export function shallowRef(value?: unknown) {
    return createRef(value, true);
}

export function toRef<T extends object, K extends keyof T>(object: T,key: K): ToRef<T[K]>;
export function toRef<T extends object, K extends keyof T>(object: T,key: K,defaultValue: T[K]): ToRef<Exclude<T[K], undefined>>;

// toref
export function toRef<T extends object, K extends keyof T>(object: T,key: K,defaultValue?: T[K]): ToRef<T[K]> {
	//从对象上取key
	const val = object[key];
	//是ref对象直接返回，不是再使用ObjectRefImpl(不会收集和触发依赖，但是可以获取到副作用函数集合)进行代理
	return isRef(val)? val: (new ObjectRefImpl(object, key, defaultValue) as any);
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
class RefImpl<T>{
    //私有属性value，真正.value读取的就是_value，.value改的也是_value
    private _value: T;
    //私有属性原始对象
    private _rawValue: T;

    constructor(value: T, public readonly __v_isShallow: boolean) {
        //保存原始值
        this._rawValue = __v_isShallow ? value : toRaw(value);
        //保存值
        this._value = value
    }

    get value(){
        // 收集依赖
        track(this,TrackOpTypes.GET,"value")
        return this._value
    }
    set value(newValue){
        if (hasChanged(newValue,this._value)) {
            this._value = newValue
            this._rawValue = newValue
            trigger(this,TriggerOpTypes.SET,"value",newValue)
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
	) { }

	get value() {
		const val = this._object[this._key];
		return val === undefined ? (this._defaultValue as T[K]) : val;
	}

	set value(newVal) {
		this._object[this._key] = newVal;
	}
}

