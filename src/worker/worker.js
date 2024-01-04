const { parentPort, workerData } = require('worker_threads')

const mainFunction = async () => {
    console.log('workerData', workerData)
    const module = require(workerData.path);
    module[workerData.key](workerData.req, workerData.res, function (reply) {
        parentPort.postMessage(reply);
    })
}

mainFunction();