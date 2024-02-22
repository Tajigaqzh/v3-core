//渲染 放在 runtime-core
import { CreateAppFunction, createAppAPI } from "./apiCreateApp";
import { NOOP, ShapeFlags } from "@vue/shared";
import {
	effect,
	reactive,
	ReactiveEffect,
	readonly,
	shallowReactive,
} from "@vue/reactivity";
import {
	CVnode,
	Text,
	VNode,
	isSameVNodeType,
	VNodeArrayChildren,
	Fragment,
} from "./vnode";
import { createComponentInstance, setUpComponent } from "./component";
import { createApp } from "@vue/runtime-dom";
import { queueJob } from "./scheduler";
import { log } from "node:console";
import { updateProps } from "./componentProps";

/**
 * 从技术上讲，渲染器节点可以是核心渲染器上下文中的任何对象
 逻辑-它们从不直接操作，总是传递给节点op
 函数是通过选项提供的，所以内部约束实际上只是
 一个通用对象。
 */
export interface RendererNode {
	[key: string]: any;
}

export type RootRenderFunction<HostElement = RendererElement> = (
	vnode: VNode | null,
	container: HostElement,
	namespace?: ElementNamespace
) => void;

export type ElementNamespace = "svg" | "mathml" | undefined;

export interface RendererElement extends RendererNode {}

//patch函数的类型声明
type PatchFn = (
	n1: VNode | null, // 为空表示初次渲染
	n2: VNode,
	container: RendererElement,
	anchor?: RendererNode | null, //插入参考标识
	parentComponent?: any | null,
	parentSuspense?: any | null,
	namespace?: ElementNamespace,
	slotScopeIds?: string[] | null,
	optimized?: boolean
) => void;
type NextFn = (vnode: VNode) => RendererNode | null;

type ProcessTextOrCommentFn = (
	n1: VNode | null,
	n2: VNode,
	container: RendererElement,
	anchor: RendererNode | null
) => void;

/**
 * render的参数类型声明
 */
export interface RendererOptions<
	HostNode = RendererNode,
	HostElement = RendererElement
> {
	// 这一部分也定义了dom操作的类型声明
	patchProp(
		el: HostElement,
		key: string,
		prevValue: any,
		nextValue: any,
		namespace?: ElementNamespace,
		prevChildren?: VNode<HostNode, HostElement>[],
		parentComponent?: any | null,
		parentSuspense?: any,
		unmountChildren?: any
	): void;

	insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void;

	remove(el: HostNode): void;

	createElement(
		type: string,
		namespace?: ElementNamespace,
		isCustomizedBuiltIn?: string,
		vnodeProps?: (any & { [key: string]: any }) | null
	): HostElement;

	createText(text: string): HostNode;

	createComment(text: string): HostNode;

	setText(node: HostNode, text: string): void;

	setElementText(node: HostElement, text: string): void;

	parentNode(node: HostNode): HostElement | null;

	nextSibling(node: HostNode): HostNode | null;

	querySelector?(selector: string): HostElement | null;

	setScopeId?(el: HostElement, id: string): void;

	cloneNode?(node: HostNode): HostNode;

	insertStaticContent?(
		content: string,
		parent: HostElement,
		anchor: HostNode | null,
		namespace: ElementNamespace,
		start?: HostNode | null,
		end?: HostNode | null
	): [HostNode, HostNode];
}

export interface Renderer<HostElement = RendererElement> {
	render: RootRenderFunction<HostElement>;
	createApp: CreateAppFunction<HostElement>;
}

function baseCreateRenderer<
	HostNode = RendererNode,
	HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>): Renderer<HostElement>;

function baseCreateRenderer(
	options: RendererOptions,
	createHydrationFns?: any
): any {
	const {
		insert: hostInsert,
		remove: hostRemove,
		patchProp: hostPatchProp,
		createElement: hostCreateElement,
		createText: hostCreateText,
		createComment: hostCreateComment,
		setText: hostSetText,
		setElementText: hostSetElementText,
		parentNode: hostParentNode,
		nextSibling: hostNextSibling,
		setScopeId: hostSetScopeId = NOOP,
		insertStaticContent: hostInsertStaticContent,
	} = options;

	// 渲染器
	/**
	 * 将虚拟节点渲染到dom中
	 * @param vnode 虚拟节点
	 * @param container 当前虚拟节点挂载的容器
	 *
	 * 步骤：
	 * 1. 卸载旧的节点
	 * 2.更新 之前渲染过了，现在再渲染，之前渲染过一次，产生了虚拟节点，再次渲染产生的虚拟节点
	 * 3.初始挂载
	 */
	const render: RootRenderFunction = (vnode, container) => {
		if (vnode == null) {
			if (container._vnode) {
				// 之前渲染过了，现在要移除掉
				unmount(container._vnode);
				// 虚拟dom中存放了真实dom
			}
			// unmount(container._vnode);
		} else {
			patch(container._vnode || null, vnode, container);
		}
		container._vnode = vnode;
	};

	/**
	 * patch，比对并挂载，diff算法
	 */
	const patch: PatchFn = (
		n1: VNode,
		n2: VNode,
		container,
		anchor = null,
		parentComponent = null
	) => {
		if (n1 === n2) {
			return;
		}

		//n1和n2是不是同一个元素，更新逻辑
		if (n1 && !isSameVNodeType(n1, n2)) {
			anchor = getNextHostNode(n1);
			unmount(n1);
			n1 = null;
		}

		const { type, shapeFlag } = n2;

		switch (type) {
			case Text:
				//处理文本
				processText(n1, n2, container, anchor);
				break;
			// 	处理<></>的情况，也即vue3不用写根div
			// 	vue2中必须有一个根节点，
			case Fragment:
				processFragment(n1, n2, container);
				break;
			default:
				if (shapeFlag & ShapeFlags.ELEMENT) {
					//div
					//处理元素 =>加载组件 一样
					processElement(n1, n2, container, anchor);
				} else if (shapeFlag & ShapeFlags.COMPONENT) {
					//组件
					processComponent(n1, n2, container, anchor, parentComponent);
				}
				break;
		}
	};

	/**
	 * 处理组件
	 * @param n1
	 * @param n2
	 * @param container
	 * @param anchor
	 */
	const processComponent = (
		n1: VNode,
		n2: VNode,
		container: RendererElement,
		anchor,
		parentComponent
	) => {
		if (n1 == null) {
			mountComponent(n2, container, anchor, parentComponent);
		} else {
			// 组件的属性变化，或者插槽变化，
			updateComponent(n1, n2, container, anchor);
		}
	};

	/**
	 * 挂载组件
	 */
	const mountComponent = (
		initialVNode: VNode,
		container: RendererElement,
		anchor,
		parentComponent
	) => {
		// 1.创建组件实例

		const instance = createComponentInstance(initialVNode);

		// 2. 启动组件，给实例赋值
		setUpComponent(instance);

		// 3.渲染组件，核心
		setupRenderEffect(instance, container, anchor);
	};

	function updatePreRender(newInstance, oldInstance) {}
	/**
	 * 渲染核心
	 * @param instance
	 */
	const setupRenderEffect = (instance, container, anchor) => {
		const componentUpdateFn = () => {
			// console.log("我被执行了");
			// 组件要渲染的虚拟节点是render函数返回的结果
			// 组件有自己的虚拟节点，返回的虚拟节点是subTree

			if (!instance.isMounted) {
				// 用户再取值的时候还要多加一层，比如proxy.props.a / proxy.attr.a /proxy.data.b
				// 为了方便用户取值，用proxy代理一下
				const subTree = instance.render.call(instance.proxy, instance.proxy); //暂时将proxy设置为状态
				// 这里有问题render的this指向不应该是state

				// 当调用render的时候会触发响应式的数据访问，进行effect的收集，所以数据变化的时候会重新触发
				// subTree就是要渲染的虚拟节点
				patch(null, subTree, container, anchor); //先渲染一次
				instance.subTree = subTree; //记录第一次的subTree
				// 完成挂载
				instance.isMounted = true;
			} else {
				console.log("组件状态变化了");
				// 在下次渲染前要更新属性，更新属性后再渲染，获取最新的虚拟dom

				if (instance.next) {
					//属性有更新

					updatePreRender(instance, instance.next);
				}
				const prevSubTree = instance.subTree;
				const nextSubTree = instance.render.call(instance.proxy, instance.proxy);

				patch(prevSubTree as any, nextSubTree, container, anchor);
				instance.subTree = nextSubTree;
			}
		};
		// 把组件update函数放到ReactiveEffect中收集依赖
		const effect = new ReactiveEffect(componentUpdateFn, NOOP, () => {
			// 可以延迟调用componentFn，用一个队列存起来延迟更新
			// 如果有重复的合并
			/**
			 * 批量更新
			 */
			queueJob(instance.update);
			// 批处理，去重
			// if (effect.dirty) {
			// 	effect.run()
			// }
		}); //对应的effect
		// effect.run()

		const update = (instance.update = effect.run.bind(effect));
		//
		update();
	};
	/**
	 * 更新组件
	 * @param n1
	 * @param n2
	 * @param container
	 */
	const updateComponent = (
		n1: VNode,
		n2: VNode,
		container: RendererElement,
		anchor
	) => {
		console.log("我被执行了");
		console.log(n1.component, n2.component);

		const instance = (n2.component = n1.component);

		// 内部props是响应式的，所以更新props就自动更新视图，vue2就是这么做的，缺点是此函数会走setupRenderEffect也会走，会触发多次

		// instance.props.message = n2.props.message

		// const oldProps = n1.props || {};
		// const newProps = n2.props || {};
		// updateProps(oldProps, newProps);
		// 调用instance处理更新逻辑，统一更新入口

		instance.next = n2;
		// 要记住n2，复用props

		// 如果需要更新的时候再更新
		if (shouldComponentUpdate(n1, n2)) {
			instance.update();
		}
		//
	};

	/**
	 * 组件有没有变化
	 * @param n1
	 * @param n2
	 * @returns
	 */
	const shouldComponentUpdate = (n1, n2) => {
		const oldProps = n1.props;
		const newProps = n2.props;

		if (oldProps == newProps) {
			return false;
		}
		return hasChange(oldProps, newProps);
	};

	const hasChange = (oldProps = {}, newProps = {}) => {
		let oldKeys = Object.keys(oldProps);
		let newKeys = Object.keys(newProps);

		if (oldKeys.length !== newKeys.length) {
			return false;
		}

		for (let i = 0; i < newKeys.length; i++) {
			const key = newKeys[i];

			if (newProps[key] !== oldProps[key]) {
				return true;
			}
		}
		return false;
	};
	/**
	 * 获取下一个根兄弟节点，用于标记anchor
	 * @param vnode
	 */
	const getNextHostNode: NextFn = (vnode) => {
		if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
			return getNextHostNode(vnode.component!.subTree);
		}
		return hostNextSibling((vnode.anchor || vnode.el)!);
	};

	/**
	 * 处理文本
	 * @param n1
	 * @param n2
	 * @param container
	 */
	const processText: ProcessTextOrCommentFn = (n1, n2, container) => {
		if (n1 == null) {
			//  创建文本  渲染到页面
			hostInsert((n2.el = hostCreateText(n2.children as string)), container);
		} else {
			let el = (n2.el = n1.el);
			if (n1.children === n2.children) {
				return;
			}
			hostSetText(el, n2.children as string);
		}
	};

	/**
	 * 处理无根div的<></>情况
	 * @param n1
	 * @param n2
	 * @param container
	 */
	const processFragment = (n1: VNode, n2: VNode, container: RendererElement) => {
		if (n1 == null) {
			// 直接挂载
			mountChildren(n2.children as VNode[], container);
		} else {
			// dom diff
			patchKeyedChildren(n1.children, n2.children, container);
		}
	};

	/**
	 * TODO - 处理元素
	 * 处理元素，分为挂载和更新
	 * @param n1
	 * @param n2
	 * @param container
	 * @param anchor
	 */
	const processElement = (
		n1: VNode,
		n2: VNode,
		container: RendererElement,
		anchor: RendererElement
	) => {
		if (n1 == null) {
			mountElement(n2, container, anchor, null);
		} else {
			//更新元素
			patchElement(n1, n2, container, anchor);
		}
	};

	/**
	 * 递归遍历虚拟节点，将其变为真实节点
	 * @param vnode
	 * @param container
	 * @param anchor
	 * @param namespace
	 */
	const mountElement = (
		vnode: VNode,
		container: RendererElement,
		anchor: RendererNode | null,
		namespace: ElementNamespace
	) => {
		let el: RendererElement;
		const { props, shapeFlag, children } = vnode;

		// 创建元素
		el = vnode.el = hostCreateElement(
			vnode.type as string,
			namespace,
			props && props.is,
			props
		);

		// 处理props
		if (props) {
			for (const key in props) {
				hostPatchProp(el, key, null, props[key]);
			}
		}

		if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			hostSetElementText(el, children as string);
		}

		if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			mountChildren(children as VNode[], el);
		}

		hostInsert(el, container, anchor);
	};

	/**
	 * 同一个元素比对
	 * @param n1
	 * @param n2
	 * @param container
	 */
	const patchElement = (n1, n2, container, anchor) => {
		//1属性  <div class style 属性> dd </div> <div class style > </div>
		//
		let el = (n2.el = n1.el); //获取真实的节点

		const oldProps = n1.props || {};
		const newProps = n2.props || {};
		patchProps(el, oldProps, newProps); //处理属性
		//比对  children
		patchChildren(n1, n2, el);
	};

	/**
	 * 比对双方的children
	 */
	const patchChildren = (n1: VNode, n2: VNode, container: RendererElement) => {
		const c1 = n1.children;
		const c2 = n2.children;
		//儿子之间  有大类4 种
		// 1 旧的有 儿子新的没有儿子   2新的有儿子旧的没有儿子 3 儿子都是 文本 4 都有儿子 并且这些儿子是数组

		//儿子都是 文本   <div class style 属性> dd </div>  <div class style > ff</div>
		/**
		 * 老的是数组，新的没儿子
		 * 老的没儿子，新的是数组
		 * 老的是文本 新的没儿子
		 * 老的是空 新的是文本
		 * 新的老的都没儿子
		 * 老儿子是文本 新的儿子是文本
		 * 老的儿子是数组 新的是文本
		 * 老的儿子是数组，新的是数组
		 *
		 * 全量diff算法  全量diff算法从根开始比对，比到最终的子节点
		 * 递归先序 深度便利 （全量diff，比较小号性能，有些节点不需要diff，vue中通过patchFlag标记类型，减少比对）
		 * 只比较动态节点，静态节点不需要比对
		 * patchFlag+blockTree，vue3的编译优化  但是只有写模板的时候才会有，手写render函数，h函数，jsx没有
		 *
		 */
		const prevShapeFlag = n1.shapeFlag; //旧的标识
		const newShapeFlag = n2.shapeFlag; //新的标识

		// 新的是文本，旧的是数组、文本、空
		if (newShapeFlag & ShapeFlags.TEXT_CHILDREN) {
			// 旧的是数组
			if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				unmountChildren(c1 as VNode[]);
			}
			// 旧的是文本或空，新的是文本
			if (c2 !== c1) {
				hostSetElementText(container, c2 as string);
			}
		} else {
			// 老的是文本或者空或者数组
			if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
					/**
					 * 旧的是数组，新的也是数组，最复杂的情况，核心diff，最复杂的情况
					 */
					patchKeyedChildren(c1, c2, container);
				} else {
					unmountChildren(c1 as VNode[]);
				}
			} else {
				// 	旧的儿子是文本或者空
				// 	新的儿子是数组或空
				if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
					hostSetElementText(container, "");
				}
				if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
					mountChildren(c2 as VNode[], container);
				}
			}
		}
	};

	const unmountChildren = (children: VNode[]) => {
		for (let i = 0; i < children.length; i++) {
			unmount(children[i]);
		}
	};
	/**
	 * 比对儿子
	 * @param c1
	 * @param c2
	 * @param el
	 */
	const patchKeyedChildren = (c1, c2, el) => {
		//vue2: 双指针   vue3:

		let i = 0;
		let e1 = c1.length - 1; //旧的最后一个索引
		let e2 = c2.length - 1; //新的最后一个索引

		// 1.sync from start :头部比对    (1) 同一位置比对（两个元素不同 停止）   2那个数组没有 停止
		// 旧的 <div> <p></p> <h1></h1>  </div>   新的 <div><p></p> <h2></h2></div>
		// (a b) c
		// (a b) d e
		while (i <= e1 && 1 <= e2) {
			const n1 = c1[i];
			const n2 = c2[i];
			if (isSameVNodeType(n1, n2)) {
				//递归
				patch(n1, n2, el);
			} else {
				break; //停止
			}
			i++; // 比对的位置
		}
		// 2.aync from end
		// a (b c)
		// d e (b c)
		while (i <= e1 && 1 <= e2) {
			const n1 = c1[e1];
			const n2 = c2[e2];
			if (isSameVNodeType(n1, n2)) {
				//递归
				patch(n1, n2, el);
			} else {
				break; //停止
			}
			e1--; // 比对的位置
			e2--;
		}

		//3. 正常顺序，mount 新增.同时处理前后
		// (a b)
		// (a b) c
		// i = 2, e1 = 1, e2 = 2
		// (a b)
		// c (a b)
		// i = 0, e1 = -1, e2 = 0
		if (i > e1) {
			// 	新的多,需要新增
			while (i <= e2) {
				const nextPos = e2 + 1;
				const anchor = nextPos < c2.length ? c2[nextPos].el : null;
				// anchor 判断是在前面插入还是在后面插入，如果e2+1小于c2的长度，说明是在前面插入，否则是在后面插入
				patch(null, c2[i], el, anchor);
				i++;
			}
		} else if (i > e2) {
			// 旧的多，需要卸载
			while (i <= e1) {
				unmount(c1[i]);
				i++;
			}
			// 	以上的部分是处理头部和尾部的情况，只是一些特殊的情况，不是所有的情况，最常见的还是乱序的情况
		} else {
			// 5. unknown sequence 乱序
			/**
			 * a b [c d e] f g
			 * a b [d c e h] f g
			 * i = 2, e1 = 4, e2 = 5
			 * 为了找到最长递增子序列，需要一个映射表，
			 * 用一个数组表示哪些节点被patch过，哪些没有被patch过
			 * 找到新的需要本patch的节点再旧的节点中的位置
			 * a b [d c e h] f g ----->[3,2,4,0]
			 */

			//此时就要考虑复用节点
			const s1 = i; //旧的需要变更的开始索引 s1 - e1  [c d e]
			const s2 = i; //新的需要变更的开始索引 s2 - e2  [d c e h]
			const keyToNewIndexMap: Map<string | number | symbol, number> = new Map();

			const toBePatched = e2 - s2 + 1; // 新的需要变更的长度，新的儿子需要有这么多个节点被patch

			const newIndexToOldIndex = new Array(toBePatched).fill(0);
			//[4,3,5,0]
			//根据新的需要被patch的长度创建一个数组

			// 以新的node的乱序的长度创建一个映射表，用旧的节点在新的乱序表中找，如果有就复用。没有就删除
			for (let i = s2; i <= e2; i++) {
				keyToNewIndexMap.set(c2[i].key, i);
			}

			for (let i = s1; i <= e1; i++) {
				const prevChild = c1[i];
				const newIndex = keyToNewIndexMap.get(prevChild.key);
				if (newIndex == undefined) {
					// 旧的有新的没有，删除
					unmount(prevChild);
				} else {
					// 原来是[0,0,0,0],
					// 让被patched过的索引用老节点的索引作为标识，加1是为了防止防止索引为0的情况污染数据，a在旧的索引为0，新的索引也为0
					/**
					 * +1是为了避免这种情况
					 * [a e f b c] m n
					 * [a b c e f] m n
					 */
					newIndexToOldIndex[newIndex - s2] = i + 1;

					// 旧的有新的也有，复用,用老的节点去比对新的节点
					patch(prevChild, c2[newIndex], el); //这里只是比较自己的的属性和儿子，并没有移动
				}
			}
			// 考虑移动问题，newIndexToOldIndex = [4,3,5,0]，0就是新增
			// console.log(newIndexToOldIndex)

			const increasingNewIndexSequence = getLongestSubSequence(newIndexToOldIndex);
			// console.log(increasingNewIndexSequence)

			let j = increasingNewIndexSequence.length - 1; //取出最后一个索引

			/**
			 * dom操作只能insertBefore，不能insertAfter，所以需要倒序插入，可以先插入新增的无法复用的节点，
			 * 再根据映射表找到可以复用的节点插入，插入顺序如下
			 * h f g
			 * e h f g
			 * c e h f g
			 * d c e h f g
			 */

			// 倒序遍历to be patched的数组，找到新增的节点，插入，toBepatched是新的需要被patch的节点的格式
			for (let i = toBePatched - 1; i >= 0; i--) {
				// s1是新vNode需要变更的开始索引，i是需要变更的节点数据的索引
				// console.log(s2 + i)//a b [d c e h] f g 输出结果是 5 4 3 2
				const currentIndex = s2 + i;
				const curNode = c2[currentIndex];
				// 获取下一个节点的位置方便insertBefore
				const anchor = c2[currentIndex + 1]?.el;

				if (newIndexToOldIndex[i] === 0) {
					// 新的节点无法被复用，直接插入
					patch(null, curNode, el, anchor);
				} else {
					//
					/**
					 * a b [c d e] f g
					 * a b [d c e h] f g
					 * 插入可以复用的节点，但是这样有一个问题，有些之前的节点没有被复用，这里插入了三次
					 * 直接使用hostInsert插入并没有复用，这里插入只需要把d插入到c的前面，c已经被复用了，只需要（移动）一下就可以了
					 * 可以实现c e 节点的复用
					 * 所以要求最长递增子序列，newIndexToOldIndex = [4,3,5,0]，0就是新增，这里存的就是在旧的节点中的索引
					 * 4 3 5
					 * 先找到4 5 或者 3 5
					 * 再把另外一个移动一下
					 */

					// 这里需要判断当前的i和j如果相等，说明是最长递增子序列，不需要移动
					if (i === increasingNewIndexSequence[j]) {
						// 如果比对发现当前这一项和序列中相等，说明是最长递增子序列，不需要移动
						j--;
					} else {
						// 元素需要移动
						hostInsert(curNode.el, el, anchor);
					}
				}
			}
		}
	};

	/**
	 * 属性比对
	 * @param el
	 * @param oldProps
	 * @param newProps
	 */
	const patchProps = (el, oldProps, newProps) => {
		//注意  ：旧：<div class style 属性>  新： <div class >
		//旧有这个属性 新的没有这个属性  {color:"red",b:''} {color:"blue",c:''}
		// 循环 新的
		if (oldProps != newProps) {
			for (let key in newProps) {
				const prev = oldProps[key];
				const next = newProps[key];
				if (prev != next) {
					//不就进行替换
					hostPatchProp(el, key, prev, next);
				}
			}
		}
	};

	/**
	 * 挂载儿子
	 * @param el
	 * @param children
	 */
	const mountChildren = (children: VNode[], el: RendererElement) => {
		//循环
		for (let i = 0; i < children.length; i++) {
			// 1[ '张三']   2 [h('div')]
			let child = CVnode(children[i]);
			//创建 文本  创建元素
			patch(null, child as VNode, el);
		}
	};

	/**
	 * 卸载
	 * @param vnode
	 */
	const unmount = (vnode: VNode) => {
		const { shapeFlag, type, children } = vnode;
		if (type === Fragment) {
			return unmountChildren(children as VNode[]);
		}
		hostRemove(vnode.el);
	};

	return {
		render,
		createApp: createAppAPI(render),
	};
}

/**
 * 最长递增子序列算法
 * @param arr
 */
function getLongestSubSequence(arr: number[]): number[] {
	// (贪心+二分查找)求个数
	const result = [0];
	const len = arr.length;
	// 忽略数组为0的情况，为0说明是新增节点

	const p = result.slice(); //复制一份，存储上一个的索引

	// 用来存储标记的索引，内容无所谓，主要是和数组的长度一致
	for (let i = 0; i < len; i++) {
		const arrI = arr[i];
		if (arrI !== 0) {
			let resultLastIndex = result[result.length - 1];
			//获取结果集中的最后一项，和arrI进行比较如果arrI大于resultLastIndex则直接push，
			// 否则二分查找找到第一个比arrI大的那一项，用arrI替换
			if (arr[resultLastIndex] < arrI) {
				result.push(i);
				p[i] = resultLastIndex; //记录上一次最后一项的索引
				continue;
			}
			//     如果arrI小于resultLastIndex则二分查找找到第一个比arrI大的那一项，用arrI替换

			let left = 0;
			let right = result.length - 1;
			while (left < right) {
				const mid = (left + right) >> 1;

				if (arr[result[mid]] < arrI) {
					left = mid + 1;
				} else {
					right = mid;
				}
			}
			p[i] = result[left - 1]; //记录，记录前一项的索引

			//start和end会重合，直接用当前的索引替换
			result[left] = i;
		}
	}

	// 实现倒序追踪
	let i = result.length; //总长度
	let last = result[result.length - 1];

	while (i-- > 0) {
		result[i] = last; //最后一项是正确的
		last = p[last]; //通过最后一项找到对应的结果，将他作为最后一项来进行追踪
	}

	return result;
}

/**
 * createRenderer函数接受两个通用参数HostNode和HostElement，它们对应于主机环境中的Node和Element类型。
 * 例如，对于运行时dom，HostNode将是dom“Node”接口，而HostElement将是dom的“Element”接口。
 * 自定义渲染器可以像这样传入特定于平台的类型
 * @param options
 */
export function createRenderer<
	HostNode = RendererNode,
	HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>) {
	return baseCreateRenderer<HostNode, HostElement>(options);
}

// 给组件 创建一个instance  添加相关信息
//  处理setup  中context  有四参数
// proxy 为方便取值

// render  (1) setup 返回值是一个函数就是render   (2) component render
// 如果  setup 的返回值 是一个函数就执行这render  源码中有一个判断

//Vue3组件初始化流程  ： 将组件变成  vnode  =》创建一个组件实例 =》在进行渲染（vnode=>dom）
