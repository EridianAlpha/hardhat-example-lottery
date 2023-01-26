import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { network, deployments, ethers } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { Lottery, VRFCoordinatorV2Mock } from "../../typechain-types"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Unit Tests", function () {
          let lottery: Lottery
          let lotteryContract: Lottery
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let lotteryEntranceFee: BigNumber
          let interval: number
          let player: SignerWithAddress
          let accounts: SignerWithAddress[]

          beforeEach(async () => {
              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              //   deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["mocks", "lottery"])
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock"
              )
              lotteryContract = await ethers.getContract("Lottery")
              lottery = lotteryContract.connect(player)
              lotteryEntranceFee = await lottery.getEntranceFee()
              interval = (await lottery.getInterval()).toNumber()
          })

          describe("constructor", function () {
              it("intitiallizes the lottery correctly", async () => {
                  // Ideally, we'd separate these out so that only 1 assert per "it" block
                  // And ideally, we'd make this check everything
                  const lotteryState = (
                      await lottery.getLotteryState()
                  ).toString()
                  assert.equal(lotteryState, "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId!][
                          "keepersUpdateInterval"
                      ]
                  )
              })
          })

          describe("enterLottery", function () {
              it("reverts when you don't pay enough", async () => {
                  await expect(lottery.enterLottery()).to.be.rejectedWith(
                      "Lottery__SendMoreToEnterLottery"
                  )
              })
              it("records player when they enter", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  const contractPlayer = await lottery.getPlayer(0)
                  assert.equal(player.address, contractPlayer)
              })
              it("emits event on enter", async () => {
                  await expect(
                      lottery.enterLottery({ value: lotteryEntranceFee })
                  ).to.emit(lottery, "LotteryEnter")
              })
              it("doesn't allow entrance when lottery is calculating", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval + 1,
                  ])
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
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [
                      interval + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      "0x"
                  )
                  assert(!upkeepNeeded)
              })
              it("returns false if lottery isn't open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  await lottery.performUpkeep([])
                  const lotteryState = await lottery.getLotteryState()
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      "0x"
                  )
                  assert.equal(
                      lotteryState.toString() == "1",
                      upkeepNeeded == false
                  )
              })
              it("returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval - 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      "0x"
                  )
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      "0x"
                  )
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("can only run if checkupkeep is true", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const tx = await lottery.performUpkeep("0x")
                  assert(tx)
              })
              it("reverts if checkup is false", async () => {
                  await expect(lottery.performUpkeep("0x")).to.be.rejectedWith(
                      "Lottery__UpkeepNotNeeded"
                  )
              })
              it("updates the lottery state and emits a requestId", async () => {
                  // Too many asserts in this test!
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const txResponse = await lottery.performUpkeep("0x")
                  const txReceipt = await txResponse.wait(1)
                  const lotteryState = await lottery.getLotteryState()
                  const requestId = txReceipt!.events![1].args!.requestId
                  assert(requestId.toNumber() > 0)
                  assert(lotteryState == 1)
              })
          })
          describe("fulfillRandomWords", function () {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
              })
              it("can only be called after performupkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          0,
                          lottery.address
                      )
                  ).to.be.rejectedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          1,
                          lottery.address
                      )
                  ).to.be.rejectedWith("nonexistent request")
              })
              // This test is too big...
              it("picks a winner, resets, and sends money", async () => {
                  const additionalEntrances = 3
                  const startingIndex = 2
                  for (
                      let i = startingIndex;
                      i < startingIndex + additionalEntrances;
                      i++
                  ) {
                      lottery = lotteryContract.connect(accounts[i])
                      await lottery.enterLottery({ value: lotteryEntranceFee })
                  }
                  const startingTimeStamp = await lottery.getLastTimeStamp()

                  // This will be more important for our staging tests...
                  await new Promise<void>(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          // assert throws an error if it fails, so we need to wrap
                          // it in a try/catch so that the promise returns event
                          // if it fails.
                          try {
                              // Now lets get the ending values...
                              const recentWinner =
                                  await lottery.getRecentWinner()
                              const lotteryState =
                                  await lottery.getLotteryState()
                              const winnerBalance =
                                  await accounts[2].getBalance()
                              const endingTimeStamp =
                                  await lottery.getLastTimeStamp()
                              await expect(lottery.getPlayer(0)).to.be.reverted
                              assert.equal(
                                  recentWinner.toString(),
                                  accounts[2].address
                              )
                              assert.equal(lotteryState, 0)
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance
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
                      const startingBalance = await accounts[2].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt!.events![1].args!.requestId,
                          lottery.address
                      )
                  })
              })
          })
      })
