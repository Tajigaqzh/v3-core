// 拦截器

import { isObject, extend, isArray, isIntegerKey, hasOwn } from "@vue/shared"
import { reactive, readonly } from "./reactive"
import { type Target } from "../types/index"
import { track } from "./effect"
import { TrackType } from "./operations";

const get = /*#__PURE__*/ createGetter()//不是只读
const shallowReactiveGet = /*#__PURE__*/ createGetter(false, true)//不是只读，浅层次
const reandonlyGet = /*#__PURE__*/ createGetter(true)//只读，非浅层
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true)//浅层且只读

const set = /*#__PURE__*/ createSetter()
const shallowSet = /*#__PURE__*/ createSetter(true)

export const reativeHandlers = {
    get,
    set
}
export const shallowReativeHandlers = {
    get: shallowReactiveGet,
    set: shallowSet
}
// 进行合拼  
let readonlyObj = {
    set: (target, key): boolean => {
        console.warn(`set ${target} on key ${key} falied`)
        return false
    }
}
/**
 * 只读拦截器
 */
export const readonlyHandlers = extend({
    get: reandonlyGet,

}, readonlyObj)

/**
 * 浅层只读拦截器
 */
export const shallowReadonlyHandlers = extend({
    get: shallowReadonlyGet,

}, readonlyObj)


/**
 * 根据不同参数创建get，柯里化
 */
function createGetter(isReadonly = false, shallow = false) {
    return function get(target: Target, key: string | symbol, receiver: object) {
        const res = Reflect.get(target, key, receiver)
        if (!isReadonly) {
            // 收集依赖，不是只读
            track(target, TrackType.GET, key)
        }
        if (shallow) {
            return res;
        }

        if (isObject(res)) {
            /**  vue3是懒代理，嵌套多层的对象，你不使用的话，他就不会代理，比如state:{name:"zs",list:{a:b}}
             * 不这样使用的话，不对对深层次的进行代理state.list.a
            * 大大提高了性能
            */
            return isReadonly ? readonly(res) : reactive(res)
            // 嵌套
        }
        return res
    }
}
/**
 * 根据不同条件创建setter
 * @param shallow 是否是浅层的
 * @returns 
 */
function createSetter(shallow = false) {
    return function set(target: Target, key: string | symbol, value: unknown, receiver: object) {
        const result = Reflect.set(target, key, value, receiver)
        //当数据更新时候 通知对应属性的effect重新执行
        // 我们要区分是新增的 还是 修改的  vue2 里无法监控更改索引，无法监控数组的长度变化
        // =》 hack的方法  需要特殊处理
        // 注意 （1）在这里要区分是数组还是对象 （2）要区分是添加值还是重新赋值
        const oldValue = (target as any)[key]
        // 判断对象是不是数组并且key是不是整数，如果都满足判断key是否越界，不满足的话判断是否是自定义属性
        let hasKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key)

        if (!hasKey) {
            // 新增
        } else {
            // 修改
            // trigger
        }

        return result
    }
}


