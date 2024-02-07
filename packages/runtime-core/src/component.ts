import { type VNode, type VNodeChild, isVNode } from './vnode'
import {
  EffectScope,
  type ReactiveEffect,
  TrackOpTypes,
  isRef,
  markRaw,
  pauseTracking,
  proxyRefs,
  resetTracking,
  shallowReadonly,
  track,
} from "@vue/reactivity";
import {
  type ComponentPublicInstance,
  type ComponentPublicInstanceConstructor,
  PublicInstanceProxyHandlers,
  RuntimeCompiledPublicInstanceProxyHandlers,
  createDevRenderContext,
  exposePropsOnRenderContext,
  exposeSetupStateOnRenderContext,
  publicPropertiesMap,
} from './componentPublicInstance'
import {
  type ComponentPropsOptions,
  type NormalizedPropsOptions,
  initProps,
  normalizePropsOptions,
} from './componentProps'
import {
  type InternalSlots,
  type Slots,
  type SlotsType,
  type UnwrapSlotsType,
  initSlots,
} from './componentSlots'
import { warn } from './warning'
import { ErrorCodes, callWithErrorHandling, handleError } from './errorHandling'
import {
  type AppConfig,
  type AppContext,
  createAppContext,
} from './apiCreateApp'
import { type Directive, validateDirectiveName } from './directives'
import {
  type ComponentOptions,
  type ComputedOptions,
  type MethodOptions,
  applyOptions,
  resolveMergedOptions,
} from './componentOptions'
import {
  type EmitFn,
  type EmitsOptions,
  type EmitsToProps,
  type ObjectEmitsOptions,
  type ShortEmitsToObject,
  emit,
  normalizeEmitsOptions,
} from './componentEmits'
import {
  EMPTY_OBJ,
  type IfAny,
  NO,
  NOOP,
  ShapeFlags,
  extend,
  getGlobalThis,
  isArray,
  isFunction,
  isObject,
  isPromise,
  makeMap,
} from '@vue/shared'
import type { SuspenseBoundary } from './components/Suspense'
import type { CompilerOptions } from '@vue/compiler-core'
import { markAttrsAccessed } from './componentRenderUtils'
import { currentRenderingInstance } from './componentRenderContext'
import { endMeasure, startMeasure } from './profiling'
import { convertLegacyRenderFn } from './compat/renderFn'
import {
  type CompatConfig,
  globalCompatConfig,
  validateCompatConfig,
} from './compat/compatConfig'
import type { SchedulerJob } from './scheduler'
import type { LifecycleHooks } from './enums'

export type Data = Record<string, unknown>


/**
 * 实际组件类型和他的具体值匹配，可以说对象，函数
 * 如果想确切知道类型可以使用ConcreteComponent
 */

export type ConcreteComponent<
  Props = {},
  RawBindings = any,
  D = any,
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions,
  E extends EmitsOptions | Record<string, any[]> = {},
  S extends Record<string, any> = any,
> =
  | ComponentOptions<Props, RawBindings, D, C, M>
  | FunctionalComponent<Props, E, S>


export interface ComponentInternalInstance {
    uid: number
    type: ConcreteComponent
    parent: ComponentInternalInstance | null
    root: ComponentInternalInstance
    appContext: AppContext
    /**
     * Vnode representing this component in its parent's vdom tree
     */
    vnode: VNode
    /**
     * The pending new vnode from parent updates
     * @internal
     */
    next: VNode | null
    /**
     * Root vnode of this component's own vdom tree
     */
    subTree: VNode
    /**
     * Render effect instance
     */
    effect: ReactiveEffect
    /**
     * Bound effect runner to be passed to schedulers
     */
    update: SchedulerJob
    /**
     * The render function that returns vdom tree.
     * @internal
     */
    render: InternalRenderFunction | null
    /**
     * SSR render function
     * @internal
     */
    ssrRender?: Function | null
    /**
     * Object containing values this component provides for its descendants
     * @internal
     */
    provides: Data
    /**
     * Tracking reactive effects (e.g. watchers) associated with this component
     * so that they can be automatically stopped on component unmount
     * @internal
     */
    scope: EffectScope
    /**
     * cache for proxy access type to avoid hasOwnProperty calls
     * @internal
     */
    accessCache: Data | null
    /**
     * cache for render function values that rely on _ctx but won't need updates
     * after initialized (e.g. inline handlers)
     * @internal
     */
    renderCache: (Function | VNode)[]
  
    /**
     * Resolved component registry, only for components with mixins or extends
     * @internal
     */
    components: Record<string, ConcreteComponent> | null
    /**
     * Resolved directive registry, only for components with mixins or extends
     * @internal
     */
    directives: Record<string, Directive> | null
    /**
     * Resolved filters registry, v2 compat only
     * @internal
     */
    filters?: Record<string, Function>
    /**
     * resolved props options
     * @internal
     */
    propsOptions: NormalizedPropsOptions
    /**
     * resolved emits options
     * @internal
     */
    emitsOptions: ObjectEmitsOptions | null
    /**
     * resolved inheritAttrs options
     * @internal
     */
    inheritAttrs?: boolean
    /**
     * is custom element?
     * @internal
     */
    isCE?: boolean
    /**
     * custom element specific HMR method
     * @internal
     */
    ceReload?: (newStyles?: string[]) => void
  
    // the rest are only for stateful components ---------------------------------
  
    // main proxy that serves as the public instance (`this`)
    proxy: ComponentPublicInstance | null
  
    // exposed properties via expose()
    exposed: Record<string, any> | null
    exposeProxy: Record<string, any> | null
  
    /**
     * alternative proxy used only for runtime-compiled render functions using
     * `with` block
     * @internal
     */
    withProxy: ComponentPublicInstance | null
    /**
     * This is the target for the public instance proxy. It also holds properties
     * injected by user options (computed, methods etc.) and user-attached
     * custom properties (via `this.x = ...`)
     * @internal
     */
    ctx: Data
  
    // state
    data: Data
    props: Data
    attrs: Data
    slots: InternalSlots
    refs: Data
    emit: EmitFn
  
    attrsProxy: Data | null
    slotsProxy: Slots | null
  
    /**
     * used for keeping track of .once event handlers on components
     * @internal
     */
    emitted: Record<string, boolean> | null
    /**
     * used for caching the value returned from props default factory functions to
     * avoid unnecessary watcher trigger
     * @internal
     */
    propsDefaults: Data
    /**
     * setup related
     * @internal
     */
    setupState: Data
    /**
     * devtools access to additional info
     * @internal
     */
    devtoolsRawSetupState?: any
    /**
     * @internal
     */
    setupContext: SetupContext | null
  
    /**
     * suspense related
     * @internal
     */
    suspense: SuspenseBoundary | null
    /**
     * suspense pending batch id
     * @internal
     */
    suspenseId: number
    /**
     * @internal
     */
    asyncDep: Promise<any> | null
    /**
     * @internal
     */
    asyncResolved: boolean
  
    // lifecycle
    isMounted: boolean
    isUnmounted: boolean
    isDeactivated: boolean
    /**
     * @internal
     */
    [LifecycleHooks.BEFORE_CREATE]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.CREATED]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.BEFORE_MOUNT]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.MOUNTED]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.BEFORE_UPDATE]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.UPDATED]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.BEFORE_UNMOUNT]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.UNMOUNTED]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.RENDER_TRACKED]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.RENDER_TRIGGERED]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.ACTIVATED]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.DEACTIVATED]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.ERROR_CAPTURED]: LifecycleHook
    /**
     * @internal
     */
    [LifecycleHooks.SERVER_PREFETCH]: LifecycleHook<() => Promise<unknown>>
  
    /**
     * For caching bound $forceUpdate on public proxy access
     * @internal
     */
    f?: () => void
    /**
     * For caching bound $nextTick on public proxy access
     * @internal
     */
    n?: () => Promise<void>
    /**
     * `updateTeleportCssVars`
     * For updating css vars on contained teleports
     * @internal
     */
    ut?: (vars?: Record<string, string>) => void
  }

//组件 实例
export const createComponentInstance = (vnode) => {
    //就是一个对象
    const instance = { //组件 props attrs slots
        vnode,
        type: vnode.type,//组件的类型
        props: {},//组件的属性
        attrs: {},//attrs props   my-div a="1"  b="2"   props:{ "a"}  attrs
        setupState: {}, //setup返回值
        ctx: {},//代理   instance.props.name  proxy.name
        proxy: {},
        data: { a: 1 },
        render: false,
        isMounted: false// 是否挂载
    }
    instance.ctx = { _: instance }
    return instance
}

//2解析数据到组件实例上
export const setupComponent = (instance) => {
    //设置值
    const { props, children } = instance.vnode
    // 根据这props 解析到组件实例上
    // console.log(porps,55555)
    instance.props = props//initProps
    instance.children = children // slots 插槽
    let shapeFlag = instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
    if (shapeFlag) { //有状态的组件
        setUpStateComponent(instance)
    }
}
//处理setup
function setUpStateComponent(instance) {
    //代理
    instance.proxy = new Proxy(instance.ctx, componentPublicIntance as any)
    //1获取组件的类型拿到组件setup方法   参数（props,coentxt）  返回值 (对象，函数)
    let Component = instance.type
    let { setup } = Component
    //看一下这个组件有没有 setup  render
    if (setup) {
        //处理参数
        let setupContext = crateConentext(instance) //对象
        let setupResult = setup(instance.props, setupContext)
        // 问题 setup 返回值  1 对象  2 函数
        handlerSetupResult(instance, setupResult) // 如果是对象 就是值   如果是函数 就是render

    } else { //没有setup
        //调用render 
        finishComponentSetup(instance) //vnode.type
    }
    //    setup()

    //render
    Component.render(instance.proxy) // 处理render 
}
//处理setup的返回结果
function handlerSetupResult(instance, setupResult) {
    // 1 对象  2 函数
    if (isFunction(setupResult)) { //render
        instance.render = setupResult //setup 返回的函数保存 到实例 
    } else if (isObject(setupResult)) {
        instance.setupState = setupResult
    }
    //做render
    finishComponentSetup(instance)

}
//处理render
function finishComponentSetup(instance){
    //判断一下 组件中有没有这个render
    let Component = instance.type
    if(!instance.render){ //没有
    
      if(!Component.render&& Component.template){
          //模板=>render
      }
      instance.render = Component.render
    }
    // console.log( instance.render.toString()) 
}
//context
function crateConentext(instance) {
    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: () => { },
        expose: () => { }
    }
}


