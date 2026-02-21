export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;

export const CONTRACT_ABI = [
  // Write Functions
  "function issueCertificate(address _studentAddress, string _studentName, string _courseName, string _ipfsHash) returns (uint256)",
  "function revokeCertificate(uint256 _certId)",
  "function addIssuer(address _issuer)",
  "function removeIssuer(address _issuer)",

  // Read Functions
  "function verifyCertificate(uint256 _certId) view returns (bool isValid, string studentName, string courseName, string ipfsHash, uint256 issuedAt, address issuedTo)",
  "function verifyByHash(string _ipfsHash) view returns (bool isValid, uint256 certId)",
  "function getStudentCertificates(address _student) view returns (uint256[])",
  "function getTotalCertificates() view returns (uint256)",
  "function authorizedIssuers(address) view returns (bool)",
  "function certificates(uint256) view returns (uint256 id, address issuedTo, string studentName, string courseName, string ipfsHash, uint256 issuedAt, bool isValid)",

  // Events
  "event CertificateIssued(uint256 indexed id, address indexed issuedTo, string studentName, string courseName, string ipfsHash, uint256 issuedAt)",
  "event CertificateRevoked(uint256 indexed id, address revokedBy)",
  "event IssuerAdded(address indexed issuer)",
  "event IssuerRemoved(address indexed issuer)",
];