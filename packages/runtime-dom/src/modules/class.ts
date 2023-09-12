import { ElementWithTransition } from "../components/transition";

export function patchClass(el: Element, value: string | null, isSVG: boolean) {
    // 直接设置classNam理论上应该比设置属性快，如果这个元素在经历过渡，考虑临时过渡class
    const transitionClasses = (el as ElementWithTransition)._vtc
    if (transitionClasses) {
        value = (
            value ? [value, ...transitionClasses] : [...transitionClasses]
        ).join(' ')
    }

    if (value == null) {
        // 删除class
        el.removeAttribute('class')
    } else if (isSVG) {
        // svg
        el.setAttribute('class', value)
    } else {
        // 设置class
        el.className = value
    }
}

