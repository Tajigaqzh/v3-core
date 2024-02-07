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
type KeyToDepMap = Map<any, Dep>;
const targetMap = new WeakMap<object, KeyToDepMap>();

export const ITERATE_KEY = Symbol("");
export const MAP_KEY_ITERATE_KEY = Symbol("");

export function track(target: object, type: TrackOpTypes, key: unknown) {
	if (shouldTrack && activeEffect) {
		let depsMap = targetMap.get(target);
		if (!depsMap) {
			targetMap.set(target, (depsMap = new Map()));
		}
		let dep = depsMap.get(key);
		if (!dep) {
			depsMap.set(key, (dep = createDep(() => depsMap!.delete(key))));
		}
		trackEffect(activeEffect, dep, {
			target,
			type,
			key,
		});
	}
}

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
		// never been tracked
		return;
	}

	let deps: (Dep | undefined)[] = [];
	if (type === TriggerOpTypes.CLEAR) {
		// collection being cleared
		// trigger all effects for target
		deps = [...depsMap.values()];
	} else if (key === "length" && isArray(target)) {
		const newLength = Number(newValue);
		depsMap.forEach((dep, key) => {
			if (key === "length" || (!isSymbol(key) && key >= newLength)) {
				deps.push(dep);
			}
		});
	} else {
		// schedule runs for SET | ADD | DELETE
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
			triggerEffects(dep, DirtyLevels.Dirty, {
				target,
				type,
				key,
				newValue,
				oldValue,
				oldTarget,
			});
		}
	}
	resetScheduling();
}
