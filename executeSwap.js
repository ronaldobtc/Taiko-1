const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const depScriptHeader = '\n==================================================\nETH Wrapping (Deposit) Transactions Started!';
const withScriptHeader = '\n==================================================\nETH Unwrapping (Withdrawal) Transactions Started!';

function runScript(scriptName, scriptHeader, exitOnComplete, callback) {
  console.log(scriptHeader);

  function execute() {
    const child = exec(`node ${scriptName}`, (error) => {
      if (error) {
        console.error(`Error executing ${scriptName}: ${error}`);
        return;
      }
    });

    child.stdout.on('data', (data) => {
      console.log(data);
    });

    child.stderr.on('data', (data) => {
      console.error(data);
    });

    child.on('close', () => {
      if (exitOnComplete) {
        process.exit(0);
      } else if (callback) {
        callback();
      }
    });
  }

  execute();
}

function runBothScripts(firstScript, firstHeader, secondScript, secondHeader) {
  runScript(firstScript, firstHeader, false, () => {
    runScript(secondScript, secondHeader, true);
  });
}

rl.question('Choose the action you want to perform:\n1. Wrap (Deposit) Ethereum\n2. Unwrap (Withdraw) Ethereum\n3. Do Both\nEnter your choice (1, 2, or 3): ', (choice) => {
  if (choice === '1' || choice === '2' || choice === '3') {
    rl.question('How many wallets do you want to use? ', (walletCount) => {
      if (!isNaN(walletCount) && walletCount > 0) {
        process.env.WALLET_COUNT = walletCount;
        if (choice === '1') {
          rl.question('\nHow many wrap (deposit) transactions to run? ', (count) => {
            if (!isNaN(count) && count > 0) {
              process.env.DEPOSIT_TX_COUNT = parseInt(count);
              runScript('deposit_ETH.js', depScriptHeader, true);
            } else {
              console.log('The number of transactions must be greater than 0.');
              rl.close();
            }
          });
        } else if (choice === '2') {
          rl.question('\nHow many unwrap (withdraw) transactions to run? ', (count) => {
            if (!isNaN(count) && count > 0) {
              process.env.WITHDRAW_TX_COUNT = parseInt(count);
              runScript('withdraw_ETH.js', withScriptHeader, true);
            } else {
              console.log('The number of transactions must be greater than 0.');
              rl.close();
            }
          });
        } else if (choice === '3') {
          // Logic for both scripts
        }
      } else {
        console.log('The number of wallets must be greater than 0.');
        rl.close();
      }
    });
  } else {
    console.log('Invalid choice.');
    rl.close();
  }
});