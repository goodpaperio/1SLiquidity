#!/usr/bin/env node

const { execSync } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const RPC_ENDPOINTS = {
  anvil: "http://localhost:8545",
  buildbear: "https://rpc.buildbear.io/foolish-darkphoenix-2fe074ec",
};

async function main() {
  // Check if anvil is running
  try {
    execSync("curl -s http://localhost:8545", { stdio: "ignore" });
    console.log("✅ Anvil is running");
  } catch (e) {
    console.log("❌ Anvil is not running. Please start it with:");
    console.log(
      "anvil --fork-url https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_KEY"
    );
    process.exit(1);
  }

  console.log("\nChoose RPC endpoint:");
  console.log("1. Anvil (localhost:8545)");
  console.log("2. Buildbear");

  rl.question("\nEnter your choice (1 or 2): ", (answer) => {
    let endpoint;
    switch (answer) {
      case "1":
        endpoint = RPC_ENDPOINTS.anvil;
        break;
      case "2":
        endpoint = RPC_ENDPOINTS.buildbear;
        break;
      default:
        console.log("Invalid choice. Exiting...");
        process.exit(1);
    }

    console.log(`\nRunning tests against ${endpoint}...\n`);

    try {
      execSync(
        `forge test --match-path "test/**/*.t.sol" --fork-url ${endpoint} -vvv`,
        { stdio: "inherit" }
      );
    } catch (e) {
      console.error("Tests failed:", e.message);
      process.exit(1);
    }

    rl.close();
  });
}

main().catch(console.error);
