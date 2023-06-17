import { TrackOpTypes, TriggerOpTypes } from "./operations"


export function effect<T = any>(fn: () => T, options: any = {}) {
    // //我们需要这个effect变成响应式的effct，可以做到数据变化重新执行
    const effect = createReactEffect(fn, options)

    //(1)响应式的effect默认会先执行一次
    if (!options.lazy) {
        effect()
    }
    // 否则直接返回该函数
    return effect
}

//创建响应式effect
//(1)添加属性   id  和 _iseffect用于区分他是响应式的effect   raw(用于保存用户的方法) ，options 再effect
//(2) 默认执行一次



let uid = 0
let activeEffect;//保存当前的副作用函数
const effectStack = []//创建一个栈，存放副作用
// 工厂函数，柯里化
function createReactEffect(fn, options) {
    //注意：这个方法返回的是一个函数，闭包
    const effect = function reactiveEffect() {
        if (!effectStack.includes(effect)) { //保证effect没有加入到effectStack
            try {  //语句用于处理代码中可能出现的错误信息。
                //入栈
                effectStack.push(effect)
                activeEffect = effect
                // console.log('todo.....')   //默认执行 用户的写的方法
                // 这个effect 是有返回结果的

                fn(); // 函数执行时会取值操作 会执行get 方法的
            } finally {
                //出栈 
                effectStack.pop()
                activeEffect = effectStack[effectStack.length - 1]
            }
        }
    }
    effect.id = uid++//区别effect
    effect._isEffect = true//区分是不是响应式的
    effect._raw = fn//保存用户的方法
    effect._options = options//保存用户的属性
    return effect
}

/**
 * 收集effect
 * */
let targetMap = new WeakMap()////创建表
export function track(target: object, type: TrackOpTypes, key: unknown) {
    if (activeEffect === undefined) {// 没有在effect 中使用
        return
    }
    // 获取effect,{target:dep},dep是一个map
    let depMap = targetMap.get(target)
    if (!depMap) {//没有
        targetMap.set(target, (depMap = new Map()))//{target:map}
    }
    // 有
    let dep = depMap.get(key)//{name:[]}

    if (!dep) {// 没有属性
        depMap.set(key, (dep = new Set()))
    }
    //有没有effect  key
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect)//收集effect
    }

}

/**
 * 触发依赖更新
 */
export function trigger(
    target: object,
    type: TriggerOpTypes,
    key?: unknown,
    newValue?: unknown,
    oldValue?: unknown,
    oldTarget?: Map<unknown, unknown> | Set<unknown>) {

}
