import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';

/* ─── Downloads Matrix Data ────────────────────────────────────────────── */
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
    id: 'linux',
    name: 'Linux',
    sub: 'Lightweight background service for Ubuntu, Debian, Fedora & servers.',
    icon: <Ico d={Icons.server} size={22} />,
    primaryAction: { label: 'Download .deb', file: 'zoop_linux_amd64.deb' },
    secondaryActions: [
      { label: '.tar.gz binary', file: 'zoop_linux_amd64.tar.gz' },
      { label: 'ARM64 (.deb)', file: 'zoop_linux_arm64.deb' },
    ],
    installCommand: 'curl -fsSL https://get.zoop.dev | sh',
  },
  {
    id: 'macos',
    name: 'macOS',
    sub: 'One-click installer for Apple Silicon (M1/M2/M3/M4) & Intel Macs.',
    icon: <Ico d={Icons.apple} size={22} />,
    primaryAction: { label: 'Download Installer (.pkg)', file: 'Zoop-macOS-universal.pkg' },
    secondaryActions: [
      { label: 'Apple Silicon .dmg', file: 'Zoop-macOS-arm64.dmg' },
      { label: 'Intel .dmg', file: 'Zoop-macOS-x64.dmg' },
    ],
    installCommand: 'brew install zoop-internet/tap/zoop',
  },
  {
    id: 'windows',
    name: 'Windows',
    sub: 'Fast Windows installer with seamless background tray support.',
    icon: <Ico d={Icons.laptop} size={22} />,
    primaryAction: { label: 'Download Installer (.msi)', file: 'Zoop-Windows-x64-Setup.msi' },
    secondaryActions: [
      { label: 'Standalone .zip', file: 'zoop_windows_x64.zip' },
      { label: 'ARM64 Installer', file: 'Zoop-Windows-arm64.msi' },
    ],
    installCommand: 'winget install zoop-internet.zoop',
  },
  {
    id: 'mobile',
    name: 'Phones & Routers',
    sub: 'One-tap apps for Android phones, iPhones, and home Wi-Fi routers.',
    icon: <Ico d={Icons.smartphone} size={22} />,
    primaryAction: { label: 'Android App (APK)', file: 'zoop-android-release.apk' },
    secondaryActions: [
      { label: 'iOS App Store / TestFlight', file: 'https://testflight.apple.com/join/zoop' },
      { label: 'Home Router (.ipk)', file: 'zoop-router_mipsel.ipk' },
    ],
    installCommand: 'opkg install zoop-router',
  },
];
