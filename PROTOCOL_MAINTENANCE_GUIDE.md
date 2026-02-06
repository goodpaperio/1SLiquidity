# 🔧 1SLiquidity Protocol Maintenance Guide

This guide provides comprehensive procedures and considerations for safely updating contracts in the 1SLiquidity protocol.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture & Dependencies](#architecture--dependencies)
3. [Update Procedures](#update-procedures)
4. [Risk Assessment](#risk-assessment)
5. [Testing Requirements](#testing-requirements)
6. [Emergency Procedures](#emergency-procedures)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## 🏗️ Overview

The 1SLiquidity protocol uses a modular architecture where contracts can be updated individually while maintaining system integrity. All updates use CREATE2 for deterministic addresses, ensuring consistency across deployments.

### **Key Principles:**

- **Individual Updates**: Each contract can be updated independently
- **Dependency Management**: Updates respect contract interdependencies
- **Version Tracking**: Complete history preserved in `versions/` folder
- **Thorough Validation**: Comprehensive testing before and after updates
- **Rollback Capability**: Previous versions remain accessible

## 🏛️ Architecture & Dependencies

### **Contract Hierarchy:**

```
Core (Main Orchestrator)
├── StreamDaemon (Liquidity Management)
│   └── DEX Fetchers (UniswapV2, Sushiswap, PancakeSwap)
├── Executor (Trade Execution)
└── Registry (DEX & Router Management)
```

### **Update Order (Critical):**

1. **DEX Fetchers** (Independent - can update anytime)
2. **Executor** (Independent - can update anytime)
3. **StreamDaemon** (Independent - can update anytime)
4. **Registry** (Independent - can update anytime)
5. **Core** (Dependent on all others - **MUST BE LAST**)

### **Dependency Rules:**

- **Core** depends on StreamDaemon, Executor, and Registry
- **StreamDaemon** depends on DEX Fetchers
- **DEX Fetchers, Executor, Registry** are independent
- **NEVER update Core first** - it will break the system

## 🚀 Update Procedures

### **Pre-Update Checklist:**

- [ ] **Environment Setup**: All contract addresses in `.env`
- [ ] **Access Control**: Wallet has ownership permissions
- [ ] **Network Selection**: Correct network (mainnet/testnet)
- [ ] **Gas Estimation**: Sufficient gas for deployment
- [ ] **Backup**: Current state documented
- [ ] **Testing**: Dry-run completed successfully

### **Update Process:**

#### **1. DEX Fetcher Updates**

```bash
# Test first
forge script maintenance/fetchers/UpdateUniswapV2Fetcher.s.sol --fork-url $MAINNET_RPC_URL -vvvv

# Then update
forge script maintenance/fetchers/UpdateUniswapV2Fetcher.s.sol --rpc-url $MAINNET_RPC_URL --broadcast --account deployKey --sender 0x... -vvvv
```

#### **2. Independent Contract Updates**

```bash
# Update Executor
forge script maintenance/UpdateExecutor.s.sol --rpc-url $MAINNET_RPC_URL --broadcast --account deployKey --sender 0x... -vvvv

# Update StreamDaemon
forge script maintenance/UpdateStreamDaemon.s.sol --rpc-url $MAINNET_RPC_URL --broadcast --account deployKey --sender 0x... -vvvv

# Update Registry
forge script maintenance/UpdateRegistry.s.sol --rpc-url $MAINNET_RPC_URL --broadcast --account deployKey --sender 0x... -vvvv
```

#### **3. Core Update (Last Step)**

```bash
# Test first
forge script maintenance/UpdateCore.s.sol --fork-url $MAINNET_RPC_URL -vvvv

# Then update
forge script maintenance/UpdateCore.s.sol --rpc-url $MAINNET_RPC_URL --broadcast --account deployKey --sender 0x... -vvvv
```

### **Post-Update Verification:**

- [ ] **Contract Deployment**: New contract deployed successfully
- [ ] **Functionality Test**: Basic functions work
- [ ] **Integration Test**: Dependencies properly linked
- **Version History**: Updated in `versions/` folder
- **Environment Variables**: Updated if needed

## ⚠️ Risk Assessment

### **Risk Levels by Contract Type:**

| Contract Type | Risk Level | Gas Estimate | Rollback Complexity |
| ------------- | ---------- | ------------ | ------------------- |
| DEX Fetchers  | **LOW**    | 500,000      | Simple              |
| Executor      | **MEDIUM** | 800,000      | Moderate            |
| StreamDaemon  | **MEDIUM** | 1,000,000    | Moderate            |
| Registry      | **MEDIUM** | 600,000      | Moderate            |
| Core          | **HIGH**   | 1,500,000    | Complex             |

### **Risk Factors:**

- **Dependency Complexity**: More dependencies = higher risk
- **State Impact**: Contracts with critical state = higher risk
- **Integration Points**: More integration points = higher risk
- **User Impact**: Direct user interaction = higher risk

### **Mitigation Strategies:**

- **Thorough Testing**: Always dry-run before mainnet
- **Incremental Updates**: Update one contract at a time
- **Dependency Validation**: Verify all dependencies work
- **Rollback Planning**: Have rollback procedures ready

## 🧪 Testing Requirements

### **Thorough Dependency Level (Required):**

1. **Contract Existence**: Verify contract deployed at address
2. **Interface Compatibility**: Verify expected functions exist
3. **Functionality Testing**: Test all critical functions
4. **Integration Testing**: Verify dependencies work together
5. **State Validation**: Verify contract state is correct

### **Testing Checklist:**

- [ ] **Pre-Update Tests**: Current contracts functional
- [ ] **Deployment Tests**: New contracts deploy successfully
- [ ] **Functionality Tests**: All functions work as expected
- [ ] **Integration Tests**: Dependencies properly linked
- [ ] **State Tests**: Contract state preserved/updated
- [ ] **Performance Tests**: Gas usage within limits

### **Testing Environments:**

1. **Local Fork**: Test on local mainnet fork
2. **Testnet**: Test on public testnet
3. **Mainnet Fork**: Test on mainnet fork before real deployment
4. **Production**: Final deployment with monitoring

## 🚨 Emergency Procedures

### **When to Rollback:**

- **Critical Bugs**: Functionality completely broken
- **Security Issues**: Vulnerabilities discovered
- **Integration Failures**: Contracts can't communicate
- **Performance Issues**: Gas usage excessive
- **User Complaints**: Users experiencing problems

### **Rollback Process:**

1. **Immediate Stop**: Halt any ongoing operations
2. **Assessment**: Determine scope of issue
3. **Rollback Decision**: Choose rollback strategy
4. **Execution**: Deploy previous version
5. **Verification**: Test rollback successful
6. **Communication**: Inform stakeholders

### **Rollback Strategies:**

- **Quick Rollback**: Deploy previous version immediately
- **Gradual Rollback**: Rollback one contract at a time
- **State Recovery**: Attempt to recover contract state
- **Emergency Mode**: Switch to backup systems

## 📈 Best Practices

### **Update Planning:**

1. **Schedule Updates**: Plan during low-activity periods
2. **Stakeholder Communication**: Inform team and users
3. **Backup Preparation**: Ensure rollback capability
4. **Testing Schedule**: Allow sufficient testing time
5. **Documentation**: Record all changes and procedures

### **Update Execution:**

1. **Follow Order**: Respect dependency order strictly
2. **Test Thoroughly**: Complete all testing requirements
3. **Monitor Closely**: Watch for issues after update
4. **Document Changes**: Update version history
5. **Verify Integration**: Ensure all systems work together

### **Post-Update:**

1. **Monitor Performance**: Watch for performance issues
2. **User Feedback**: Collect and address user concerns
3. **Metrics Tracking**: Monitor key performance indicators
4. **Issue Resolution**: Address any problems quickly
5. **Lessons Learned**: Document improvements for future

## 🔍 Troubleshooting

### **Common Issues:**

#### **1. Permission Denied**

- **Cause**: Wallet lacks ownership permissions
- **Solution**: Verify wallet has correct permissions
- **Prevention**: Test permissions before update

#### **2. Dependency Mismatch**

- **Cause**: Contract addresses don't match
- **Solution**: Verify all addresses in environment
- **Prevention**: Use dependency validation functions

#### **3. Gas Issues**

- **Cause**: Insufficient gas for deployment
- **Solution**: Increase gas limit
- **Prevention**: Estimate gas requirements beforehand

#### **4. Integration Failures**

- **Cause**: Contracts can't communicate
- **Solution**: Verify constructor parameters
- **Prevention**: Test integration thoroughly

### **Debugging Steps:**

1. **Check Logs**: Review deployment logs
2. **Verify Addresses**: Confirm all addresses correct
3. **Test Functions**: Test basic contract functions
4. **Check Dependencies**: Verify dependency contracts exist
5. **Review Code**: Check for obvious issues

### **Support Resources:**

- **Contract Logs**: Check deployment transaction logs
- **Version History**: Review previous deployments
- **Testing Results**: Check dry-run output
- **Documentation**: Review contract specifications
- **Team Communication**: Consult with development team

## 📚 Additional Resources

### **Related Documentation:**

- [Deployment Guide](README.md)
- [Contract Architecture](docs/architecture.md)
- [CREATE2 Implementation](docs/create2.md)
- [Testing Procedures](docs/testing.md)

### **External Resources:**

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethereum Development](https://ethereum.org/developers/)

---

## ⚠️ Critical Warnings

1. **NEVER update Core first** - It depends on all other contracts
2. **Always test thoroughly** - Use dry-runs before mainnet
3. **Follow dependency order** - Respect the update hierarchy
4. **Monitor after updates** - Watch for issues and user feedback
5. **Have rollback plans** - Be prepared for emergency situations

## 📞 Emergency Contacts

- **Technical Issues**: Check contract logs and version history
- **Rollback Needed**: Use emergency rollback procedures
- **State Recovery**: Restore from version backups
- **Team Support**: Contact development team immediately

---

**Remember**: Contract updates carry significant risk. Always prioritize safety, thorough testing, and proper planning. When in doubt, test more and proceed more slowly.
