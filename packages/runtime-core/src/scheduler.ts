const queue: Function[] = [];

// 数据变化后可能会影响多个组件，这里用队列存储

let isFlushing = false;
const p = Promise.resolve();

/**
 * 类似于浏览器的事件循环，数据变化触发更新操作job，job在render的updateComponent中被放到队列中
 * 入队时判断是否已经存在，如果不存在则放入队列，用一个isFlushing参数控制，queue里面如果有任务就执行
 * 使用promise开始一步任务，
 * 异步任务中将isFlushing变为false，并拷贝执行异步任务，执行期间可能还会产生同步任务，此时再放入队列
 * @param job
 */
export function queueJob(job: Function) {
    if (!queue.includes(job)) {
        queue.push(job)
    }
    if (!isFlushing) {
        isFlushing = true;//通过批处理实现的
        // 用一个微任务，当当前任务执行完之后把isFlushing变为false
        p.then(() => {
            isFlushing = false;
            //     拷贝一份，防止边执行边往里面放的情况导致死循环
            let copyQueue = queue.slice(0);//将当前要执行的队列拷贝一份，并且清空队列
            queue.length = 0;

            copyQueue.forEach(job => {
                job();
            })
            copyQueue.length = 0;
        })
    }
}



