import "@typechain/hardhat"
import "@nomicfoundation/hardhat-chai-matchers"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "hardhat-gas-reporter"
import "dotenv/config"
import "solidity-coverage"
import "hardhat-deploy"
import "./tasks/block-number"
import { HardhatUserConfig } from "hardhat/config"

const GOERLI_PRIVATE_KEY =
    process.env.GOERLI_PRIVATE_KEY ||
    "0x0000000000000000000000000000000000000000000000000000000000000000"
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || ""
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""
const REPORT_GAS = process.env.REPORT_GAS || undefined
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || ""

const config: HardhatUserConfig = {
    solidity: {
        compilers: [{ version: "0.8.16" }, { version: "0.6.6" }],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            //url: No URL as this is the built in Hardhat Network
            //accounts: Already defined by hardhat
            chainId: 31337,
            gasPrice: 10000000000,
        },
        localhost: {
            url: "http://127.0.0.1:8545/",
            //accounts: Already defined by hardhat
            chainId: 31337,
            gasPrice: 10000000000,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: [GOERLI_PRIVATE_KEY],
            chainId: 5,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    gasReporter: {
        enabled: REPORT_GAS !== undefined,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
        url: "http://127.0.0.1:8545",
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured (I guess derivation paths), the account 0 on one network can be different than on another
        },
    },
}

export default config
