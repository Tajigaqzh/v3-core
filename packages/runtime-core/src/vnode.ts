//创建 Vnode   1:createVnode  和h() 作用一样
// 2区分是组件还是元素
// 3 创建vnode
//注意： createVnode =  h('div',{style；{color:red}},[])
import { isString, ShapeFlags, isObject, isArray } from "@vue/shared";
import { RendererElement, RendererNode } from "./renderer";
import {ReactiveFlags, Ref} from "@vue/reactivity";
import { AppContext } from "./apiCreateApp";
// import { Component } from './component'

export const createVNode = (
	type,
	props,
	children = null,
	patchFlag: number = 0,
	dynamicProps: string[] | null = null,
	isBlockNode = false
) => {
	// console.log(rootComponent, rootProps,888888)
	//区分 是组件 还是 元素
	//vnode  {}
	////标识  位运算
	let shapeFlag = isString(type)
		? ShapeFlags.ELEMENT
		: isObject(type)
		? ShapeFlags.STATEFUL_COMPONENT
		: 0;
	const vnode = {
		_v_isVnode: true, //是一个vnode节点
		type,
		props,
		children,
		key: props && props.key, //diff 会用到
		el: null, //对应的真实节点
		component: {},
		shapeFlag, //判断类型
      appContext: null,
	};
	//儿子标识 h('div',{style；{color:red}},[])
	normalizeChildren(vnode, children);
	return vnode;
};

export type VNodeChild = VNodeChildAtom | VNodeArrayChildren


export type VNodeRef =
	| string
	| Ref
	| ((
	ref:  any,
	// ref: Element | ComponentPublicInstance | null,
	refs: Record<string, any>,
) => void)
type VNodeMountHook = (vnode: VNode) => void
type VNodeUpdateHook = (vnode: VNode, oldVNode: VNode) => void

export type VNodeProps = {
	key?: string | number | symbol
	ref?: VNodeRef
	ref_for?: boolean
	ref_key?: string

	// vnode hooks
	onVnodeBeforeMount?: VNodeMountHook | VNodeMountHook[]
	onVnodeMounted?: VNodeMountHook | VNodeMountHook[]
	onVnodeBeforeUpdate?: VNodeUpdateHook | VNodeUpdateHook[]
	onVnodeUpdated?: VNodeUpdateHook | VNodeUpdateHook[]
	onVnodeBeforeUnmount?: VNodeMountHook | VNodeMountHook[]
	onVnodeUnmounted?: VNodeMountHook | VNodeMountHook[]
}
export function normalizeChildren(vnode, children) {
	//进行判断
	let type = 0;
	if (children == null) {
	} else if (isArray(children)) {
		// 数组
		type = ShapeFlags.ARRAY_CHILDREN;
	} else {
		//文本
		type = ShapeFlags.TEXT_CHILDREN;
	}
	//
	vnode.shapeFlag = vnode.shapeFlag | type; // 00000100   | 00001000  =》00001100    = 12 把自己的标识和儿子的标识进行合并
}

//判断是不是一个vnode
export function isVnode(vnode) {
	return vnode._v_isVnode;
}

export const Text = Symbol.for("v-txt");

export const Comment = Symbol.for("v-cmt");
export const Static = Symbol.for("v-stc");
export const Fragment = Symbol.for('v-fgt') as any as {
	__isFragment: true
	new (): {
		$props: VNodeProps
	}
}

export function CVnode(child) {
	// [ 'text']  [h()]
	if (isObject(child)) return child;
	return createVNode(Text, null, String(child));
}

//  export type VNodeTypes =
//  | string
//  | VNode
//  | Component
//  | typeof Text
//  | typeof Static
//  | typeof Comment
//  | typeof Fragment
//  | typeof Teleport
//  | typeof TeleportImpl
//  | typeof Suspense
//  | typeof SuspenseImpl

//  export interface VNode<
//   HostNode = RendererNode,
//   HostElement = RendererElement,
//   ExtraProps = { [key: string]: any },
// > {
//   /**
//    * @internal
//    */
//   __v_isVNode: true

//   /**
//    * @internal
//    */
//   [ReactiveFlags.SKIP]: true

//   type: VNodeTypes
//   props: (VNodeProps & ExtraProps) | null
//   key: string | number | symbol | null
//   ref: VNodeNormalizedRef | null
//   /**
//    * SFC only. This is assigned on vnode creation using currentScopeId
//    * which is set alongside currentRenderingInstance.
//    */
//   scopeId: string | null
//   /**
//    * SFC only. This is assigned to:
//    * - Slot fragment vnodes with :slotted SFC styles.
//    * - Component vnodes (during patch/hydration) so that its root node can
//    *   inherit the component's slotScopeIds
//    * @internal
//    */
//   slotScopeIds: string[] | null
//   children: VNodeNormalizedChildren
//   component: ComponentInternalInstance | null
//   dirs: DirectiveBinding[] | null
//   transition: TransitionHooks<HostElement> | null

//   // DOM
//   el: HostNode | null
//   anchor: HostNode | null // fragment anchor
//   target: HostElement | null // teleport target
//   targetAnchor: HostNode | null // teleport target anchor
//   /**
//    * number of elements contained in a static vnode
//    * @internal
//    */
//   staticCount: number

//   // suspense
//   suspense: SuspenseBoundary | null
//   /**
//    * @internal
//    */
//   ssContent: VNode | null
//   /**
//    * @internal
//    */
//   ssFallback: VNode | null

//   // optimization only
//   shapeFlag: number
//   patchFlag: number
//   /**
//    * @internal
//    */
//   dynamicProps: string[] | null
//   /**
//    * @internal
//    */
//   dynamicChildren: VNode[] | null

//   // application root node only
//   appContext: AppContext | null

//   /**
//    * @internal lexical scope owner instance
//    */
//   ctx: ComponentInternalInstance | null

//   /**
//    * @internal attached by v-memo
//    */
//   memo?: any[]
//   /**
//    * @internal __COMPAT__ only
//    */
//   isCompatRoot?: true
//   /**
//    * @internal custom element interception hook
//    */
//   ce?: (instance: ComponentInternalInstance) => void
// }
export const isSameVNodeType = (n1, n2) => {
	return n1.type === n2.type && n1.key === n2.key;
};

export type RawSlots = {
	[name: string]: unknown;
	// manual render fn hint to skip forced children updates
	$stable?: boolean;
	/**
	 * for tracking slot owner instance. This is attached during
	 * normalizeChildren when the component vnode is created.
	 * @internal
	 */
	_ctx?: any | null;
	/**
	 * indicates compiler generated slots
	 * we use a reserved property instead of a vnode patchFlag because the slots
	 * object may be directly passed down to a child component in a manual
	 * render function, and the optimization hint need to be on the slot object
	 * itself to be preserved.
	 * @internal
	 */
	_?: any;
};

type VNodeChildAtom =
	| VNode
	| string
	| number
	| boolean
	| null
	| undefined
	| void;

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>;

export type VNodeNormalizedChildren =
	| string
	| VNodeArrayChildren
	| RawSlots
	| null;

export interface VNode<
	HostNode = RendererNode,
	HostElement = RendererElement,
	ExtraProps = { [key: string]: any }
> {
	/**
	 * @internal
	 */
	__v_isVNode: true;

	/**
	 * @internal
	 */
	[ReactiveFlags.SKIP]: true;

	//   type: VNodeTypes
	type: any;
	props: (any & ExtraProps) | null;
	key: string | number | symbol | null;
	ref: any | null;
	/**
	 * SFC only. This is assigned on vnode creation using currentScopeId
	 * which is set alongside currentRenderingInstance.
	 */
	scopeId: string | null;
	/**
	 * SFC only. This is assigned to:
	 * - Slot fragment vnodes with :slotted SFC styles.
	 * - Component vnodes (during patch/hydration) so that its root node can
	 *   inherit the component's slotScopeIds
	 * @internal
	 */
	slotScopeIds: string[] | null;
	children: VNodeNormalizedChildren;
	component: any | null;
	dirs: any[] | null;
	transition: any | null;

	// DOM
	el: HostNode | null;
	anchor: HostNode | null; // fragment anchor
	target: HostElement | null; // teleport target
	targetAnchor: HostNode | null; // teleport target anchor
	/**
	 * number of elements contained in a static vnode
	 * @internal
	 */
	staticCount: number;

	// suspense
	suspense: any | null;
	/**
	 * @internal
	 */
	ssContent: VNode | null;
	/**
	 * @internal
	 */
	ssFallback: VNode | null;

	// optimization only
	shapeFlag: number;
	patchFlag: number;
	/**
	 * @internal
	 */
	dynamicProps: string[] | null;
	/**
	 * @internal
	 */
	dynamicChildren: VNode[] | null;

	// application root node only
	appContext: AppContext | null;

	/**
	 * @internal lexical scope owner instance
	 */
	ctx: any | null;

	/**
	 * @internal attached by v-memo
	 */
	memo?: any[];
	/**
	 * @internal __COMPAT__ only
	 */
	isCompatRoot?: true;
	/**
	 * @internal custom element interception hook
	 */
	ce?: (instance: any) => void;
}
