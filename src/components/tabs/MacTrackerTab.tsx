import React, { useState } from 'react';
import {
  Cpu,
  Shield,
  ShieldCheck,
  Search,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  Wifi,
  Signal,
  ArrowRight,
  Info,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { NetworkInterface } from '../../types/network';
import { copyText } from '../../utils/clipboard';
import {
  formatMac,
  generateRandomizedMac,
  isLocallyAdministered,
  lookupMacDetails
} from '../../utils/macUtils';

interface MacTrackerTabProps {
  interfaces: NetworkInterface[];
  onUpdateInterfaceMac: (interfaceName: string, newMac: string, isRandomized: boolean) => void;
  onShowToast: (msg: string) => void;
}

export const MacTrackerTab: React.FC<MacTrackerTabProps> = ({
  interfaces,
  onUpdateInterfaceMac,
  onShowToast,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('38:F9:D3:84:C1:20');
  const [searchResult, setSearchResult] = useState(lookupMacDetails('38:F9:D3:84:C1:20'));
  const [macFormat, setMacFormat] = useState<':' | '-' | '.' | 'none'>(':');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const wlanInterface = interfaces.find((i) => i.name === 'wlan0') || interfaces[0];

  const copyToClipboard = (text: string, label: string, key: string) => {
    void copyText(text).then((copied) => {
      if (!copied) { onShowToast('Clipboard unavailable; select and copy the text manually.'); return; }
      setCopiedKey(key);
      onShowToast(`Copied ${label} to clipboard`);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const handleToggleRandomization = () => {
    if (wlanInterface.isRandomized) {
      // Switch to Hardware MAC
      onUpdateInterfaceMac('wlan0', wlanInterface.hardwareMac, false);
      onShowToast('Updated the sample profile only; device MAC was not changed.');
    } else {
      // Switch to Randomized MAC
      const newRandomMac = generateRandomizedMac();
      onUpdateInterfaceMac('wlan0', newRandomMac, true);
      onShowToast('Generated a sample randomized MAC; device settings were not changed.');
    }
  };

  const handleRegenerateRandomMac = () => {
    const newRandomMac = generateRandomizedMac();
    onUpdateInterfaceMac('wlan0', newRandomMac, true);
    onShowToast('Generated a sample MAC only; it is not applied to Wi-Fi.');
  };

  const handleSearchMac = (val: string) => {
    setSearchQuery(val);
    const result = lookupMacDetails(val);
    setSearchResult(result);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 overflow-y-auto max-w-xl mx-auto">
      <p className="rounded-xl border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-[11px] leading-relaxed text-amber-200">This is a sample interface profile. Browsers cannot read or change the Android device’s MAC address. Generated addresses are examples only.</p>
      {/* 1. Android Wi-Fi MAC & Privacy Control Hero Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Sample Interface MAC (wlan0)</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
            Sample adapter · not detected
          </span>
        </div>

        {/* Active MAC Hero Display */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">Current Transmitting Address</span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                wlanInterface.isRandomized
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {wlanInterface.isRandomized ? 'Randomized (Private)' : 'Device Factory MAC'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="font-mono text-xl font-extrabold text-white tracking-widest select-all tabular-nums">
              {formatMac(wlanInterface.activeMac, macFormat)}
            </div>
            <button
              onClick={() =>
                copyToClipboard(
                  formatMac(wlanInterface.activeMac, macFormat),
                  'Active MAC',
                  'active-mac'
                )
              }
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copy Active MAC"
            >
              {copiedKey === 'active-mac' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Quick Format Selector */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span>Format:</span>
            {([':', '-', '.', 'none'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setMacFormat(fmt)}
                className={`px-2 py-0.5 rounded font-mono cursor-pointer transition-colors ${
                  macFormat === fmt ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {fmt === 'none' ? 'RAW' : fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Android MAC Privacy Toggle Switch */}
        <div className="flex items-center justify-between p-3.5 bg-slate-950/50 rounded-2xl border border-slate-800/60 mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${wlanInterface.isRandomized ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">
                MAC Randomization Preview
              </div>
              <div className="text-[11px] text-slate-400">
                {wlanInterface.isRandomized
                  ? 'Sample profile · randomized flag'
                  : 'Sample profile · factory flag'}
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleRandomization}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
              wlanInterface.isRandomized ? 'bg-teal-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                wlanInterface.isRandomized ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons: New Random MAC & QR Code */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleRegenerateRandomMac}
            className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
            <span>Generate Sample MAC</span>
          </button>
          <button
            onClick={() => setShowQrModal(true)}
            className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-teal-400" />
            <span>Router Share QR</span>
          </button>
        </div>
      </div>

      {/* 2. Device Network Interfaces List */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Android System Interfaces</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Kernel /sys/class/net</span>
        </div>

        <div className="flex flex-col gap-3">
          {interfaces.map((iface) => (
            <div
              key={iface.name}
              className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-teal-400">{iface.name}</span>
                  <span className="text-slate-300 font-semibold">{iface.displayName}</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    iface.status === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : iface.status === 'idle'
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {iface.status.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300 mb-1">
                <span className="text-[11px] text-slate-400">MAC Address:</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-semibold text-white">{iface.activeMac}</span>
                  <button
                    onClick={() => copyToClipboard(iface.activeMac, iface.name, iface.name)}
                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {copiedKey === iface.name ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {iface.bssid && (
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>AP BSSID:</span>
                  <span className="font-mono text-slate-300">{iface.bssid}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-400 text-[11px] mt-1 pt-1 border-t border-slate-900">
                <span>Chipset / Modem:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{iface.vendor}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. OUI Hardware Vendor Lookup Tool */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">IEEE OUI Hardware Vendor Lookup</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Database</span>
        </div>

        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchMac(e.target.value)}
            placeholder="Search MAC or OUI (e.g. 38:F9:D3 or FC:EC:DA)"
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
        </div>

        {/* Quick sample chips */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3 text-[10px] text-slate-400">
          <span>Try:</span>
          {['38:F9:D3 (Samsung)', '3C:5A:37 (Pixel)', '00:1C:B3 (Apple)', '50:C7:BF (TP-Link)', '34:13:E8 (Intel)'].map((sample) => {
            const mac = sample.split(' ')[0];
            return (
              <button
                key={mac}
                onClick={() => handleSearchMac(mac)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-mono cursor-pointer transition-colors"
              >
                {sample}
              </button>
            );
          })}
        </div>

        {/* Result Card */}
        <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span>Identified Manufacturer / Profile:</span>
            <span className={`text-[10px] font-mono font-semibold ${searchResult.isRandomized ? 'text-indigo-400' : 'text-teal-400'}`}>
              {searchResult.isRandomized ? 'Android Private MAC' : 'Burned-in OUI'}
            </span>
          </div>
          <div className="text-sm font-bold text-white mb-2">{searchResult.vendor}</div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <div>
              <span>Locally Administered: </span>
              <span className="font-semibold text-slate-200">
                {searchResult.isRandomized ? 'Yes (Randomized)' : 'No (Universal)'}
              </span>
            </div>
            <div>
              <span>Delivery Type: </span>
              <span className="font-semibold text-slate-200">
                {searchResult.isMulticast ? 'Multicast' : 'Unicast'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Android IEEE 802 Education Card */}
      <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-teal-400 font-semibold mb-1.5">
          <Info className="w-4 h-4 shrink-0" />
          <span>How Android Protects Your MAC Address</span>
        </div>
        <p className="leading-relaxed text-slate-400 mb-2">
          Under the IEEE 802 standard, when the 2nd least-significant bit of the first byte is set to <code className="text-teal-300">1</code> (meaning the second hex digit is <strong>2, 6, A, or E</strong>), the address is marked as a <em>Locally Administered Address (LAA)</em>.
        </p>
        <p className="leading-relaxed text-slate-400">
          Android 10 through Android 15 generates a unique randomized MAC per Wi-Fi network (SSID). This prevents retail beacons and Wi-Fi networks from tracking your physical movement across stores or cities.
        </p>
      </div>

      {/* Router Share QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h4 className="text-base font-bold text-white mb-1">Router Whitelist Credentials</h4>
            <p className="text-xs text-slate-400 mb-4">
              Share this hardware profile with your network administrator to allow Wi-Fi access.
            </p>

            {/* Stylized Simulated QR Matrix */}
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl flex flex-col items-center justify-center shadow-inner mb-4">
              <QrCode className="w-36 h-36 text-slate-900 stroke-[1.8]" />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-left mb-4 border border-slate-800">
              <div className="text-slate-400 text-[10px]">DEVICE HARDWARE MAC:</div>
              <div className="font-bold text-teal-400">{wlanInterface.hardwareMac}</div>
              <div className="text-slate-400 text-[10px] mt-1">RANDOMIZED MAC:</div>
              <div className="font-bold text-white">{wlanInterface.activeMac}</div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
