// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateRegistry is Ownable {

    uint256 private _certificateIds;

    struct Certificate {
        uint256 id;
        address issuedTo;
        string studentName;
        string courseName;
        string ipfsHash;
        uint256 issuedAt;
        bool isValid;
    }

    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256[]) public studentCertificates;
    mapping(string => uint256) public hashToCertificate;
    mapping(address => bool) public authorizedIssuers;

    event CertificateIssued(
        uint256 indexed id,
        address indexed issuedTo,
        string studentName,
        string courseName,
        string ipfsHash,
        uint256 issuedAt
    );
    event CertificateRevoked(uint256 indexed id, address revokedBy);
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    modifier onlyIssuer() {
        require(
            authorizedIssuers[msg.sender] || msg.sender == owner(),
            "Not authorized issuer"
        );
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedIssuers[msg.sender] = true;
    }

    function addIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = true;
        emit IssuerAdded(_issuer);
    }

    function removeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = false;
        emit IssuerRemoved(_issuer);
    }

    function issueCertificate(
        address _studentAddress,
        string memory _studentName,
        string memory _courseName,
        string memory _ipfsHash
    ) external onlyIssuer returns (uint256) {
        require(_studentAddress != address(0), "Invalid student address");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(hashToCertificate[_ipfsHash] == 0, "Certificate already exists");

        _certificateIds++;
        uint256 newId = _certificateIds;

        certificates[newId] = Certificate({
            id: newId,
            issuedTo: _studentAddress,
            studentName: _studentName,
            courseName: _courseName,
            ipfsHash: _ipfsHash,
            issuedAt: block.timestamp,
            isValid: true
        });

        studentCertificates[_studentAddress].push(newId);
        hashToCertificate[_ipfsHash] = newId;

        emit CertificateIssued(
            newId,
            _studentAddress,
            _studentName,
            _courseName,
            _ipfsHash,
            block.timestamp
        );

        return newId;
    }

    function revokeCertificate(uint256 _certId) external onlyIssuer {
        require(certificates[_certId].id != 0, "Certificate does not exist");
        require(certificates[_certId].isValid, "Already revoked");
        certificates[_certId].isValid = false;
        emit CertificateRevoked(_certId, msg.sender);
    }

    function verifyCertificate(uint256 _certId)
        external
        view
        returns (
            bool isValid,
            string memory studentName,
            string memory courseName,
            string memory ipfsHash,
            uint256 issuedAt,
            address issuedTo
        )
    {
        Certificate memory cert = certificates[_certId];
        require(cert.id != 0, "Certificate does not exist");
        return (cert.isValid, cert.studentName, cert.courseName, cert.ipfsHash, cert.issuedAt, cert.issuedTo);
    }

    function verifyByHash(string memory _ipfsHash)
        external
        view
        returns (bool isValid, uint256 certId)
    {
        certId = hashToCertificate[_ipfsHash];
        require(certId != 0, "No certificate found");
        isValid = certificates[certId].isValid;
    }

    function getStudentCertificates(address _student)
        external
        view
        returns (uint256[] memory)
    {
        return studentCertificates[_student];
    }

    function getTotalCertificates() external view returns (uint256) {
        return _certificateIds;
    }
}