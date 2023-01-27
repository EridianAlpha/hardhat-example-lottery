import { BigNumber } from "ethers"
import { assert, expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Lottery, VRFCoordinatorV2Mock } from "../../typechain-types"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { network, deployments, ethers, getNamedAccounts } from "hardhat"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Unit Tests", function () {
          let lottery: Lottery
          let lotteryContract: Lottery
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let lotteryEntranceFee: BigNumber
          let interval: number
          let deployer: SignerWithAddress
          let player: SignerWithAddress
          let accounts: SignerWithAddress[]

          beforeEach(async () => {
              // Get all the accounts
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]

              // Deploy the contracts and get the contract instances
              await deployments.fixture(["all"])
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              lotteryContract = await ethers.getContract("Lottery")

              // Connect the player to the lottery contract
              lottery = lotteryContract.connect(player)

              // Get the entrance fee and interval values
              lotteryEntranceFee = await lottery.getEntranceFee()
              interval = (await lottery.getInterval()).toNumber()
          })

          describe("constructor", function () {
              it("Intitiallizes the lottery state correctly", async () => {
                  const lotteryState = (await lottery.getLotteryState()).toString()
                  assert.equal(lotteryState, "0")
              })
              it("Intitiallizes the lottery keepersUpdateInterval correctly", async () => {
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId!]["keepersUpdateInterval"]
                  )
              })
          })

          describe("enterLottery", function () {
              it("Reverts when you don't pay enough", async () => {
                  await expect(lottery.enterLottery()).to.be.rejectedWith(
                      "Lottery__SendMoreToEnterLottery"
                  )
              })
              it("Records player when they enter", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  const contractPlayer = await lottery.getPlayer(0)
                  assert.equal(player.address, contractPlayer)
              })
              it("Emits event on enter", async () => {
                  await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(
                      lottery,
                      "LotteryEnter"
                  )
              })
              it("Doesn't allow entrance when lottery is calculating", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  // we pretend to be a keeper for a second
                  await lottery.performUpkeep([])
                  await expect(
                      lottery.enterLottery({ value: lotteryEntranceFee })
                  ).to.be.rejectedWith("Lottery__LotteryNotOpen")
              })
          })

          describe("checkUpkeep", function () {
              it("Returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })

                  // .callStatic is used to call a function without actually
                  // sending a transaction by simulating the transaction
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert(!upkeepNeeded)
              })
              it("Returns false if lottery isn't open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  await lottery.performUpkeep([])
                  const lotteryState = await lottery.getLotteryState()

                  // HardHat knows to transform "0x" into a blank bytes object
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert.equal(lotteryState.toString() == "1", upkeepNeeded == false)
              })
              it("Returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  assert(interval > 1, "Interval must be greater than 1 for this test to work")
                  await network.provider.send("evm_increaseTime", [1])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert(!upkeepNeeded)
              })
              it("Returns true if enough time has passed, has players, eth, and is open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("Can only run if checkupkeep is true", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const tx = await lottery.performUpkeep("0x")
                  assert(tx)
              })
              it("Reverts if checkup is false", async () => {
                  await expect(lottery.performUpkeep("0x")).to.be.rejectedWith(
                      "Lottery__UpkeepNotNeeded"
                  )
              })
              it("Updates the lottery state", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const txResponse = await lottery.performUpkeep("0x")
                  await txResponse.wait(1)
                  const lotteryState = await lottery.getLotteryState()
                  assert(lotteryState == 1)
              })
              it("Updates emits a requestId", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const txResponse = await lottery.performUpkeep("0x")
                  const txReceipt = await txResponse.wait(1)

                  // This is the second event because the VRFCoordinator emits the first event
                  const requestId = txReceipt!.events![1].args!.requestId
                  assert(requestId.toNumber() > 0)
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
              })
              it("Can only be called after performupkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
                  ).to.be.rejectedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
                  ).to.be.rejectedWith("nonexistent request")
              })
              // This test is too big...
              it("Picks a winner, resets, and sends money", async () => {
                  const additionalEntrances = 3
                  const startingIndex = 2
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      lottery = lotteryContract.connect(accounts[i])
                      await lottery.enterLottery({ value: lotteryEntranceFee })
                  }
                  const startingTimeStamp = await lottery.getLastTimeStamp()

                  // This will be more important for our staging tests...
                  await new Promise<void>(async (resolve, reject) => {
                      // Once the WinnerPicked event is emitted, run the function
                      lottery.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          // assert throws an error if it fails, so we need to wrap
                          // it in a try/catch so that the promise returns event
                          // if it fails.
                          try {
                              // Now lets get the ending values...
                              const recentWinner = await lottery.getRecentWinner()
                              const lotteryState = await lottery.getLotteryState()
                              const winnerEndingBalance = await accounts[2].getBalance()
                              const endingTimeStamp = await lottery.getLastTimeStamp()
                              await expect(lottery.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[2].address)
                              assert.equal(lotteryState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(
                                          lotteryEntranceFee
                                              .mul(additionalEntrances)
                                              .add(lotteryEntranceFee)
                                      )
                                      .toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })

                      const tx = await lottery.performUpkeep("0x")
                      const txReceipt = await tx.wait(1)
                      const winnerStartingBalance = await accounts[2].getBalance()

                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt!.events![1].args!.requestId,
                          lottery.address
                      )
                  })
              })
          })

          describe("getters", function () {
              it("Gets NUM_WORDS", async () => {
                  assert.equal((await lottery.getNumWords()).toString(), "1")
              })
              it("Gets REQUEST_CONFIRMATIONS", async () => {
                  assert.equal((await lottery.getRequestConfirmations()).toString(), "3")
              })
              it("Get getNumberOfPlayers", async () => {
                  assert.equal((await lottery.getNumberOfPlayers()).toString(), "0")
              })
          })

          describe("receive & fallback", async function () {
              it("Coverage for receive() function", async function () {
                  const response = await lottery.fallback({ value: lotteryEntranceFee })
                  assert.equal(response.value.toString(), lotteryEntranceFee.toString())
              })

              it("Coverage for fallback() function", async () => {
                  let signer: SignerWithAddress
                  ;[signer] = await ethers.getSigners()

                  const nonExistentFuncSignature = "nonExistentFunc(uint256,uint256)"
                  const fakeDemoContract = new ethers.Contract(
                      lottery.address,
                      [...lottery.interface.fragments, `function ${nonExistentFuncSignature}`],
                      signer
                  )
                  try {
                      await fakeDemoContract[nonExistentFuncSignature](1, 2)
                  } catch (e) {}
                  // Solution from: https://stackoverflow.com/questions/72584559/how-to-test-the-solidity-fallback-function-via-hardhat
              })
          })
      })
