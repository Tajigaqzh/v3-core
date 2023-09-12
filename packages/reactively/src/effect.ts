// 定义effect  定义相关的属性 
//effect 收集依赖  更新视图
import { isArray, isIntegerKey } from "@vue/shared"
import { TrackOpTypes, TriggerOpTypes } from './operations'
export function effect<T = any>(fn, options: any = {}) {
    const effect = createReactEffect(fn, options)
    //判断一下
    if (!options.lazy) {
        effect() //默认执行
    }
    return effect
}
let uid = 0
let activeEffect //保存当前的effect
const effectStack = []  //定义一个栈
function createReactEffect(fn, options) {
    const effect = function reactiveEffect() { // 响应式的effect
        if (!effectStack.includes(effect)) { //保证effect 没有加入到 effectStack
            try {
                //入栈
                effectStack.push(effect)
                activeEffect = effect
                return fn() // 执行用户的方法    
            } finally { // 执行下面的方法
                //出栈
                effectStack.pop()
                activeEffect = effectStack[effectStack.length - 1]
            }
        }
    }
    effect.id = uid++;//区别effect
    effect._isEffect = true; // 区别effect 是不是响应式的effect
    effect.raw = fn;// 保存 用户的方法
    effect.options = options //保存 用户的属性
    return effect
}

//3收集effect   在获取数据的时候触发 get    收集 effect
let targetMap = new WeakMap() //创建表
export function track(target: object, type: TrackOpTypes, key: unknown) {  //1 name  =》 effect
    // console.log(target, type, key, activeEffect) //name
    //对应的key 
    // key 和我们的 effect  一一对应    map =>key =target=>属性 =》[effect] set
    if (activeEffect === undefined) { //  没有在effect 中使用
        return
    }
    // 获取effect  {target:dep}
    let depMap = targetMap.get(target)
    if (!depMap) { //没有
        targetMap.set(target, (depMap = new Map)) // 添加值
    }
    //有
    let dep = depMap.get(key) //{name:[]}
    if (!dep) { //没有属性
        depMap.set(key, (dep = new Set))
    }
    //有没有effect  key
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect) //收集effect
    }
    // console.log(targetMap)
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


//触发更新
// 1 处理对象
export function trigger(target: object, type: TriggerOpTypes, key?: unknown, newValue?: unknown, oldValue?: unknown) {
    // console.log(targetMap) //收集依赖  map  =>{target:map{key=>set}}
    console.log(target,type,key,newValue,oldValue);
    
    const depsMap = targetMap.get(target) // map
    if (!depsMap) {
        return
    }
    //有
    // let effects = depsMap.get(key) // set []
    let effectSet = new Set() //如果有多个同时修改一个值，并且相同 ，set 过滤一下
    const add = (effectAdd) => {
        if (effectAdd) {
            effectAdd.forEach(effect => effectSet.add(effect))
        }
    }
    //处理数组 就是 key === length   修改 数组的 length
    if (key === 'length' && isArray(target)) {
        depsMap.forEach((dep, key) => {
            //  console.log(depsMap,555)
            console.log(key, newValue)
            console.log(dep) // [1,2,3]   length =1
            // 如果更改 的长度 小于 收集的索引 ，那么这个索引需要重新执行 effect
            if (key === 'length' || key > newValue) {
                add(dep)
            }
        })
    } else {
        //可能是对象
        if (key != undefined) {
            add(depsMap.get(key)) //获取当前属性的effect
        }
        //数组  修改  索引
        switch (type) {
            case TriggerOpTypes.ADD:
                if (isArray(target) && isIntegerKey(key)) {
                    add(depsMap.get('length'))
                }
        }
    }
    //执行
    effectSet.forEach((effect: any) => {
        if (effect.options.sch) {
            effect.options.sch(effect)  //_drity = true
        } else {
            effect()
        }
    })

}

  //触发依赖 trigger  就是触发set 这个属性    去  收集的表中去找

  //数组 处理  vue3  直接修改  数组的长度


  //ref