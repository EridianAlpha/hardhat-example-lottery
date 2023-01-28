import { frontEndContractsFile, frontEndAbiFile } from "../helper-hardhat-config"
import fs from "fs"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const updateUI: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { network, ethers } = hre
    const chainId = network.config.chainId?.toString()

    if (process.env.UPDATE_FRONT_END && chainId) {
        console.log("Writing to front end...")
        const lottery = await ethers.getContract("Lottery")

        // Update contract addresses
        const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
        contractAddresses[chainId!] = [lottery.address]
        fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))

        // Update ABI
        fs.writeFileSync(
            frontEndAbiFile,
            lottery.interface.format(ethers.utils.FormatTypes.json).toString()
        )

        console.log("Front end written!")
    }
}
export default updateUI
updateUI.tags = ["all", "frontend"]
