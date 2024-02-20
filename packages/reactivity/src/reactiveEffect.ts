import { isArray, isIntegerKey, isMap, isSymbol } from "@vue/shared";
import { DirtyLevels } from "./constants";
import {
	activeEffect,
	pauseScheduling,
	resetScheduling,
	shouldTrack,
	trackEffect,
	triggerEffects,
} from "./effect";
import { TrackOpTypes, TriggerOpTypes } from "./constants";
import { Dep, createDep } from "./dep";

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Maps to reduce memory overhead.
//重要
type KeyToDepMap = Map<any, Dep>;

// 重要！！！！核心中的核心
const targetMap = new WeakMap<object, KeyToDepMap>();

export const ITERATE_KEY = Symbol("");

export const MAP_KEY_ITERATE_KEY = Symbol("");

/**
 * @private 用于追踪依赖
 * @param target 对象
 * @param type 追踪类型
 * @param key key
 */
export function track(target: object, type: TrackOpTypes, key: unknown) {
	/**
	 * 核心
	 * 对象a = {
	 * 		b:1//属性
	 * }
	 * weakMap(target,Map(key,Set(Dep)))
	 */
	if (shouldTrack && activeEffect) {
		let depsMap = targetMap.get(target);
		if (!depsMap) {
			targetMap.set(target, (depsMap = new Map()));
		}
		let dep = depsMap.get(key);
		if (!dep) {
			depsMap.set(key, (dep = createDep(() => depsMap!.delete(key))));
		}
		trackEffect(activeEffect, dep, void 0);
	}
}

/**
 * @private 触发依赖,通过对象找到对应的属性，让属性对应的effect执行
 * @param target 对象
 * @param type 触发类型
 * @param key key
 * @param newValue 新值
 * @param oldValue 旧值
 * @param oldTarget 旧对象
 */
export function trigger(
	target: object,
	type: TriggerOpTypes,
	key?: unknown,
	newValue?: unknown,
	oldValue?: unknown,
	oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
	const depsMap = targetMap.get(target);
	if (!depsMap) {
		// never been tracked没有被追踪过，没有副作用
		return;
	}

	let deps: (Dep | undefined)[] = [];

	if (type === TriggerOpTypes.CLEAR) {
		// collection being cleared
		// trigger all effects for target 集合被清空，获取所有副作用
		deps = [...depsMap.values()];
	} else if (key === "length" && isArray(target)) {
		const newLength = Number(newValue);
		depsMap.forEach((dep, key) => {
			if (key === "length" || (!isSymbol(key) && key >= newLength)) {
				// 数组长度变化，或者key大于新长度
				deps.push(dep);
			}
		});
	} else {
		// schedule runs for SET | ADD | DELETE
		// 设置添加和删除
		if (key !== void 0) {
			deps.push(depsMap.get(key));
		}

		// also run for iteration key on ADD | DELETE | Map.SET
		switch (type) {
			case TriggerOpTypes.ADD:
				if (!isArray(target)) {
					deps.push(depsMap.get(ITERATE_KEY));
					if (isMap(target)) {
						deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
					}
				} else if (isIntegerKey(key)) {
					// new index added to array -> length changes
					deps.push(depsMap.get("length"));
				}
				break;
			case TriggerOpTypes.DELETE:
				if (!isArray(target)) {
					deps.push(depsMap.get(ITERATE_KEY));
					if (isMap(target)) {
						deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
					}
				}
				break;
			case TriggerOpTypes.SET:
				if (isMap(target)) {
					deps.push(depsMap.get(ITERATE_KEY));
				}
				break;
		}
	}

	pauseScheduling();
	for (const dep of deps) {
		if (dep) {
			// 依赖触发,dep里面存的就是effect
			triggerEffects(dep, DirtyLevels.Dirty, void 0);
		}
	}
	resetScheduling();
}
