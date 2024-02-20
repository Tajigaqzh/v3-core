// 定义effect  定义相关的属性
//effect 收集依赖  更新视图
import { NOOP, extend, isArray, isIntegerKey } from "@vue/shared";
import { EffectScope, recordEffectScope } from "./effectScope";
import { ComputedRefImpl } from "./computed";
import { DirtyLevels, TrackOpTypes, TriggerOpTypes } from "./constants";
import { EffectScheduler } from "./reactive";
import { Dep } from "./dep";

// template编译后是节点，节点在effect中执行。
// 属性会收集依赖effect，当属性变化时，会触发effect


export type DebuggerEvent = {
	effect: ReactiveEffect;
} & DebuggerEventExtraInfo;


export interface DebuggerOptions {
	onTrack?: (event: DebuggerEvent) => void;
	onTrigger?: (event: DebuggerEvent) => void;
}

export interface ReactiveEffectRunner<T = any> {
	(): T;
	effect: ReactiveEffect;
}

export interface ReactiveEffectOptions extends DebuggerOptions {
	lazy?: boolean;//是否懒执行，computed就是懒执行的
	scheduler?: EffectScheduler;//调度器，用于调度effect，比如watch，watchEffect，computed
	scope?: EffectScope;
	allowRecurse?: boolean;
	onStop?: () => void; //停止的回调
}

export type DebuggerEventExtraInfo = {
	target: object;
	type: TrackOpTypes | TriggerOpTypes;
	key: any;
	newValue?: any;
	oldValue?: any;
	oldTarget?: Map<any, any> | Set<any>;
};

export interface ReactiveEffectOptions {
	lazy?: boolean;
	scheduler?: EffectScheduler;
	scope?: EffectScope;
	allowRecurse?: boolean;
	onStop?: () => void;
}

export let shouldTrack = true;
// 正在执行的effect，重要！！！！，标记当前正在执行的effect，用于处理effect嵌套问题，effect前后执行顺序
export let activeEffect: ReactiveEffect | undefined;

export let pauseScheduleStack = 0;





/**
 * 响应式的核心
 * 理解，effect默认立即执行一次传入的函数，数据变化再次执行函数，
 * 一个带状态的组件会被放到effect中，可以实现数据变化，组件重新渲染
 *
 * computed是一个特殊的effect，它其实是一个带缓存的effect，
 * watchEffect是一个特殊的effect，它的fn是一个函数，它的scheduler是一个函数，当它的依赖变化时，会调用scheduler函数
 * watch是一个特殊的effect，它的fn是一个函数，它的scheduler是一个函数，当它的依赖变化时，会调用scheduler函数
 * watch返回stop函数，可以停止watch，也是利用effect的stop方法
 *
 * 根据给定的函数追踪响应式更新，初始的时候执行一次，后期响应式数据更新的时候执行
 * @param fn 传递的函数
 * @param options 配置
 * @returns
 */
export function effect<T = any>(
	fn: () => T,
	options?: ReactiveEffectOptions
): ReactiveEffectRunner {
	if ((fn as ReactiveEffectRunner).effect instanceof ReactiveEffect) {
		fn = (fn as ReactiveEffectRunner).effect.fn;
	}
	// 创建一个响应式的effect，并且执行一次，使用ReactiveEffect类的原因，是因为这个类有很多属性和方法，方便扩展，还做了一些类的标识
	const _effect = new ReactiveEffect(fn, NOOP, () => {
		if (_effect.dirty) {
			_effect.run();
		}
	});
	if (options) {
		extend(_effect, options);
		if (options.scope) recordEffectScope(_effect, options.scope);
	}
	// 默认执行
	if (!options || !options.lazy) {
		_effect.run();
	}
	// 返回一个执行器函数
	const runner = _effect.run.bind(_effect) as ReactiveEffectRunner;
	// 函数的属性effect就是effect
	runner.effect = _effect;
	return runner;
}

//问题  (1) effect 式一个树型结构
// effect(()=>{ // effect1  [effect1]
//     //
//     state.name  //收集的 effect1
//     effect(()=>{ //effect2
//        state.age   //effect2
//     })
//   state.a // 收集effect1
//   state.a++ // 10 11  effect1
// })

//   根据 你写的项目  vue   vuex =>  4 state   getter  actions  mutations    actions:[]
//  this.c   源码  高阶函数  类似于  柯里化   （1） 结构的处理   （2）  设计模式

//触发依赖 trigger  就是触发set 这个属性    去  收集的表中去找
//数组 处理  vue3  直接修改  数组的长度

// 重要！！！
export class ReactiveEffect<T = any> {
	// 是否激活，默认激活，当调用stop方法时，active为false
	active = true;
	deps: Dep[] = [];

	/**
	 * Can be attached after creation
	 * @internal
	 */
	computed?: ComputedRefImpl<T>;
	/**
	 * @internal
	 */
	allowRecurse?: boolean;

	// stop的回调方法，当停止的时候，如果有这个方法，就执行
	onStop?: () => void;
	// dev only
	onTrack?: (event: DebuggerEvent) => void;
	// dev only
	onTrigger?: (event: DebuggerEvent) => void;

	/**
	 * @internal
	 */
	_dirtyLevel = DirtyLevels.Dirty;
	/**
	 * @internal
	 */
	_trackId = 0;
	/**
	 * @internal
	 */
	_runnings = 0;
	/**
	 * @internal
	 */
	_shouldSchedule = false;
	/**
	 * @internal
	 */
	_depsLength = 0;

	constructor(
		public fn: () => T,
		// 加public等价于在类中定义了一个属性，同时在构造函数中初始化了这个属性，属性 public fn；this.fn = fn;
		public trigger: () => void,
		// 其他同理
		public scheduler?: EffectScheduler,//调度器，用于调度effect，比如watch，watchEffect，computed
		scope?: EffectScope //当前effect所在的作用域
	) {
		recordEffectScope(this, scope);
	}

	/**
	 * dirty属性的获取器，用于判断effect是否需要重新执行，便于computed的缓存
	 */
	public get dirty() {
		if (this._dirtyLevel === DirtyLevels.MaybeDirty) {
			pauseTracking();
			for (let i = 0; i < this._depsLength; i++) {
				const dep = this.deps[i];
				if (dep.computed) {
					triggerComputed(dep.computed);
					if (this._dirtyLevel >= DirtyLevels.Dirty) {
						break;
					}
				}
			}
			if (this._dirtyLevel < DirtyLevels.Dirty) {
				this._dirtyLevel = DirtyLevels.NotDirty;
			}
			resetTracking();
		}
		return this._dirtyLevel >= DirtyLevels.Dirty;
	}

	/**
	 * dirty属性的设置器，用于设置effect的dirty状态
	 * @param v
	 */
	public set dirty(v) {
		this._dirtyLevel = v ? DirtyLevels.Dirty : DirtyLevels.NotDirty;
	}

	// 执行effect
	run() {
		this._dirtyLevel = DirtyLevels.NotDirty;
		if (!this.active) {
			return this.fn();
		}
		let lastShouldTrack = shouldTrack;

		let lastEffect = activeEffect;//activeEffect 如果不嵌套只有一层的话，activeEffect第一次就是undefined
		try {
			shouldTrack = true;
			// 保存当前的effect实例为activeEffect，处理effect嵌套问题，也可以让其他函数知道当前的effect执行中，促发响应式数据的变化
			/**
			 * effect(()=>{  1. e1
			 *     app.innerHTML = state.age
			 *     effect(()=>{  2. e2
			 *     	   app.innerHTML = state.name
			 *     })
			 *     app.innerHTML = state.address
			 *     age->e1
			 *     name->e2
			 *     address->null
			 *     如果不处理的话state.name变化为state.address时，不会更新，执行到（app.innerHTML = state.address）这一行时
			 *     address的effect就找不到了
			 *
			 *     用一个activeEffect来保存当前正在执行的effect，可以很好地解决这些问题
			 *     vue2用了一个栈结构来保存当前正在执行的watcher，也即effect
			 *     stack   = [e1]
			 *     e2执行时，stack = [e1,e2]
			 *     e2执行完毕后，e2弹出栈，stack = [e1]
			 *     e1执行完毕后，e1弹出栈，stack = []
			 *
			 *     vue3用了一个activeEffect来保存当前正在执行的watcher，也即effect，更省内存，也更好理解
			 * })
			 * effect(()=>{ 3.
			 *    state.name = 13
			 * })
			 */
			activeEffect = this;
			this._runnings++;
			// 预先清楚effect的deps依赖
			preCleanupEffect(this);
			return this.fn();
		} finally {
			// 清除effect所有的deps依赖，不再收集依赖
			postCleanupEffect(this);
			this._runnings--;
			// 不嵌套的话，activeEffect重置为undefined，嵌套的话，activeEffect重置为上一个effect
			activeEffect = lastEffect;
			shouldTrack = lastShouldTrack;
		}
	}

	/**
	 * 停止effect，并去除依赖收集
	 */
	stop() {
		if (this.active) {
			preCleanupEffect(this);
			postCleanupEffect(this);
			this.onStop?.();
			this.active = false;
		}
	}
}

/**
 * 收集dep对应的effect，先判断是否已经收集过，如果没有收集过，就收集，如果新的effect中的dep长度有变化
 * 就清除多余的dep   effect和dep关系，dep里面存的是effect
 * @param effect
 * @param dep
 * @param debuggerEventExtraInfo
 */
export function trackEffect(
	effect: ReactiveEffect,
	dep: Dep,
	debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
	if (dep.get(effect) !== effect._trackId) {
		dep.set(effect, effect._trackId);
		const oldDep = effect.deps[effect._depsLength];
		if (oldDep !== dep) {
			if (oldDep) {
				/**
				 * @see cleanupDepEffect
				 * @see ../test/clearup.html
				 * 之前有收集过dep，清除多余的dep
				 * */
				cleanupDepEffect(oldDep, effect);
			}
			effect.deps[effect._depsLength++] = dep;
		} else {
			effect._depsLength++;
		}
	}
}

/**
 * 触发依赖
 * @param dep 
 * @param dirtyLevel 
 * @param debuggerEventExtraInfo 
 */
export function triggerEffects(
	dep: Dep,
	dirtyLevel: DirtyLevels,
	debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
	pauseScheduling();
	for (const effect of dep.keys()) {
		if (effect._dirtyLevel < dirtyLevel && dep.get(effect) === effect._trackId) {
			const lastDirtyLevel = effect._dirtyLevel;
			effect._dirtyLevel = dirtyLevel;
			if (lastDirtyLevel === DirtyLevels.NotDirty) {
				effect._shouldSchedule = true;
				effect.trigger();
			}
		}
	}
	// 带调度器的更新，用于watch，watchEffect，computed
	scheduleEffects(dep);
	resetScheduling();
}

//调度数组
const queueEffectSchedulers: EffectScheduler[] = [];

/**
 * 暂停调度
 */
export function pauseScheduling() {
	pauseScheduleStack++;
}


/**
 * 把queueEffectSchedulers调度队列里的调度函数依次执行
 */
export function resetScheduling() {
	pauseScheduleStack--;
	while (!pauseScheduleStack && queueEffectSchedulers.length) {
		queueEffectSchedulers.shift()!();
	}
}

/**
 * 带调度器的更新，用于watch，watchEffect，computed
 * @param dep
 */
export function scheduleEffects(dep: Dep) {
	for (const effect of dep.keys()) {
		if (
			effect.scheduler &&
			effect._shouldSchedule &&
			(!effect._runnings || effect.allowRecurse) &&
			dep.get(effect) === effect._trackId
		) {
			effect._shouldSchedule = false;
			// 调度的时候把调度函数放入队列
			queueEffectSchedulers.push(effect.scheduler);
		}
	}
}

const trackStack: boolean[] = [];

/**
 * 重新开启effect追踪（如果它被暂停的话）
 */
export function enableTracking() {
	trackStack.push(shouldTrack);
	shouldTrack = true;
}

/**
 * 临时禁用effect追踪
 */
export function pauseTracking() {
	trackStack.push(shouldTrack);
	shouldTrack = false;
}

/**
 * 重新开启effect追踪
 */
export function resetTracking() {
	const last = trackStack.pop();
	shouldTrack = last === undefined ? true : last;
}

function triggerComputed(computed: ComputedRefImpl<any>) {
	return computed.value;
}

/**
 * 该函数用于预先清楚effect的deps依赖
 * 把trackId加1，用于重新track时，清楚上一波收集的effect，让dep中的effect为最新的effect
 * 将depsLength置为0，用于清除effect所有的deps依赖，不再收集依赖
 * @param effect
 */
function preCleanupEffect(effect: ReactiveEffect) {
	effect._trackId++;
	effect._depsLength = 0;
}

/**
 * 清除effect所有的deps依赖，不再收集依赖
 * @see stop
 * @see ReactiveEffect.stop()
 * @param effect effect实例
 */
function postCleanupEffect(effect: ReactiveEffect) {
	if (effect.deps && effect.deps.length > effect._depsLength) {
		for (let i = effect._depsLength; i < effect.deps.length; i++) {
			cleanupDepEffect(effect.deps[i], effect);
		}
		effect.deps.length = effect._depsLength;
	}
}

/**
 * 该函数用于重新track时，清楚上一波收集的effect，让dep中的effect为最新的effect
 * 删除dep中的指定的effect，解决03clearup.html中的问题。
 * @param dep
 * @param effect
 */
function cleanupDepEffect(dep: Dep, effect: ReactiveEffect) {
	// 使用forEach和for(let i = 0;i++;i<length)这两种方法删除会死循环
	// 解决方法,1.拷贝一份
	// 2.倒叙删除
	// 3.下面这种方法记录一个id
	const trackId = dep.get(effect);
	if (trackId !== undefined && effect._trackId !== trackId) {
		dep.delete(effect);
		if (dep.size === 0) {
			dep.cleanup();
		}
	}
}

/**
 * 停止effect方法
 * @param runner effect执行器
 */
export function stop(runner: ReactiveEffectRunner) {
	runner.effect.stop();
}
