#!/bin/bash
# Push all decastream branches to origin

branches=(
  "balancer-curve-fix"
  "bugfix-frontend-stream-calc"
  "contracts"
  "deployment-v5"
  "feat/addBalancer-test"
  "feat/univ3-fix-fee"
  "feature-dashboard"
  "frontend-changes"
  "frontend-v0.0.5-updates"
  "ins"
  "instasettle-fixes"
  "instasettle-token-selection"
  "main"
  "quotes"
  "scaling-calculation"
  "subgraph-3.1"
  "v3.1"
  "vercel/react-server-components-cve-vu-78cks6"
)

for branch in "${branches[@]}"; do
  echo "Pushing branch: $branch"
  git push origin "$branch:$branch"
done

echo "All branches pushed successfully!"
