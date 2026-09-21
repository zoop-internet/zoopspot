# Terms of Service & End User License Agreement (EULA) — Zoop Internet

**Effective Date:** September 7, 2026  
**Last Updated:** September 7, 2026  
**Official Domain:** [zoopnetwork.app](https://zoopnetwork.app)  
**Legal Inquiries:** [legal@zoopnetwork.app](mailto:legal@zoopnetwork.app)  
**General Support:** [support@zoopnetwork.app](mailto:support@zoopnetwork.app)  

---

## 1. Acceptance of Terms

Please read these Terms of Service and End User License Agreement ("Terms", "Agreement") carefully before using the **Zoop Internet** software applications (including the Android application, iOS application, CLI, daemon, and Web Management Console) or any associated cloud coordination services operated by Zoop Internet ("Zoop", "we", "us", or "our").

By downloading, installing, accessing, or using Zoop, you agree to be bound by these Terms and our [Privacy Policy](PRIVACY.md). If you do not agree to these Terms, do not install, access, or use Zoop.

---

## 2. The Nature of Zoop (Peer-to-Peer Architecture)

Zoop Internet is an open-source, decentralized mesh networking tool designed to facilitate direct, encrypted peer-to-peer (P2P) network connections between authorized devices.

### A. Control Plane vs. Data Plane
* **Control Plane**: Zoop operates cloud coordination infrastructure to assist authorized devices with mutual identity verification, NAT traversal candidate exchange (STUN/TURN signaling), and internal IPAM coordination.
* **Data Plane**: All network tunnels are negotiated directly between user devices using the WireGuard® protocol. **Zoop does not act as a central internet transit gateway or proxy.** When you route traffic through another device, your packets flow directly to that device (or through opaque binary relays if direct P2P is blocked by restrictive NAT).

### B. Dual Roles: Provider vs. Recipient
* **Recipient**: When you connect your device through an authorized peer, that peer serves as your network gateway.
* **Provider**: When you enable "Share My Connection" or authorize inbound connections from other devices, your device acts as an egress gateway for those connected peers.

---

## 3. End User License Agreement (EULA)

### A. Open-Source Software Grant
The underlying source code of Zoop Internet is released under the **MIT License**. Subject to the terms of the MIT License, you are granted a perpetual, worldwide, non-exclusive license to inspect, modify, fork, and compile the software.

### B. Official Binary & Mobile Application License
Subject to your compliance with these Terms, Zoop grants you a revocable, non-exclusive, non-transferable, limited license to download, install, and use the official compiled binaries and mobile applications (distributed via Google Play, Apple App Store, and official releases) on devices owned or controlled by you, solely for your personal or legitimate business purposes.

---

## 4. User Responsibilities & Cryptographic Keys

1. **Private Key Custody**: Zoop utilizes asymmetric cryptography (Ed25519 for identity and Curve25519 for WireGuard tunnels). Your private keys are generated locally on your devices and never transmitted to Zoop. You are solely responsible for safeguarding your private keys, seed phrases, and device PINs. If you lose your keys or devices, Zoop cannot recover your identity or active sessions.
2. **Access Authorization**: You have complete discretion over which devices and peers you authorize to connect to your mesh. Any traffic routed through your device by an authorized peer is initiated pursuant to your authorization.
3. **ISP & Carrier Compliance**: You are solely responsible for complying with your Internet Service Provider (ISP) or mobile carrier's Terms of Service, data usage limits, and tethering policies when acting as a Provider or Recipient. Zoop is not liable for data overage fees, bandwidth caps, or ISP throttling resulting from your use of the software.

---

## 5. Acceptable Use Policy (AUP)

You agree that you will **NOT** use Zoop, directly or indirectly, to:

1. **Violate Applicable Laws**: Engage in, facilitate, or promote any illegal activity under local, national, or international law.
2. **Infringe Intellectual Property**: Transmit or facilitate the unauthorized distribution of copyrighted materials, trade secrets, or proprietary rights.
3. **Distribute Malware or Attacks**: Distribute computer viruses, ransomware, trojans, or botnets, or conduct Denial of Service (DoS/DDoS) attacks, network port scanning, or unauthorized penetration testing against third-party networks.
4. **Harass or Exploit**: Harass, abuse, stalk, threaten, or distribute abusive material or content exploiting minors.
5. **Unauthorized Network Access**: Evade network security boundaries or bypass administrative firewalls on networks where you do not have explicit authorization from the network administrator.
6. **Commercial Resale**: Resell or commercialize the hosted free tier coordination service without written agreement from Zoop Internet.

**Violation of this Acceptable Use Policy may result in the immediate termination of your access to the Zoop Cloud coordination plane and blacklisting of associated cryptographic public keys.**

---

## 6. Provider Disclaimer & Local Egress Liability

> ### ⚠️ Crucial Notice for Providers
> When you act as a **Provider** (sharing your internet connection with other devices):
> * Inbound traffic from authorized peers will egress to the public internet using **your public IP address**.
> * Remote servers, firewalls, and law enforcement see your device's external IP as the source of that traffic.
> * **DO NOT authorize peers you do not know and trust.** You retain the ability to instantly terminate any active peer session or revoke peer authorizations at any time via the CLI or mobile interface.

To the fullest extent permissible under applicable law, Zoop Internet disclaims any liability for the actions, traffic, downloads, or legal violations committed by peers who route data through your device.

---

## 7. Disclaimers of Warranties

ZOOP INTERNET, ITS AGENTS, HOSTED INFRASTRUCTURE, AND OPEN-SOURCE CONTRIBUTORS PROVIDE THE SOFTWARE AND SERVICES **"AS IS"** AND **"AS AVAILABLE"**, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.

WITHOUT LIMITING THE FOREGOING, ZOOP DOES NOT WARRANT THAT:
1. THE SERVICES WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE;
2. NAT TRAVERSAL OR DIRECT UDP HOLE PUNCHING WILL SUCCEED IN EVERY NETWORK TOPOLOGY;
3. ROAMING RE-ESTABLISHMENT WILL BE INSTANTANEOUS ACROSS ALL CELLULAR CARRIERS;
4. THE SOFTWARE WILL MEET YOUR SPECIFIC SPEED, LATENCY, OR BANDWIDTH REQUIREMENTS.

---

## 8. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ZOOP INTERNET, ITS FOUNDERS, EMPLOYEES, AFFILIATES, AGENTS, OR CONTRIBUTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
* LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES;
* DAMAGES ARISING FROM DATA OVERAGES, ISP CONTRACT TERMINATIONS, OR CARRIER FEES;
* UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR TRANSMISSIONS OR DATA RESULTING FROM COMPROMISED USER PRIVATE KEYS;
* ACTS, OMISSIONS, OR CONTENT OF ANY THIRD-PARTY PEER AUTHORIZED BY YOU.

IN NO EVENT SHALL OUR TOTAL CUMULATIVE LIABILITY EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT PAID BY YOU TO ZOOP FOR HOSTED SERVICES IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) FIFTY US DOLLARS ($50.00 USD).

---

## 9. Indemnification

You agree to defend, indemnify, and hold harmless Zoop Internet, its officers, directors, employees, and contributors from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising out of or in any way connected with:
1. Your access to or use of Zoop;
2. Your violation of these Terms or the Acceptable Use Policy;
3. Any traffic or network activity initiated through your authorized Provider or Recipient devices;
4. Your infringement or violation of any third-party rights, including privacy or intellectual property rights.

---

## 10. Modifications to the Service and Terms

We reserve the right to modify or discontinue, temporarily or permanently, the hosted coordination service (or any part thereof) with or without notice.

We may revise these Terms from time to time. If a revision is material, we will provide at least thirty (30) days' notice prior to any new terms taking effect via our website ([zoopnetwork.app](https://zoopnetwork.app)) or git release notes. By continuing to access or use Zoop after revisions become effective, you agree to be bound by the revised Terms.

---

## 11. Severability & Entire Agreement

If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force and effect. These Terms, together with our Privacy Policy, constitute the entire agreement between you and Zoop regarding the subject matter herein.

---

## 12. Contact Information

If you have any questions, legal notices, or feedback regarding these Terms, please contact:

* **Legal Notices:** [legal@zoopnetwork.app](mailto:legal@zoopnetwork.app)
* **General Support:** [support@zoopnetwork.app](mailto:support@zoopnetwork.app)
* **Website:** [https://zoopnetwork.app](https://zoopnetwork.app)
* **GitHub Issues:** [https://github.com/allannuwamanya/zoop/issues](https://github.com/allannuwamanya/zoop/issues)
