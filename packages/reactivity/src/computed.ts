import { NOOP, hasChanged, isFunction } from "@vue/shared";
import { DebuggerOptions, ReactiveEffect, effect, scheduleEffects } from "./effect";
import { toRaw } from "./reactive";
import { Ref, trackRefValue, triggerRefValue } from "./ref";
import { DirtyLevels, ReactiveFlags } from "./constants";
import { Dep } from "./dep";


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
export interface ComputedRef<T = any> extends WritableComputedRef<T> {
    readonly value: T
    [ComputedRefSymbol]: true
  }

//没有在视图中使用，computed不会计算，他也是一个effect，默认不执行

// export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,) {
// 	//注意  (1) 函数   （2） 对象
// 	//1 处理数据
// 	let getter: ComputedGetter<T>; //获取
// 	let setter: ComputedSetter<T>; //设置数据
// 	const onlyGetter = isFunction(getterOrOptions);

// 	if (onlyGetter) {
// 		getter = getterOrOptions;
// 		setter = () => {
// 			console.warn("computed value must be readonly");
// 		};
// 	} else {
// 		getter = getterOrOptions.get;
// 		setter = getterOrOptions.set;
// 	}
// 	//返回值
// 	return new ComputedRefImpl(getter, setter);
// }
/**
 * 计算属性内部有一个变量dirty，这个变量控制是否重新执行，默认需要重新执行，
 * 为true，执行后获取返回结果，缓存起来，再将dirty变为false，
 * 如果再次获取值，如果dirty为false，直接返回缓存的值，不需要重新执行
 */
export class ComputedRefImpl<T> {

	//依赖收集
	public dep?: Dep = undefined

	private _value!: T
	//副作用
	public readonly effect: ReactiveEffect<T>
  
	public readonly __v_isRef = true
	public readonly [ReactiveFlags.IS_READONLY]: boolean = false
  
	public _cacheable: boolean
  
	constructor(
	  getter: ComputedGetter<T>,
	  private readonly _setter: ComputedSetter<T>,
	  isReadonly: boolean,
	  isSSR: boolean,
	) {
	  this.effect = new ReactiveEffect(
		() => getter(this._value),
		() => triggerRefValue(this, DirtyLevels.MaybeDirty),
		() => this.dep && scheduleEffects(this.dep),
	  )
	  this.effect.computed = this
	  this.effect.active = this._cacheable = !isSSR
	  this[ReactiveFlags.IS_READONLY] = isReadonly
	}
  
	/**
	 * 编译后是Object.defineProperty，取值的时候才会依赖收集
	 */
	get value() {
	  // 
	  const self = toRaw(this)
	  if (!self._cacheable || self.effect.dirty) {
		if (hasChanged(self._value, (self._value = self.effect.run()!))) {
		  triggerRefValue(self, DirtyLevels.Dirty)
		}
	  }
	  trackRefValue(self)
	//   收集依赖
	  if (self.effect._dirtyLevel >= DirtyLevels.MaybeDirty) {
		triggerRefValue(self, DirtyLevels.MaybeDirty)
	  }
	  return self._value
	}
  
	set value(newValue: T) {
	  this._setter(newValue)
	}
  
	// #region polyfill _dirty for backward compatibility third party code for Vue <= 3.3.x
	get _dirty() {
	  return this.effect.dirty
	}
  
	set _dirty(v) {
	  this.effect.dirty = v
	}
	
    // public dep?: Dep = undefined
    //依赖
	//定义属性
	// public _dirty = true; //默认获取执行
	// public _value!:T;

    // // public readonly effect: ReactiveEffect<T>

    // public readonly effect;
    // public readonly __v_isRef = true
    // public readonly [ReactiveFlags.IS_READONLY]: boolean = false
  
    // public _cacheable: boolean

	// constructor(getter, public setter) {
	// 	//这个effect   默认不执行    age.value  effect 收集
	// 	this.effect = effect(getter, {
	// 		lazy: true,
	// 		sch: () => {
	// 			//修改数据的时候执行   age.value  = 20  trigger
	// 			if (!this._dirty) {
	// 				this._dirty = true;
	// 			}
	// 		},
	// 	});
	// }

	// //获取  myAge.value  =>getter 方法中的值
	// get value() {
	// 	//获取执行
	// 	if (this._dirty) {
	// 		this._value = this.effect(); //获取用户的值
	// 		this._dirty = false;
	// 	}
	// 	return this._value;
	// }
	// set value(newValue) {
	// 	this.setter(newValue);
	// }
}


export function computed<T>(
	getter: ComputedGetter<T>,
	debugOptions?: DebuggerOptions,
  ): ComputedRef<T>
  export function computed<T>(
	options: WritableComputedOptions<T>,
	debugOptions?: DebuggerOptions,
  ): WritableComputedRef<T>
  export function computed<T>(
	getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
	debugOptions?: DebuggerOptions,
	isSSR = false,
  ) {
	let getter: ComputedGetter<T>
	let setter: ComputedSetter<T>
  
	const onlyGetter = isFunction(getterOrOptions)
	if (onlyGetter) {
	  getter = getterOrOptions
	  setter = 
		 () => {
			console.warn('Write operation failed: computed value is readonly')
		  }
		
	} else {
	  getter = getterOrOptions.get
	  setter = getterOrOptions.set
	}
  
	const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR)
  
	if ( debugOptions && !isSSR) {
	  cRef.effect.onTrack = debugOptions.onTrack
	  cRef.effect.onTrigger = debugOptions.onTrigger
	}
  
	return cRef as any
  }

  