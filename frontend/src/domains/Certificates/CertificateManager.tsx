import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import { useWeb3 } from "../../blockchain/useWeb3";
import { uploadMetadataToIPFS, getIPFSUrl, fetchMetadataFromIPFS } from "../../blockchain/ipfs";

// ── Types ─────────────────────────────────────────────────────────────────
interface CertificateData {
  isValid: boolean;
  studentName: string;
  courseName: string;
  ipfsHash: string;
  issuedAt: string;
  issuedTo: string;
}

// ── Wallet Connect Button ─────────────────────────────────────────────────
export function WalletConnect() {
  const {
    account,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    error,
    chainId,
  } = useWeb3();

  return (
    <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
      {error && (
        <Alert severity="error" sx={{ py: 0 }}>
          {error}
        </Alert>
      )}
      {isConnected ? (
        <>
          <Chip
            label={`${account?.slice(0, 6)}...${account?.slice(-4)}`}
            color="success"
            variant="outlined"
          />
          <Chip label={`Chain ID: ${chainId}`} size="small" variant="outlined" />
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={disconnect}
          >
            Disconnect
          </Button>
        </>
      ) : (
        <Button
          variant="contained"
          onClick={connect}
          disabled={isConnecting}
          startIcon={isConnecting ? <CircularProgress size={16} /> : null}
        >
          {isConnecting ? "Connecting..." : "🦊 Connect MetaMask"}
        </Button>
      )}
    </Stack>
  );
}

// ── Issue Certificate Tab ─────────────────────────────────────────────────
function IssueCertificate() {
  const { contract, isConnected } = useWeb3();
  const [form, setForm] = useState({
    studentAddress: "",
    studentName: "",
    courseName: "",
    grade: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    certId: string;
    ipfsHash: string;
  } | null>(null);
  const [error, setError] = useState("");

  const handleIssue = async () => {
    if (!contract) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Step 1 — IPFS pe metadata upload
      const ipfsHash = await uploadMetadataToIPFS({
        studentName: form.studentName,
        studentAddress: form.studentAddress,
        courseName: form.courseName,
        issuerName: "School Admin",
        issuedDate: new Date().toISOString(),
        grade: form.grade,
        description: form.description,
      });

      // Step 2 — Smart contract call
      const tx = await contract.issueCertificate(
        form.studentAddress,
        form.studentName,
        form.courseName,
        ipfsHash
      );

      // Step 3 — Transaction confirm hone ka wait
      const receipt = await tx.wait();

      // Step 4 — Event se cert ID nikalo
      const event = receipt.logs?.find(
        (log: any) => log?.fragment?.name === "CertificateIssued"
      );
      const certId = event?.args?.[0]?.toString() || "N/A";

      setResult({ certId, ipfsHash });

      // Form reset
      setForm({
        studentAddress: "",
        studentName: "",
        courseName: "",
        grade: "",
        description: "",
      });
    } catch (err: any) {
      setError(err.reason || err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    form.studentAddress && form.studentName && form.courseName;

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          📜 Issue New Certificate
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Certificate will be stored on blockchain + IPFS permanently
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Student Wallet Address"
            value={form.studentAddress}
            onChange={(e) =>
              setForm({ ...form, studentAddress: e.target.value })
            }
            placeholder="0x..."
            fullWidth
            size="small"
            required
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Student Name"
              value={form.studentName}
              onChange={(e) =>
                setForm({ ...form, studentName: e.target.value })
              }
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Grade (Optional)"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              fullWidth
              size="small"
            />
          </Stack>
          <TextField
            label="Course / Achievement"
            value={form.courseName}
            onChange={(e) => setForm({ ...form, courseName: e.target.value })}
            fullWidth
            size="small"
            required
          />
          <TextField
            label="Description (Optional)"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            fullWidth
            size="small"
            multiline
            rows={2}
          />

          {!isConnected && (
            <Alert severity="warning">
              Wallet connect karo pehle certificate issue karne ke liye
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={handleIssue}
            disabled={!isConnected || loading || !isFormValid}
            startIcon={
              loading ? <CircularProgress size={16} color="inherit" /> : null
            }
            size="large"
          >
            {loading ? "Issuing on Blockchain..." : "Issue Certificate"}
          </Button>

          {error && <Alert severity="error">{error}</Alert>}

          {result && (
            <Alert severity="success">
              <Typography variant="body2" fontWeight={700} mb={1}>
                ✅ Certificate Issued Successfully!
              </Typography>
              <Typography variant="body2">
                <strong>Certificate ID:</strong> #{result.certId}
              </Typography>
              <Typography variant="body2">
                <strong>IPFS Hash:</strong> {result.ipfsHash}{" "}
                <a
                  href={getIPFSUrl(result.ipfsHash)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#1976d2" }}
                >
                  View on IPFS ↗
                </a>
              </Typography>
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Verify Certificate Tab ────────────────────────────────────────────────
function VerifyCertificate() {
  const { contract } = useWeb3();
  const [certId, setCertId] = useState("");
  const [loading, setLoading] = useState(false);
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!contract || !certId) return;
    setLoading(true);
    setError("");
    setCert(null);

    try {
      const [isValid, studentName, courseName, ipfsHash, issuedAt, issuedTo] =
        await contract.verifyCertificate(Number(certId));

      setCert({
        isValid,
        studentName,
        courseName,
        ipfsHash,
        issuedAt: new Date(Number(issuedAt) * 1000).toLocaleDateString(
          "en-IN",
          { day: "numeric", month: "long", year: "numeric" }
        ),
        issuedTo,
      });
    } catch (err: any) {
      setError(err.reason || "Certificate not found on blockchain");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          🔍 Verify Certificate
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Certificate ID se on-chain verification karo
        </Typography>

        <Stack spacing={2}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Certificate ID"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              size="small"
              type="number"
              fullWidth
              placeholder="e.g. 1"
            />
            <Button
              variant="contained"
              onClick={handleVerify}
              disabled={loading || !certId}
              sx={{ whiteSpace: "nowrap", minWidth: 120 }}
            >
              {loading ? <CircularProgress size={20} /> : "Verify"}
            </Button>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {cert && (
            <Alert severity={cert.isValid ? "success" : "error"}>
              <Typography variant="body2" fontWeight={700} mb={1}>
                {cert.isValid
                  ? "✅ Certificate is VALID"
                  : "❌ Certificate is REVOKED"}
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <strong>Student:</strong> {cert.studentName}
                </Typography>
                <Typography variant="body2">
                  <strong>Course:</strong> {cert.courseName}
                </Typography>
                <Typography variant="body2">
                  <strong>Issued On:</strong> {cert.issuedAt}
                </Typography>
                <Typography variant="body2">
                  <strong>Wallet:</strong> {cert.issuedTo}
                </Typography>
                <Typography variant="body2">
                    <strong>IPFS Hash:</strong> {cert.ipfsHash}{" "}
                    <a
                      href={getIPFSUrl(cert.ipfsHash)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#1976d2" }}
                    >
                      View on IPFS ↗
                    </a>
                </Typography>
              </Stack>
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Student Certificates Tab ──────────────────────────────────────────────
function StudentCertificates() {
  const { contract } = useWeb3();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [certs, setCerts] = useState<CertificateData[]>([]);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!contract || !address) return;
    setLoading(true);
    setError("");
    setCerts([]);

    try {
      const ids: bigint[] = await contract.getStudentCertificates(address);

      if (ids.length === 0) {
        setError("No certificates found for this address");
        return;
      }

      const certDetails = await Promise.all(
        ids.map(async (id) => {
          const [isValid, studentName, courseName, ipfsHash, issuedAt, issuedTo] =
            await contract.verifyCertificate(id);
          return {
            isValid,
            studentName,
            courseName,
            ipfsHash,
            issuedAt: new Date(Number(issuedAt) * 1000).toLocaleDateString(),
            issuedTo,
          };
        })
      );

      setCerts(certDetails);
    } catch (err: any) {
      setError(err.reason || "Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          🎓 Student Certificates
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Kisi bhi student ke saare certificates dekho
        </Typography>

        <Stack spacing={2}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Student Wallet Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              size="small"
              fullWidth
              placeholder="0x..."
            />
            <Button
              variant="contained"
              onClick={handleFetch}
              disabled={loading || !address}
              sx={{ whiteSpace: "nowrap", minWidth: 120 }}
            >
              {loading ? <CircularProgress size={20} /> : "Fetch"}
            </Button>
          </Stack>

          {error && <Alert severity="info">{error}</Alert>}

          {certs.length > 0 && (
            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell><strong>Student</strong></TableCell>
                    <TableCell><strong>Course</strong></TableCell>
                    <TableCell><strong>Issued On</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>IPFS</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {certs.map((cert, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{cert.studentName}</TableCell>
                      <TableCell>{cert.courseName}</TableCell>
                      <TableCell>{cert.issuedAt}</TableCell>
                      <TableCell>
                        <Chip
                          label={cert.isValid ? "Valid" : "Revoked"}
                          color={cert.isValid ? "success" : "error"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        
                        <a
                          href={getIPFSUrl(cert.ipfsHash)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#1976d2" }}
                        >
                          View on IPFS ↗
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
 function CertificateManager() {
  const [tab, setTab] = useState(0);
  const { contract } = useWeb3();
  const [totalCerts, setTotalCerts] = useState<string>("...");

  // Total certificates fetch karo
  React.useEffect(() => {
    if (contract) {
      contract
        .getTotalCertificates()
        .then((n: bigint) => setTotalCerts(n.toString()))
        .catch(() => setTotalCerts("N/A"));
    }
  }, [contract]);

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Certificate Management
          </Typography>
          <Typography color="text.secondary">
            Blockchain-powered • Tamper-proof • Permanently verifiable
          </Typography>
          <Chip
            label={`Total Issued: ${totalCerts}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </Box>
        <WalletConnect />
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3 }}
        variant="scrollable"
      >
        <Tab label="📜 Issue Certificate" />
        <Tab label="🔍 Verify Certificate" />
        <Tab label="🎓 Student Certificates" />
      </Tabs>

      {/* Tab Content */}
      {tab === 0 && <IssueCertificate />}
      {tab === 1 && <VerifyCertificate />}
      {tab === 2 && <StudentCertificates />}
    </Box>
  );
}

export default CertificateManager;