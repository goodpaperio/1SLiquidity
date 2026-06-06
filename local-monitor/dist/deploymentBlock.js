"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDeploymentBlock = resolveDeploymentBlock;
function resolveDeploymentBlock(coreAddress, manifests, fallback) {
    const blocks = manifests
        .filter((manifest) => manifest.deploymentBlock !== undefined &&
        manifest.contracts?.Core?.toLowerCase() === coreAddress.toLowerCase())
        .map((manifest) => manifest.deploymentBlock);
    if (blocks.length === 0)
        return fallback;
    return Math.min(...blocks);
}
//# sourceMappingURL=deploymentBlock.js.map