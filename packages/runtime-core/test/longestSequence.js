export function getLongestSubSequence(arr) {
    // (贪心+二分查找)求个数
    const result = [0];
    const len = arr.length;
    // 忽略数组为0的情况，为0说明是新增节点

    const p = result.slice();

    // 用来存储标记的索引，内容无所谓，主要是和数组的长度一致
    for (let i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            let resultLastIndex = result[result.length - 1]
            //获取结果集中的最后一项，和arrI进行比较如果arrI大于resultLastIndex则直接push，
            // 否则二分查找找到第一个比arrI大的那一项，用arrI替换
            if (arr[resultLastIndex] < arrI) {
                result.push(i);
                p[i] = resultLastIndex;//记录上一次最后一项的索引
                continue;
            }
            //     如果arrI小于resultLastIndex则二分查找找到第一个比arrI大的那一项，用arrI替换

            let left = 0;
            let right = result.length - 1;
            while (left < right) {
                const mid = (left + right) >> 1

                if (arr[result[mid]] < arrI) {
                    left = mid + 1;
                } else {
                    right = mid;
                }
            }
            p[i] = result[left - 1];//记录，记录前一项的索引

            //start和end会重合，直接用当前的索引替换
            result[left] = i;
        }

    }


    // console.log(p)
    // 实现倒序追踪

    let i = result.length;//总长度
    let last = result[result.length - 1];

    while (i-- > 0) {
        result[i] = last;//最后一项是正确的
        last = p[last];//通过最后一项找到对应的结果，将他作为最后一项来进行追踪
    }

    return result;
}

// let res = getLongestSubSequence([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
// console.log(res)