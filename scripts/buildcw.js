import fs from 'fs'
import execa from 'execa'

/**
 * 过滤文件
 */
const dirs = fs.readdirSync('packages').filter((item) => {
    // 只会打包文件夹
    if (!fs.statSync('packages', item).isDirectory()) {
        return false
    }
    return true
})


/**
 * 打包
 * @param {*} target 
 */
async function build(target) {
    // console.log(target, 333);
    // -c执行rollup.config.js配置文件,inherit在父包中输出,-w监听变化
    await execa("rollup", ["-cw", "--environment", `TARGET:${target}`], { stdio: "inherit" });
}


/**
 * 并行打包
 * @param {*} dirs 
 * @param {*} itemFn 
 * @returns 
 */
async function runParaller(dirs, buildFun) {
    const result = []
    for (const item of dirs) {
        const p = Promise.resolve().then(() => buildFun(item))
        result.push(p)
    }
    return Promise.all(result)
}

runParaller(dirs, build).then(() => {
    console.log("打包成功");
})
// console.log(dir);
