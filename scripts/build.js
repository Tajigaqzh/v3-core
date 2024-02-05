import fs from 'fs'
import execa from 'execa'

const Color = {
    'green': '\x1B[32m', // 绿色
    'yellow': '\x1B[33m', // 黄色
    'white': '\x1B[37m', // 白色
    "red": '\x1B[31m',//红色
}
/**
 * 过滤
 */
const dirs = fs.readdirSync('packages').filter((item) => {
    if (!fs.statSync('packages', item).isDirectory()) {
        return false
    }
    return true
})

let args = process.argv.splice(2)

if (args === undefined || args.length === 0) {
    console.warn(Color.red, "请输入参数！！！")
    console.log(Color.green, "tips:", "\n");
    console.log(Color.green, "all或者c表示打包所有代码；")
    console.log(Color.green, "cw表示打包所有代码并监听变化;")
    console.log(Color.green, "输入一个正确的包名仅打包该包,输入多个包名时，请用一个空格分割包名")
    console.log(Color.white)
}

if (args.length === 1) {
    switch (args[0]) {
        case "cw":
            runParaller(dirs, build, args[0]).then(() => {
                console.log(Color.green, `打包成功！`); console.log(Color.white)
            })
            break;
        case "c":
            runParaller(dirs, build, "c").then(() => {
                console.log(Color.green, `打包成功！`); console.log(Color.white)
            })
            break
        case "all":
            runParaller(dirs, build, "c").then(() => {
                console.log(Color.green, `打包成功！`); console.log(Color.white)
            })
            break;
    }
}

/**
 * 打包的方法
 * @param {*} target 
 * @param {*} nodeArgs 
 */
async function build(target, nodeArgs = "c") {
    // console.log(target, 333);
    // -c执行rollup.config.js配置文件,inherit在父包中输出,-w监听变化
    await execa("rollup", [`-${nodeArgs}`, "--environment", `TARGET:${target}`], { stdio: "inherit" });
}

/**
 * 并行打包所有包
 * @param {Function} buildFun 打包函数
 * @param {string} nodeArgs 参数
 * @param {Array<string>} dirs 目录 
 */

async function runParaller(dirs, buildFun, nodeArgs) {
    const result = [];
    for (const item of dirs) {
        const p = Promise.resolve().then(() => buildFun(item, nodeArgs))
        result.push(p)
    }
    return Promise.all(result);
}

/**
 * 根据输入的包名分别打包
 */
args.forEach(item => {
    if (dirs.includes(item)) {
        build(item).then(() => {
            console.log(Color.green, `${item}   打包成功！`);
            console.log(Color.white)
        })
    } else if (item != "c" && item != "cw" && item != "all") {
        console.log(Color.yellow, "请输入正确的包名!!!");
        console.log(Color.white)
    }
})

