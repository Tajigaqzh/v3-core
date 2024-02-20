import {ComputedRef, DebuggerOptions, isReactive, ReactiveEffect, Ref} from "@vue/reactivity";
import {EMPTY_OBJ, isFunction, isObject, NOOP} from "@vue/shared";
// import {currentInstance} from "./component"

type OnCleanup = (cleanupFn: () => void) => void;

/**
 * watch就是effect，状态会收集watchEffect，属性变化后会触发scheduler
 */
// watchEffect函数类型
export type WatchEffect = (onCleanup: OnCleanup) => void;

// watch函数的选项类型基础
export interface WatchOptionsBase extends DebuggerOptions {
	flush?: "pre" | "post" | "sync";
}

// watch函数的源类型
export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T);

// watch的回调函数类型
export type WatchCallback<V = any, OV = any> = (
	value: V,
	oldValue: OV,
	onCleanup: OnCleanup
) => any;

// watch函数的选项类型
export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
	immediate?: Immediate;
	deep?: boolean;
	once?: boolean;
}

//   watch的stop函数类型
export type WatchStopHandle = () => void

type MultiWatchSources = (WatchSource<unknown> | object)[]

type MapSources<T, Immediate> = {
	[K in keyof T]: T[K] extends WatchSource<infer V>
		? Immediate extends true
			? V | undefined
			: V
		: T[K] extends object
			? Immediate extends true
				? T[K] | undefined
				: T[K]
			: never
}

export function watch<T, Immediate extends Readonly<boolean> = false>(
	source: WatchSource<T>,
	cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
	options?: WatchOptions<Immediate>,
): WatchStopHandle

export function watch<
	T extends MultiWatchSources,
	Immediate extends Readonly<boolean> = false,
>(
	sources: [...T],
	cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
	options?: WatchOptions<Immediate>,
): WatchStopHandle

export function watch<
	T extends Readonly<MultiWatchSources>,
	Immediate extends Readonly<boolean> = false,
>(
	source: T,
	cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
	options?: WatchOptions<Immediate>,
): WatchStopHandle

export function watch<
	T extends object,
	Immediate extends Readonly<boolean> = false,
>(
	source: T,
	cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
	options?: WatchOptions<Immediate>,
): WatchStopHandle


export function watch<T = any, Immediate extends Readonly<boolean> = false>(
	source: T | WatchSource<T>,
	cb: any,
	options?: WatchOptions<Immediate>,
): WatchStopHandle {
	console.log("watch……");
	return doWatch(source as any, cb, options);
}

function doWatch(
	source: WatchSource | WatchSource[] | WatchEffect | object,
	cb: WatchCallback | null,
	{immediate, deep, flush, once, onTrack, onTrigger}: WatchOptions = EMPTY_OBJ
): WatchStopHandle {
	// if(cb && once){
	//     const _cb = cb
	//     cb = (...args) => {
	//         _cb(...args)
	//         // unwatch()
	//       }
	// }

	// const warnInvalidSource = (s: unknown) => {
	//     console.warn(`Invalid watch source: `,s)
	//   }

	//   const instance = currentInstance

	//   const instance = currentInstance

	// 下面是自己实现的

	let getter = undefined;//把getter定义一个函数，传递给ReactiveEffect的scheduler

	if (isReactive(source)) {
		getter = () => traverse(source);
		//稍后调用run的时候会执行此函数，直接返回对象，只有访问属性才能依赖收集
	} else if (isFunction(source)) {
		getter = source;
	}

	const job = () => {
		// 	内部调用cb，也就是watch的回调方法
		let newValue = effect.run();//再次调用effect，获取新值

		console.log(newValue);
		cb(newValue, oldValue,()=>{});
		oldValue = newValue;
		console.log("values", newValue,oldValue);
	}

	const effect = new ReactiveEffect(getter, NOOP, job);

	let oldValue = effect.run();//保留老的值
	console.log("oldValue",oldValue);

	return () => {
	}

}


/**
 * @private 遍历对象，触发依赖收集
 * @param value
 * @param s
 */
function traverse(value: unknown, s = new Set()) {
	if (!isObject(value)) {
		return value;
	}
	// 	如果是对象，遍历属性，触发依赖收集
	// 	考虑循环引用问题
	if (s.has(value)) {
		return value;
	}
	s.add(value);
	for (const key in value) {
		traverse(value[key], s);
	}
	return value;
}
