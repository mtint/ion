const fs = require("fs-extra")
// const Debug = require('web3-eth-debug').Debug
const Web3 = require('web3');
const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

const config = require("./config.json")

benchmarkTx = (txHash, name, options, web3) => {
    web3.currentProvider.send({
       "jsonrcp":"2.0",
       "method":"debug_traceTransaction",
       "params":[txHash, options]
    }, (err, res) => {
        if(err===null && !res.error){
            aggregate(res.result, name, options)
        } else {
            console.log(err, name)
        }
    })

}

// get stack, memory storage info potentially but run out of heap fairly quickly
// plus gotta find a meaning out of this info
aggregate = (txTrace, name, options) => {

    if(!options.disableStack){
        // stack max depth
        for (log of txTrace.structLogs) {
            if (log.stack.length > aggregateObj.maxStackDepth)
            benchmarkObj.maxStackDepth = log.stack.length

        }
    } else if(!options.disableMemory){
        // memory max depth
        for (log of txTrace.structLogs) {
            if (log.memory.length > aggregateObj.maxMemoryDepth)
                benchmarkObj.maxMemoryDepth = log.memory.length
        }
    }

    traceOpcodes(txTrace, name)
}

// calculate percentage of difference in gas consumption functions
compare = (benchmarkFileBefore, benchmarkFileAfter) => {
    before = fs.readJSONSync(benchmarkFileBefore)
    after = fs.readJSONSync(benchmarkFileAfter)
    
    if (!Object.keys(after).length || !Object.keys(before).length){
        console.log("Empty input files!")
        return
    }

    for (method of Object.keys(before)){
        gasDelta = before[method].gas - after[method].gas
        percentage = Number(gasDelta * 100 / before[method].gas).toFixed(3)

        console.log("\n" + method, "gas costs:")
        console.log("Before:", before[method].gas, "After", after[method].gas)
        console.log("Saving:", percentage + "%")
    }
}

// trace and aggregate the opcodes calls 
traceOpcodes = (txTrace, name) => {
    opcodeCount = {}

    // word count the opcodes specified in watchedOpcodes in config
    for (log of txTrace.structLogs) {
        if (config.WATCHED_OPCODES.indexOf(log.op) > -1)
            opcodeCount[log.op] = opcodeCount[log.op] ? opcodeCount[log.op] += 1 : 1
    }

    benchmarkObj[name]["opcodes"] = opcodeCount

    fs.writeJsonSync(config.BENCHMARK_FILEPATH, benchmarkObj)

}


// ENTRYPOINT 
options = {disableStorage:true, disableStack:true, disableMemory:true}
benchmarkObj = fs.readJsonSync(config.BENCHMARK_FILEPATH)

switch(process.argv[2]){
    default:
    case "trace": 
        for (var key of Object.keys(benchmarkObj)) {
            benchmarkTx(benchmarkObj[key].txHash, key, options, web3)
        }
    break;
    
    case "compare":
        compare(process.argv[3], process.argv[4])
    break;
}

// benchmarkTx("0x22eb8a81dd3d949b2e36e38a9f5221c399c3faf0b4d07e56ca3ee8673a97fa7b", "register", options, web3)
// compare("./stats/initial-petersburgRpc.json", "./stats/initial-istanbulRpc.json")


module.exports = {benchmarkTx, compare}