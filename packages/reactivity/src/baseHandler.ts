import {
    isObject,
    isArray,
    isIntegerKey,
    hasOwn,
    hasChanged,
    isSymbol,
    makeMap,
} from "@vue/shared";
import {
    isReadonly,
    isShallow,
    reactive,
    readonly,
    readonlyMap,
    shallowReactiveMap,
    shallowReadonlyMap,
    toRaw,
    reactiveMap,
    Target,
} from "./reactive";
import {ReactiveFlags, TrackOpTypes, TriggerOpTypes} from "./constants";
import {ITERATE_KEY, track, trigger} from "./reactiveEffect";
import {isRef} from "./ref";
import {warn} from "./warning";
import {
    pauseScheduling,
    pauseTracking,
    resetScheduling,
    resetTracking,
} from "./effect";
// 拦截器

// const get = /*#__PURE__*/ createGetter()//不是只读
// const shallowReactiveGet = /*#__PURE__*/ createGetter(false, true)//不是只读，浅层次
// const reandonlyGet = /*#__PURE__*/ createGetter(true)//只读，非浅层
// const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true)//浅层且只读

// const set = /*#__PURE__*/ createSetter();
// const shallowSet = /*#__PURE__*/ createSetter(true);

// export const shallowReadonlyHandlers =
//   /*#__PURE__*/ new ReadonlyReactiveHandler(true)

// export const reativeHandlers = {
//     get,
//     set
// }
// export const shallowReativeHandlers = {
//     get: shallowReactiveGet,
//     set: shallowSet
// }
// 进行合拼
// let readonlyObj = {
//     set: (target, key): boolean => {
//         console.warn(`set ${target} on key ${key} falied`)
//         return false
//     }
// }
/**
 * 只读拦截器
 */
// export const readonlyHandlers = extend({
//     get: reandonlyGet,

// }, readonlyObj)

// /**
//  * 浅层只读拦截器
//  */
// export const shallowReadonlyHandlers = extend({
//     get: shallowReadonlyGet,

// }, readonlyObj)

/**
 * 根据不同参数创建get，柯里化
 */
// function createGetter(isReadonly = false, shallow = false) {
//     return function get(target: Target, key: string | symbol, receiver: object) {
//         const res = Reflect.get(target, key, receiver);
//         if (!isReadonly) {
//             // 收集依赖，不是只读
//             track(target, TrackOpTypes.GET, key);
//         }
//         if (shallow) {
//             return res;
//         }
//         if (isObject(res)) {
//             /**  vue3是懒代理，嵌套多层的对象，你不使用的话，他就不会代理，比如state:{name:"zs",list:{a:b}}
//              * 不这样使用的话，不对对深层次的进行代理state.list.a大大提高了性能
//             */
//             return isReadonly ? readonly(res) : reactive(res)// 递归
//         }
//         return res
//     }
// }
/**
 * 根据不同条件创建setter
 * @param shallow 是否是浅层的
 * @returns
 */
// function createSetter(shallow = false) {
//     return function set(target: Target, key: string | symbol, value: unknown, receiver: object) {
//         //当数据更新时候 通知对应属性的effect重新执行
//         // 我们要区分是新增的 还是 修改的  vue2 里无法监控更改索引，无法监控数组的长度变化
//         // 注意 （1）在这里要区分是数组还是对象 （2）要区分是添加值还是重新赋值
//         let oldValue = (target as any)[key]
//         // 判断对象是不是数组并且key是不是整数，如果都满足判断key是否小于数组长度（小于代表是修改，不是新增），
//         // 不满足的话判断是否是自定义属性
//         const hasKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
//         const result = Reflect.set(target, key, value, receiver)
//         if (!hasKey) {
//             // 新增
//             trigger(target, TriggerOpTypes.ADD, key, value)
//         } else {
//             // 修改,先判断新值和旧值是否一致
//             if (hasChanged(value, oldValue)) {
//                 //触发更新
//                 trigger(target, TriggerOpTypes.SET, key, value, oldValue)
//             }
//         }
//         return result
//     }
// }

const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`);

const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations();


/**
 * arrayInstrumentations：要特殊处理的数组方法：
 * includes、indexOf、lastIndexOf
 * push、pop、shift、unshift、splice。
 * 以push为例，ECMAScript当向arr中进行push操作，首先读取到arr.length，将length对应的依赖effect收集起来，
 * 由于push操作会设置length，所以在设置length的过程中会触发length的依赖(执行effect.run())，
 * 而在effect.run()中会执行this.fn()，又会调用arr.push操作，这样就会造成一个死循环。

 * 为了解决这两个问题，需要重写这几个方法
 */
function createArrayInstrumentations() {
    const instrumentations: Record<string, Function> = {};
    // instrument identity-sensitive Array methods to account for possible reactive
    // values
    (["includes", "indexOf", "lastIndexOf"] as const).forEach((key) => {
        instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
            const arr = toRaw(this) as any;
            for (let i = 0, l = this.length; i < l; i++) {
                track(arr, TrackOpTypes.GET, i + "");
            }
            // we run the method using the original args first (which may be reactive)
            const res = arr[key](...args);
            if (res === -1 || res === false) {
                // if that didn't work, run it again using raw values.
                return arr[key](...args.map(toRaw));
            } else {
                return res;
            }
        };
    });
    // instrument length-altering mutation methods to avoid length being tracked
    // which leads to infinite loops in some cases (#2137)
    (["push", "pop", "shift", "unshift", "splice"] as const).forEach((key) => {
        instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
            pauseTracking();
            pauseScheduling();
            const res = (toRaw(this) as any)[key].apply(this, args);
            resetScheduling();
            resetTracking();
            return res;
        };
    });
    return instrumentations;
}

const builtInSymbols = new Set(
    /*#__PURE__*/
    Object.getOwnPropertyNames(Symbol)
        // ios10.x Object.getOwnPropertyNames（Symbol）
        // 可以枚举“arguments”和“caller”，但在Symbol上访问它们会导致TypeError，因为Symbol是一个严格的模式函数
        .filter((key) => key !== "arguments" && key !== "caller")
        .map((key) => (Symbol as any)[key])
        .filter(isSymbol)
);

function hasOwnProperty(this: object, key: string) {
    const obj = toRaw(this);
    track(obj, TrackOpTypes.HAS, key);
    return obj.hasOwnProperty(key);
}

/**
 * 基础的拦截器
 */
class BaseReactiveHandler implements ProxyHandler<Target> {
    constructor(
        protected readonly _isReadonly = false,
        protected readonly _shallow = false
    ) {
    }

    get(target: Target, key: string | symbol, receiver: object) {
        const isReadonly = this._isReadonly,
            shallow = this._shallow;
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly;
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly;
        } else if (key === ReactiveFlags.IS_SHALLOW) {
            return shallow;
        } else if (key === ReactiveFlags.RAW) {
            if (
                receiver ===
                (isReadonly
                        ? shallow
                            ? shallowReadonlyMap
                            : readonlyMap
                        : shallow
                            ? shallowReactiveMap
                            : reactiveMap
                ).get(target) ||
                // receiver is not the reactive proxy, but has the same prototype
                // this means the reciever is a user proxy of the reactive proxy
                Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
            ) {
                return target;
            }
            // early return undefined
            return;
        }

        const targetIsArray = isArray(target);

        if (!isReadonly) {
            if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
                return Reflect.get(arrayInstrumentations, key, receiver);
            }
            if (key === "hasOwnProperty") {
                return hasOwnProperty;
            }
        }

        const res = Reflect.get(target, key, receiver);

        if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
            return res;
        }

        if (!isReadonly) {
            track(target, TrackOpTypes.GET, key);
        }

        if (shallow) {
            return res;
        }

        if (isRef(res)) {
            // ref unwrapping - skip unwrap for Array + integer key.
            return targetIsArray && isIntegerKey(key) ? res : res.value;
        }

        if (isObject(res)) {
            // Convert returned value into a proxy as well. we do the isObject check
            // here to avoid invalid value warning. Also need to lazy access readonly
            // and reactive here to avoid circular dependency.
            return isReadonly ? readonly(res) : reactive(res);
        }

        return res;
    }
}

/**
 * 可变数据拦截器
 */
class MutableReactiveHandler extends BaseReactiveHandler {
    constructor(shallow = false) {
        super(false, shallow);
    }

    set(
        target: object,
        key: string | symbol,
        value: unknown,
        receiver: object
    ): boolean {
        //旧值
        let oldValue = (target as any)[key];
        //不是浅层的
        if (!this._shallow) {
            //旧的是不是只读的
            const isOldValueReadonly = isReadonly(oldValue);
            //新的不是浅层并且不是只读
            if (!isShallow(value) && !isReadonly(value)) {
                // reactive
                oldValue = toRaw(oldValue);
                value = toRaw(value);
            }
            // 如果不是数组，旧的是ref，新的不是ref
            if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                if (isOldValueReadonly) {
                    return false;
                } else {
                    oldValue.value = value;
                    return true;
                }
            }
        } else {
            // in shallow mode, objects are set as-is regardless of reactive or not
        }

        //如果是数组，key是数字的话key，判断key是否小于数组长度；key不是数字，判断是不是自定义属性
        const hadKey =
            isArray(target) && isIntegerKey(key)
                ? Number(key) < target.length
                : hasOwn(target, key);
        //判断是新增还是修改，true的话就是修改，


        const result = Reflect.set(target, key, value, receiver);
        // 如果目标是原始原型链中的某个东西，则不要触发
        if (target === toRaw(receiver)) {
            if (!hadKey) {
                trigger(target, TriggerOpTypes.ADD, key, value);
            } else if (hasChanged(value, oldValue)) {
                trigger(target, TriggerOpTypes.SET, key, value, oldValue);
            }
        }
        return result;
    }

    deleteProperty(target: object, key: string | symbol): boolean {
        const hadKey = hasOwn(target, key);
        const oldValue = (target as any)[key];
        const result = Reflect.deleteProperty(target, key);
        if (result && hadKey) {
            trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);
        }
        return result;
    }

    has(target: object, key: string | symbol): boolean {
        const result = Reflect.has(target, key);
        if (!isSymbol(key) || !builtInSymbols.has(key)) {
            track(target, TrackOpTypes.HAS, key);
        }
        return result;
    }

    //迭代器
    ownKeys(target: object): (string | symbol)[] {
        track(target, TrackOpTypes.ITERATE, isArray(target) ? "length" : ITERATE_KEY);
        return Reflect.ownKeys(target);
    }
}

/**
 * 只读的拦截器
 */
class ReadonlyReactiveHandler extends BaseReactiveHandler {
    constructor(shallow = false) {
        super(true, shallow);
    }

    set(target: object, key: string | symbol) {
        warn(
            `Set operation on key "${String(key)}" failed: target is readonly.`,
            target
        );

        return true;
    }

    deleteProperty(target: object, key: string | symbol) {
        warn(
            `Delete operation on key "${String(key)}" failed: target is readonly.`,
            target
        );

        return true;
    }
}

export const mutableHandlers: ProxyHandler<object> =
    /*#__PURE__*/ new MutableReactiveHandler();

export const readonlyHandlers: ProxyHandler<object> =
    /*#__PURE__*/ new ReadonlyReactiveHandler();

export const shallowReactiveHandlers = /*#__PURE__*/ new MutableReactiveHandler(
    true
);
export const shallowReadonlyHandlers =
    /*#__PURE__*/ new ReadonlyReactiveHandler(true);
