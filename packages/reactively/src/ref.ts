// 对简单数据类型实现代理
declare const RefSymbol: unique symbol;

export interface Ref<T = any> {
    value: T,
    [RefSymbol]: true
}
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>;

export function isRef(r: any): r is Ref {
    return !!(r && r.__v_isRef === true);
}