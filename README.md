# Template - Hardhat

This repo is a template for starting a new Hardhat project.
<br/>
<br/>

## Getting Started

```
git clone https://github.com/EridianAlpha/hardhat-template
cd hardhat-template
yarn upgrade --latest
```

### Compile

```
yarn compile
```

### Testing

```
yarn test
```

### Test Coverage

```
yarn coverage
```

### Linting

To check linting / code formatting:

```
yarn lint
```

or, to fix:

```
yarn lint:fix
```

### Formatting

```
yarn format
```
<br/>

## Estimate gas

You can estimate how much gas things cost by running:

```
yarn test
```

And you'll see and output file called `gas-report.txt`

### Estimate gas cost in USD

To get a USD estimation of gas cost, you'll need a `COINMARKETCAP_API_KEY` environment variable. You can get one for free from [CoinMarketCap](https://pro.coinmarketcap.com/signup).

Then, uncomment the line `coinmarketcap: COINMARKETCAP_API_KEY,` in `hardhat.config.js` to get the USD estimation. Just note, every time you run your tests it will use an API call, so it might make sense to have using coinmarketcap disabled until you need it. You can disable it by just commenting the line back out.

<br/>

# Deployment to a testnet

1. Setup environment variables

You'll want to set your `TESTNET_RPC_URL` and `PRIVATE_KEY` as environment variables. You can add them to a `.env` file.

-   `PRIVATE_KEY`: The private key of your account.
-   `TESTNET_RPC_URL`: This is url of the testnet node you're working with.

2. Get testnet ETH

Head over to [faucets.chain.link](https://faucets.chain.link/) and get some testnet ETH. You should see the ETH show up in your metamask.

3. Deploy

```
yarn hardhat deploy --network <TEST_NETWORK>
```
<br/>

## Scripts

After deploy to a testnet or local net, you can run the scripts.

```
yarn hardhat run scripts/fund.js
```

or

```
yarn hardhat run scripts/withdraw.js
```
<br/>

## Verify on etherscan

If you deploy to a testnet or mainnet, you can verify it if you get an [API Key](https://etherscan.io/myapikey) from Etherscan and set it as an environment variable named `ETHERSCAN_API_KEY`. You can pop it into your `.env` file as seen in the `.env.example`.

In it's current state, if you have your api key set, it will auto verify kovan contracts!

However, you can manual verify with:

```
yarn hardhat verify --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS
```

https://github.com/othneildrew/Best-README-Template