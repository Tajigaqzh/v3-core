export interface ReactiveEffectOptions {
    lazy?: boolean

}

export class ReactiveEffect<T = any>{
    active = true
    deps: []

}