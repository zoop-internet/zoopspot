import React from 'react';
import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';

/* ─── Downloads Matrix Data for ZoopSpot ───────────────────────────────── */
export interface DownloadItem {
  id: string;
  name: string;
  sub: string;
  icon: React.ReactNode;
  primaryAction: { label: string; file: string };
  secondaryActions?: { label: string; file: string }[];
  installCommand?: string;
}

export const DOWNLOAD_DATA: DownloadItem[] = [
  {
    id: 'mikrotik',
    name: 'MikroTik RouterOS v7',
    sub: 'Native 1-click provisioning script for RouterOS v7.12+. Zero custom binary needed on router.',
    icon: <Ico d={Icons.server} size={22} />,
    primaryAction: { label: 'Download .rsc Script', file: 'zoopspot-mikrotik-provision.rsc' },
    secondaryActions: [
      { label: 'View Script Source', file: 'https://github.com/zoop-internet/zoopspot' },
    ],
    installCommand: '/tool fetch url="https://cloud.zoopspot.io/provision/mikrotik.rsc" dst-path=zoopspot.rsc; /import zoopspot.rsc',
  },
  {
    id: 'openwrt',
    name: 'OpenWrt Router Client',
    sub: 'Lightweight zoopspot-router daemon for OpenWrt 21.02+ (MIPS, ARM, x86_64).',
    icon: <Ico d={Icons.terminal} size={22} />,
    primaryAction: { label: 'Download MIPS .ipk', file: 'zoopspot-router_mips.ipk' },
    secondaryActions: [
      { label: 'ARM64 (.ipk)', file: 'zoopspot-router_arm64.ipk' },
      { label: 'x86_64 (.tar.gz)', file: 'zoopspot-router_amd64.tar.gz' },
    ],
    installCommand: 'opkg install https://cloud.zoopspot.io/downloads/zoopspot-router_mips.ipk',
  },
  {
    id: 'cloud',
    name: 'ZoopSpot Cloud (Self-Hosted)',
    sub: 'Full REST API, payment webhook processor, and WireGuard controller binary.',
    icon: <Ico d={Icons.laptop} size={22} />,
    primaryAction: { label: 'Linux amd64 Binary', file: 'zoopspot-cloud-linux-amd64' },
    secondaryActions: [
      { label: 'Linux ARM64', file: 'zoopspot-cloud-linux-arm64' },
      { label: 'Docker Container', file: 'docker pull ghcr.io/zoop-internet/zoopspot-cloud:latest' },
    ],
    installCommand: 'docker run -d -p 8080:8080 -p 51820:51820/udp ghcr.io/zoop-internet/zoopspot-cloud:latest',
  },
  {
    id: 'voucher-cli',
    name: 'Voucher Printer & CLI',
    sub: 'Command-line tool to generate batches of 8-digit scratch vouchers and export printable A4 PDFs.',
    icon: <Ico d={Icons.download} size={22} />,
    primaryAction: { label: 'Download CLI (Linux)', file: 'zoopspot-voucher-linux-amd64' },
    secondaryActions: [
      { label: 'macOS CLI', file: 'zoopspot-voucher-darwin-universal' },
      { label: 'Windows CLI (.exe)', file: 'zoopspot-voucher-windows-amd64.exe' },
    ],
    installCommand: 'curl -fsSL https://get.zoopspot.io/voucher | sh',
  },
];
