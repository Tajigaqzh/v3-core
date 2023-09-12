//渲染 放在 runtime-core
import { apiCreateApp } from './apiCreateApp'
import { ShapeFlags } from '@vue/shared';
import { effect } from "@vue/reactively"
import { CVnode, TEXT } from './vnode'
import { createComponentInstance, setupComponent } from './component'

export function createRender(renderOptionDom) { //实现渲染  vue3 => vnode =>render

  //获取全部的dom 操作
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProps: hostPatchProp,
    createElement: hostCreateElement, //创建元素
    createText: hostCreateText, // 创建文本
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
  } = renderOptionDom

  //
  function setupRenderEffect(instance, container) { //effect
    //创建 effect  
    effect(function componentEffect() {
      //需要创建一个effect 在effect中调用render  ,这样render  方法中获取数据会收集这个effect
      //属性改变重新执行
      //判断 第一加载
      console.log(instance);
      
      if (!instance.isMounted) {
        //获取到render 返回值
        let proxy = instance.proxy //组件的实例
        //  console.log(proxy)
        let subTree = instance.subTree = instance.render.call(proxy, proxy)  //执行 render  组件中  创建 渲染 节点  h（）
        // console.log(subTree) //组件渲染的节点  =》渲染到页面中
        //渲染子树  创建元素
        patch(null, subTree, container)
        instance.isMounted = true
      } else {
        console.log('更新')
        //比对 旧 和新
        let proxy = instance.proxy
        const prevTree = instance.subTree //旧的vnode
        const nextTree = instance.render.call(proxy, proxy)
        instance.subTree = nextTree //替换
        patch(prevTree, nextTree, container) //更新  1旧的元素  2新的元素
      }
    })
  }
  //------------------------------处理组件---------------
  const mountComponent = (InitialVnode, container) => {
    //组件的渲染流程  
    // 1.先有一个组件的实例对象  render (proxy)
    const instance = InitialVnode.component = createComponentInstance(InitialVnode)
    //2.解析数据到这个实现对象中
    setupComponent(instance)
    //3 创建一个effect 让 render函数执行
    setupRenderEffect(instance, container)
  }
  // 组件的创建
  const processComponent = (n1, n2, container) => {
    if (n1 == null) {//你是第一次加载
      mountComponent(n2, container)
    } else { //更新

    }
  }
  //------------------------处理文本------------
  function processText(n1, n2, container) {
    if (n1 == null) {
      //  创建文本  渲染到页面 =
      hostInsert(n2.el = hostCreateText(n2.children), container)
    }
  }

  //---------------------处理元素-----------
  function mountChildren(el, children) {
    //循环
    for (let i = 0; i < children.length; i++) {
      // 1[ '张三']   2 [h('div')]
      let child = CVnode(children[i])
      //创建 文本  创建元素  
      patch(null, child, el)
    }
  }
  //加载元素
  function mountElement(vnode, container) {
    //递归 渲染  h('div',{},[h('div')]) =》dom操作  =》放到对相应页面
    //vnode h()
    const { props, shapeFlag, type, children } = vnode
    //创建的元素
    let el = vnode.el = hostCreateElement(type)
    //添加属性
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key])
      }

    }
    //处理children 
    // h('div',{style:{color:'red'}},'text')
    // h('div',{style:{color:'red'}},['text'])
    // h('div',{style:{color:'red'}},[h()])
    if (children) {
      if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        //创建为文本元素
        hostSetElementText(el, children)
      } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        //递归 patch 
        mountChildren(el, children)
      }
    }
    //放到对应的位置
    hostInsert(el, container)

  }
  // 属性比对
  const patchProps = (el, oldProps, newProps) => {
    //注意  ：旧：<div class style 属性>  新： <div class >
    //旧有这个属性 新的没有这个属性  {color:"red",b:''} {color:"blue",c:''}
    // 循环 新的
    if (oldProps != newProps) {
      for (let key in newProps) {
        const prev = oldProps[key]
        const next = newProps[key]
        if (prev != next) { //不就进行替换
          hostPatchProp(el, key, prev, next)
        }
      }
    }

    //旧 如果旧的里面的属性，新没有删除这个属性
    for (let key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }
  //同一个元素比对
  const patchElement = (n1, n2, container) => {
    //1属性  <div class style 属性> dd </div> <div class style > </div>
    //
    let el = (n2.el = n1.el) //获取真实的节点
    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    patchProps(el, oldProps, newProps) //处理属性
    //比对  children
    patchChild(n1, n2, el)
  }
  //比对children
  const patchChild = (n1, n2, el) => {
    const c1 = n1.children
    const c2 = n2.children
    //儿子之间  4 种
    // 1 旧的有 儿子新的没有儿子   2新的有儿子旧的没有儿子 3 儿子都是 文本 4 都有儿子 并且这些儿子是数组

    //儿子都是 文本   <div class style 属性> dd </div>  <div class style > ff</div>
    const prevShapeFlage = n1.shapeFlag //旧的标识
    const newShapeFlage = n2.shapeFlag //新的标识
    if (newShapeFlage & ShapeFlags.TEXT_CHILDREN) { //文本情况
      hostSetElementText(el, c2)
    } else { //不是文本 就是数组（新）： 
      if (prevShapeFlage & ShapeFlags.ARRAY_CHILDREN) { //之前的是数组
        //儿子都有 数组
        patchkeyChild(c1, c2, el)
      } else { //旧的就是文本
        //将旧的文本删除
        hostSetElementText(el, '')   //删除文本
        //添加 新数组，添加儿子
        // console.log(c2,66666)
        mountChildren(el, c2)
      }
    }

  }
  //方法  儿子都是数组的情况
  const patchkeyChild = (c1, c2, el) => {
    //vue2: 双指针   vue3:


    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    //sync from start :头部比对    (1) 同一位置比对（两个元素不同 停止）   2那个数组没有 停止
    // 旧的 <div> <p></p> <h1></h1>  </div>   新的 <div><p></p> <h2></h2></div>
    while (i <= e1 && 1 <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVode(n1, n2)) { //递归
        patch(n1, n2, el)
      } else {
        break;//停止
      }
      i++// 比对的位置
    }
    // aync from end
    while (i <= e1 && 1 <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVode(n1, n2)) { //递归
        patch(n1, n2, el)
      } else {
        break;//停止
      }
      e1--// 比对的位置
      e2--
    }

  }
  function processElement(n1, n2, container) {
    if (n1 == null) {

      mountElement(n2, container)
    } else {//更新
      //同一个元素
      console.log('同一个元素比对')
      patchElement(n1, n2, container)
    }
  }
  //---------------------------------------
  const isSameVode = (n1, n2) => { //判断是不是同一个元素
    return n1.type == n2.type && n1.key == n2.key
  }

  const unmount = (vnode) => {
    console.log(vnode, 555)
    hostRemove(vnode.el)
  }
  const patch = (n1, n2, container) => {
    //针对不同的类型  1 组件   2 元素  3文本
    //比对  vue3 : 1 判断是不是同一个元素  2同一个元素  （1 props children）
    //判断是不是同一个元素
    if (n1 && !isSameVode(n1, n2)) {
      unmount(n1) //删除元素
      n1 = null   //组件重新加载
    }
    let { shapeFlag, type } = n2
    switch (type) {
      case TEXT:
        //处理文本
        processText(n1, n2, container)
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) { //div
        
          //处理元素 =》加载组件 一样
          processElement(n1, n2, container)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          //组件
          processComponent(n1, n2, container)
        }
    }

  }
  // 返回 对象
  let render = (vnode, container) => { //渲染 
    //组件初始化 
    //   console.log(vnode)  //vnode
    //渲染  第一次   第二次
    patch(null, vnode, container) // 1 旧的节点  2 当前节点  3 位置
  }
  return {
    createApp: apiCreateApp(render) // 1创建 vnode  在框架种 组件操作 =vnode=》render()
  }
}


// 给组件 创建一个instance  添加相关信息
//  处理setup  中context  有四参数
// proxy 为方便取值


// render  (1) setup 返回值是一个函数就是render   (2) component render
// 如果  setup 的返回值 是一个函数就执行这render  源码中有一个判断

//Vue3组件初始化流程  ： 将组件变成  vnode  =》创建一个组件实例 =》在进行渲染（vnode=>dom）