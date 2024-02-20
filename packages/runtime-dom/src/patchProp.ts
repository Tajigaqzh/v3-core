//属性 操作

//策略模式    div  class ='box'   calss = 'box2'style a=1 onClick=      {style；{color:"red"}} =>  {style；{background:"red"}}
import { patchClass } from './modules/class'
import { patchStyle } from './modules/style'
import { patchAttr } from './modules/attrs'
import { patchEvent } from './modules/events'
import { RendererOptions } from '@vue/runtime-core'

type DOMRendererOptions = RendererOptions<Node, Element>

export const patchProp:DOMRendererOptions['patchProp'] = (el, key, prevValue, nextValue) => {
  switch (key) {
    case 'class':
      patchClass(el, nextValue, false)
      break;
    case "style":
      patchStyle(el, prevValue, nextValue)
      break;
    default:
      if (/^on[^a-z]/.test(key)) { //是不是事件  onClick
        patchEvent(el, key, nextValue)
      } else {
        patchAttr(el, key, nextValue,false)
      }
      break;
  }
}