const { parentPort, workerData } = require('worker_threads')


const calculate = () => {
    return new Promise((resolve, reject) => {
        let total = 0;
        for (let i = 0; i < 10000000000; i++) {
            total++;
        }  
        resolve(total)
    })
}

const mainFunction = async () => {
    console.log('workerData', workerData)
    // let total = await calculate();
    // console.log(`total: ${total}`)
    // parentPort.postMessage(total);
}

mainFunction();