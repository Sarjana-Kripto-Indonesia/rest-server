const { parentPort, workerData } = require('worker_threads')


const calculate = () => {
    return new Promise((resolve, reject) => {
        console.log('workerData', workerData);
        resolve(true)
    })
}

const mainFunction = async () => {
    let total = await calculate();
    parentPort.postMessage(total);
}

mainFunction();