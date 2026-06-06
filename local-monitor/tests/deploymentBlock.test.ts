import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveDeploymentBlock } from "../src/deploymentBlock";

const CORE = "0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710";

describe("resolveDeploymentBlock", () => {
  it("returns fallback when no matching manifest", () => {
    assert.equal(resolveDeploymentBlock(CORE, [], 25_072_029), 25_072_029);
  });

  it("uses earliest deploymentBlock for matching Core address", () => {
    const block = resolveDeploymentBlock(
      CORE,
      [
        {
          contracts: { Core: CORE },
          deploymentBlock: 25_093_744,
        },
        {
          contracts: { Core: CORE },
          deploymentBlock: 25_072_029,
        },
      ],
      0
    );

    assert.equal(block, 25_072_029);
  });

  it("ignores manifests for other Core addresses", () => {
    const block = resolveDeploymentBlock(
      CORE,
      [
        {
          contracts: { Core: "0x0000000000000000000000000000000000000001" },
          deploymentBlock: 100,
        },
      ],
      25_072_029
    );

    assert.equal(block, 25_072_029);
  });
});
