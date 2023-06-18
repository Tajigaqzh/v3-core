import { Dep } from "../types/index"
import { ReactiveEffect, trackOpBit } from "./effect"


export const wasTracked = (dep: Dep): boolean => (dep.w & trackOpBit) > 0

export const newTracked = (dep: Dep): boolean => (dep.n & trackOpBit) > 0

export const initDepMarkers = ({ deps }: ReactiveEffect) => {
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].w |= trackOpBit // set was tracked
        }
    }
}

export const finalizeDepMarkers = (effect: ReactiveEffect) => {
    const { deps } = effect
    if (deps.length) {
        let ptr = 0
        for (let i = 0; i < deps.length; i++) {
            const dep = deps[i]
            if (wasTracked(dep) && !newTracked(dep)) {
                dep.delete(effect)
            } else {
                deps[ptr++] = dep
            }
            // clear bits
            dep.w &= ~trackOpBit
            dep.n &= ~trackOpBit
        }
        deps.length = ptr
    }
}