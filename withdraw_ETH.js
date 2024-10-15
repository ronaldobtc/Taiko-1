const Web3 = require('web3');
const { HttpProxyAgent } = require('http-proxy-agent');
const swap_ABI = require('./abi/weth_abi');

require('dotenv').config();

const rpcUrl = process.env.RPC_URL;
const walletCount = parseInt(process.env.WALLET_COUNT);

let totalAmountWithdrew = 0;
let totalGasSpent = 0;
let totalWETHBalance = 0;

async function withdrawETH(walletIndex, sendIndex) {
  const privateKey = process.env[`WALLET_PRIVATEKEY_${walletIndex + 1}`];
  const proxyUrl = process.env[`PROXY_URL_${walletIndex + 1}`];
  const withdrawCA = process.env.WETH_CA;

  const agent = new HttpProxyAgent(proxyUrl);
  const web3 = new Web3(rpcUrl, null, { agent });

  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  const wethContract = new web3.eth.Contract(swap_ABI, withdrawCA);
  const wethBalance = await wethContract.methods.balanceOf(account.address).call();

  const initialWETHBalance = parseInt(wethBalance);
  const gasLimit = parseInt(process.env.GAS_LIMIT);
  const randomAmount = getRandomAmount();
  let valueToWithdraw = randomAmount * 1e18; //

  // Kiểm tra số dư trước khi rút
  if (initialWETHBalance <= valueToWithdraw) {
    valueToWithdraw = initialWETHBalance;
  }

  if (initialWETHBalance === 0) {
    if (walletIndex + 1 < walletCount) {
      withdrawETH(walletIndex + 1, 0); // 
    } else {
      finalizeTransaction();
    }
    return;
  }

  const withETH = wethContract.methods.withdraw(valueToWithdraw).encodeABI();
  const transactionObject = {
    from: account.address,
    to: withdrawCA,
    value: 0,
    maxPriorityFeePerGas: web3.utils.toHex(web3.utils.toWei(process.env.MAX_PRIORITY_FEE_PER_GAS, "gwei")),
    maxFeePerGas: web3.utils.toHex(web3.utils.toWei(process.env.MAX_FEE_PER_GAS, "gwei")),
    type: 2,
    chainId: 167000,
    data: withETH,
    gasLimit: web3.utils.toHex(gasLimit)
  };

  const amountSent = web3.utils.fromWei(valueToWithdraw.toString(), 'ether');
  totalAmountWithdrew += parseFloat(amountSent);

  try {
    const transactionReceipt = await web3.eth.sendTransaction(transactionObject);
    totalGasSpent += parseFloat(web3.utils.fromWei((transactionReceipt.gasUsed * transactionReceipt.effectiveGasPrice).toString(), 'ether'));

    const blockNumber = transactionReceipt.blockNumber;
    const blockDetails = await web3.eth.getBlock(blockNumber);
    const timestamp = blockDetails.timestamp;
    const date = new Date(timestamp * 1000);
    const formattedDate = formatDateToTimezone(date, 'Asia/Manila');

    console.log(`\nWallet ${walletIndex + 1}: ${sendIndex + 1}. \x1b[91m${amountSent}\x1b[0m ETH unwrap (withdrawal) success @ \x1b[93m${formattedDate}\x1b[0m with Block # \x1b[32m${blockNumber}\x1b[0m`);
    
    const wethBalance = await wethContract.methods.balanceOf(account.address).call();
    totalWETHBalance = parseFloat(web3.utils.fromWei(wethBalance.toString(), 'ether'));
    console.log('Total WETH balance: \x1b[95m' + totalWETHBalance.toFixed(8) + '\x1b[0m WETH');
  } catch (withdrawError) {
    console.error(`Error withdrawing ETH:`, withdrawError);
  }

  let sendIndexNew = sendIndex + 1;
  let txCount = parseInt(process.env.WITHDRAW_TX_COUNT);

  if (sendIndexNew >= txCount) {
    if (walletIndex + 1 < walletCount) {
      withdrawETH(walletIndex + 1, 0);
    } else {
      finalizeTransaction();
    }
    return;
  }

  setTimeout(() => {
    withdrawETH(walletIndex, sendIndexNew);
  }, 20000);
}

async function finalizeTransaction() {
  console.log('\x1b[94mAll Withdraw ETH Transactions Completed.\x1b[0m');
  console.log('Overall ETH withdrawn: \x1b[91m' + totalAmountWithdrew.toFixed(8) + '\x1b[0m ETH');
  console.log('Overall txn fee spent: \x1b[93m' + totalGasSpent.toFixed(10) + '\x1b[0m ETH');

  const queryRemainingBalance = await web3.eth.getBalance(process.env.WALLET_PRIVATEKEY_1);
  const remainingBalance = parseFloat(web3.utils.fromWei(queryRemainingBalance, 'ether')).toFixed(8);
  console.log('Overall ETH balance: \x1b[92m' + remainingBalance + '\x1b[0m ETH');
}

function getRandomAmount() {
  const min = parseFloat(process.env.WITHDRAW_RANDOM_AMOUNT_MIN);
  const max = parseFloat(process.env.WITHDRAW_RANDOM_AMOUNT_MAX);
  const randomValue = Math.random() * (max - min) + min;
  return Math.floor(randomValue); // 
}

function formatDateToTimezone(date, timeZone) {
  const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: timeZone };
  const timeFormatter = new Intl.DateTimeFormat('en-US', timeOptions);
  const formattedTime = timeFormatter.format(date);

  const dateOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: timeZone };
  const dateFormatter = new Intl.DateTimeFormat('en-US', dateOptions);
  const formattedDate = dateFormatter.format(date);

  return `${formattedTime} · ${formattedDate}`;
}

withdrawETH(0, 0);