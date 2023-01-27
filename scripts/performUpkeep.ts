import { ethers } from "hardhat"

async function performUpkeep() {
    const lottery = await ethers.getContract("Lottery")
    await lottery.performUpkeep([])
    console.log("Update Triggered!")
}

performUpkeep()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
