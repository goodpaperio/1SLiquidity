export function resolveDeploymentBlock(
  coreAddress: string,
  manifests: Array<{ contracts?: { Core?: string }; deploymentBlock?: number }>,
  fallback: number
): number {
  const blocks = manifests
    .filter(
      (manifest) =>
        manifest.deploymentBlock !== undefined &&
        manifest.contracts?.Core?.toLowerCase() === coreAddress.toLowerCase()
    )
    .map((manifest) => manifest.deploymentBlock as number);

  if (blocks.length === 0) return fallback;
  return Math.min(...blocks);
}
