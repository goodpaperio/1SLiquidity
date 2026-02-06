#!/bin/bash

# Ensure script stops on first error
set -e

echo "=== Deploying contracts to BuildBear ==="
# Deploy contracts using foundry
forge script script/Deploy.s.sol:DeployScript --rpc-url buildbear --broadcast --verify

# Get deployed addresses from the deployment output
# You'll need to manually extract these from the logs after the first run
STREAM_DAEMON=$(grep -A 1 "StreamDaemon deployed at:" /tmp/forge-script-output.log | tail -n 1 | awk '{print $1}')
EXECUTOR=$(grep -A 1 "Executor deployed at:" /tmp/forge-script-output.log | tail -n 1 | awk '{print $1}')

echo "StreamDaemon: $STREAM_DAEMON"
echo "Executor: $EXECUTOR"

# Update the TestReserves script with the deployed addresses
sed -i '' "s/address constant STREAM_DAEMON = address(0);/address constant STREAM_DAEMON = $STREAM_DAEMON;/" script/TestReserves.s.sol
sed -i '' "s/address constant EXECUTOR = address(0);/address constant EXECUTOR = $EXECUTOR;/" script/TestReserves.s.sol

echo "=== Testing reserve fetching ==="
# Run the test script
forge script script/TestReserves.s.sol:TestReservesScript --rpc-url buildbear

echo "=== Deployment and testing completed ===" 