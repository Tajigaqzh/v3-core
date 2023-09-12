// const arr = [10, 9, 2, 484, 7, 150, 41, 57, 57, 67, 1, 6, 78, 8451, 54, 17, 73, 9, 5, 3, 7, 101, 50, 1]
// const LIS = function (nums) {
//     if (nums.length == 0) {
//         return
//     }
//     let len = nums.length
//     const dp = new Array(len).fill(1)//表示以nums[i]结尾的最长上升子序列的长度
//     let max = 1
//     for (let i = 1; i < len; i++) {
//         for (let j = i - 1; j >= 0; j--) {
//             if (nums[i] > nums[j]) {
//                 dp[i] = Math.max(dp[i], dp[j] + 1)
//             }
//         }
//         max = Math.max(dp[i], max)
//     }
//     console.log(max);
//     return max
// }
// LIS(arr)

let arr1 = [1, 3, 5,11]
let arr2 = [3,11,10]

let set1 = new Set(arr1)
let set2 = new Set(arr2)
const set = new Set(
    [...set1].filter(item => set2.has(item))
)
console.log(set);
console.log(process.argv[2]);