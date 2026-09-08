import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const deployments = [
  {
    name: "DSC USDA",
    repo: "https://github.com/dev-in-portfolio/dscusda.git",
    siteId: "6667aab1-a84e-4b9f-b3fa-7498afbe406c",
    proxyEnv: "DSC_USDA_DEPLOY_PROXY",
  },
  {
    name: "Dark Star Art",
    repo: "https://github.com/dev-in-portfolio/dscart.git",
    siteId: "d99d71b7-038f-4371-828f-754bedc616c3",
    proxyEnv: "DSC_ART_DEPLOY_PROXY",
  },
];

for (const deployment of deployments) {
  const proxyPath = process.env[deployment.proxyEnv];
  if (!proxyPath) {
    throw new Error(`Missing secured build variable: ${deployment.proxyEnv}`);
  }

  const workspace = mkdtempSync(join(tmpdir(), "dsc-netlify-closeout-"));
  const repoDir = join(workspace, "site");

  try {
    console.log(`Deploying ${deployment.name} from current main...`);
    execSync(`git clone --depth 1 ${deployment.repo} "${repoDir}"`, {
      stdio: "inherit",
    });

    execFileSync(
      "npx",
      [
        "-y",
        "@netlify/mcp@latest",
        "--site-id",
        deployment.siteId,
        "--proxy-path",
        proxyPath,
      ],
      {
        cwd: repoDir,
        stdio: "inherit",
        env: process.env,
      },
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}
