import { DeployFunction } from "hardhat-deploy/types"
import { developmentChains } from "../helper-hardhat-config"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const BASE_FEE = "250000000000000000" // 0.25 is the premium in LINK
const GAS_PRICE_LINK = 1e9 // Calculated value based on the gas price of the chain // 0.000000001 LINK per gas

const deployMocks: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })

        log("Mocks Deployed!")
        log("----------------------------------")

        log("You are deploying to a local network, you'll need a local network running to interact")
        log(
            "Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!"
        )
        log("----------------------------------")
    }
}
export default deployMocks
deployMocks.tags = ["all", "mocks"]
