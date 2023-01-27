import { developmentChains } from "../helper-hardhat-config"
import { network, ethers } from "hardhat"

async function performUpkeep() {
    const lotteryContract = await ethers.getContract("Lottery")

    if (developmentChains.includes(network.name)) {
        // If it's a development chain, the block number needs to be incremented
        // and the vfrCoordinatorV2Mock needs to be used to return the random words

        // Get the time interval
        const interval = (await lotteryContract.getInterval()).toNumber()

        // Increment the block number and block time
        await network.provider.send("evm_increaseTime", [interval + 1])
        await network.provider.request({
            method: "evm_mine",
            params: [],
        })

        // Get the vrfCoordinatorV2Mock and fulfill the request
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")

        // Perform the upkeep
        const tx = await lotteryContract.performUpkeep("0x")
        const txReceipt = await tx.wait(1)

        // Get the random words
        await vrfCoordinatorV2Mock.fulfillRandomWords(
            txReceipt!.events![1].args!.requestId,
            lotteryContract.address
        )
    } else {
        const lotteryContract = await ethers.getContract("Lottery")
        await lotteryContract.performUpkeep([])
        console.log("Update Triggered!")
    }
}

performUpkeep()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
