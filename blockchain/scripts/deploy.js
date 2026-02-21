import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  console.log("Deploying CertificateRegistry...");

  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const contract = await CertificateRegistry.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ CertificateRegistry deployed to: ${address}`);
  console.log(`\nAdd this to your frontend .env:`);
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});