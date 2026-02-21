const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY as string;
const PINATA_SECRET = import.meta.env.VITE_PINATA_SECRET as string;

export interface CertificateMetadata {
  studentName: string;
  studentAddress: string;
  courseName: string;
  issuerName: string;
  issuedDate: string;
  certificateId?: number;
  grade?: string;
  description?: string;
}

// Metadata IPFS pe upload karo
export async function uploadMetadataToIPFS(
  metadata: CertificateMetadata
): Promise<string> {
  const body = JSON.stringify({
    pinataContent: metadata,
    pinataMetadata: {
      name: `cert-${metadata.studentName}-${Date.now()}`,
      keyvalues: {
        studentName: metadata.studentName,
        courseName: metadata.courseName,
      },
    },
    pinataOptions: {
      cidVersion: 1,
    },
  });

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`IPFS upload failed: ${err.error?.details || res.statusText}`);
  }

  const data = await res.json();
  return data.IpfsHash; // CID return hoga
}

// IPFS gateway URL banao
export function getIPFSUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

// Metadata fetch karo IPFS se
export async function fetchMetadataFromIPFS(
  cid: string
): Promise<CertificateMetadata> {
  const res = await fetch(getIPFSUrl(cid));
  if (!res.ok) throw new Error("Failed to fetch metadata from IPFS");
  return res.json();
}