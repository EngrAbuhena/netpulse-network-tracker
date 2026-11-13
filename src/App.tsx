import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Signal,
  SlidersHorizontal,
  Smartphone,
  Maximize2,
  RefreshCw,
  Radio,
  CheckCircle2
} from 'lucide-react';
import {
  ConnectionApiDetails,
  IpChangeEvent,
  LocalIpInfo,
  NetworkInterface,
  PublicIpInfo,
  SpeedTestRecord
} from './types/network';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidNavBar, TabType } from './components/AndroidNavBar';
import { QuickSettingsDrawer } from './components/QuickSettingsDrawer';
import { DashboardTab } from './components/tabs/DashboardTab';
import { SpeedTestTab } from './components/tabs/SpeedTestTab';
import { IpTrackerTab } from './components/tabs/IpTrackerTab';
import { MacTrackerTab } from './components/tabs/MacTrackerTab';
import { ToolsTab } from './components/tabs/ToolsTab';
import { getDefaultAndroidInterfaces } from './utils/macUtils';
import { detectLocalIpViaWebRTC, fetchPublicIpDetails } from './utils/ipUtils';
import { getNavigatorConnection } from './utils/speedTestEngine';

export default function App() {
  // Navigation & Viewport State
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState<boolean>(false);
  const [accentColor, setAccentColor] = useState<string>('teal');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Network & Hardware State
  const [networkType, setNetworkType] = useState<'wifi' | 'cellular'>('wifi');
  const [isVpnActive, setIsVpnActive] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [dataSaver, setDataSaver] = useState<boolean>(false);
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>(getDefaultAndroidInterfaces());
  const [connection, setConnection] = useState<ConnectionApiDetails>(getNavigatorConnection());

  // IP State
  const [publicIp, setPublicIp] = useState<PublicIpInfo | null>(null);
  const [localIp, setLocalIp] = useState<LocalIpInfo | null>(null);
  const [isRefreshingIp, setIsRefreshingIp] = useState<boolean>(false);
  const [ipHistory, setIpHistory] = useState<IpChangeEvent[]>([]);

  // Speed Telemetry State
  const [speedRecords, setSpeedRecords] = useState<SpeedTestRecord[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3000);
  };

  // Initial IP & Hardware Detection
  const loadIpData = async (triggerReason = 'Manual Refresh') => {
    setIsRefreshingIp(true);
    try {
      const [pubResult, localResult] = await Promise.all([
        fetchPublicIpDetails(),
        detectLocalIpViaWebRTC(),
      ]);

      if (pubResult) {
        setPublicIp((prev) => {
          if (prev && prev.ip !== pubResult.ip) {
            const newEvent: IpChangeEvent = {
              id: `evt_${Date.now()}`,
              timestamp: Date.now(),
              oldIp: prev.ip,
              newIp: pubResult.ip,
              networkType: connection.type?.toUpperCase() || 'UNKNOWN',
              reason: triggerReason,
            };
            setIpHistory((hist) => [newEvent, ...hist].slice(0, 20));
            showToast(`Public IP changed: ${prev.ip} → ${pubResult.ip}`);
          }
          return pubResult;
        });
      }
      setLocalIp(localResult);
    } catch (err) {
      console.warn('IP resolution error:', err);
    } finally {
      setIsRefreshingIp(false);
    }
  };

  useEffect(() => {
    loadIpData('App startup');
  }, []);

  // Periodic Auto-refresh (every 30s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadIpData('Periodic Auto-Sync');
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Listen to Network changes
  useEffect(() => {
    const handleOnline = () => {
      setConnection(getNavigatorConnection());
      showToast('Network Connection Restored');
      loadIpData('Network Reconnect');
    };

    const handleOffline = () => {
      setConnection((c) => ({ ...c, online: false }));
      showToast('Device is Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navConn = (navigator as any).connection;
    if (navConn) {
      const handleChange = () => {
        setConnection(getNavigatorConnection());
        loadIpData('Network Connection API Change');
      };
      navConn.addEventListener('change', handleChange);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        navConn.removeEventListener('change', handleChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Network Switch Toggles
  const handleToggleNetworkType = () => {
    const nextType = networkType === 'wifi' ? 'cellular' : 'wifi';
    setNetworkType(nextType);

    setInterfaces((prev) =>
      prev.map((i) => {
        if (i.name === 'wlan0') return { ...i, status: nextType === 'wifi' ? 'connected' : 'idle' };
        if (i.name === 'rmnet_data0') return { ...i, status: nextType === 'cellular' ? 'connected' : 'idle' };
        return i;
      })
    );

    showToast('Display-only network preview changed; device Wi-Fi/mobile data was not changed.');
  };

  const handleToggleVpn = () => {
    const nextVpn = !isVpnActive;
    setIsVpnActive(nextVpn);

    setInterfaces((prev) =>
      prev.map((i) => (i.name === 'tun0' ? { ...i, status: nextVpn ? 'connected' : 'disconnected' } : i))
    );

    showToast('Display-only VPN preview changed; no device VPN connection was changed.');
  };

  const handleUpdateInterfaceMac = (interfaceName: string, newMac: string, isRandomized: boolean) => {
    setInterfaces((prev) =>
      prev.map((i) =>
        i.name === interfaceName ? { ...i, activeMac: newMac, isRandomized } : i
      )
    );
  };

  const handleAddSpeedRecord = (record: SpeedTestRecord) => {
    setSpeedRecords((prev) => [record, ...prev].slice(0, 50));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-0 md:p-6 font-sans">
      {/* Top Desktop Controls Bar (for device frame switch & quick status) */}
      <header className="hidden md:flex items-center justify-between w-full max-w-4xl px-4 py-2.5 mb-3 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">NetPulse Android Network Suite</h1>
            <p className="text-[11px] text-slate-400">Browser-based IP and HTTP speed diagnostics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Interface Badge */}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/80 font-mono text-slate-300">
            {networkType === 'wifi' ? <Wifi className="w-3.5 h-3.5 text-teal-400" /> : <Signal className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{networkType === 'wifi' ? 'Wi-Fi preview' : 'Cellular preview'}</span>
          </div>

          {/* Phone Frame Toggle */}
          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors font-medium cursor-pointer"
          >
            {isPhoneFrame ? <Maximize2 className="w-3.5 h-3.5 text-teal-400" /> : <Smartphone className="w-3.5 h-3.5 text-teal-400" />}
            <span>{isPhoneFrame ? 'Full View' : 'Pixel 9 Frame'}</span>
          </button>
        </div>
      </header>

      {/* Main Container: Android Mobile Frame or Full View */}
      <div
        className={`w-full transition-all duration-300 flex flex-col ${
          isPhoneFrame
            ? 'max-w-[420px] h-[100dvh] md:h-[860px] md:rounded-[50px] md:border-[10px] md:border-slate-800 md:shadow-2xl md:ring-1 md:ring-slate-700/60 overflow-hidden relative bg-slate-950'
            : 'max-w-4xl min-h-[90vh] rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden relative'
        }`}
      >
        {/* Android Speaker Grill (Mockup Bezel Detail) */}
        {isPhoneFrame && (
          <div className="hidden md:flex justify-center pt-2">
            <div className="w-16 h-1 rounded-full bg-slate-800" />
          </div>
        )}

        {/* Android Status Bar */}
        <AndroidStatusBar
          connection={connection}
          isVpnActive={isVpnActive}
          onOpenQuickSettings={() => setIsQuickSettingsOpen(true)}
          networkType={networkType}
        />

        {/* Android In-App Header Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-950/90 border-b border-slate-850 z-20">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              Net<span className="text-teal-400">Pulse</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              v1.0.0
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadIpData('User Header Click')}
              disabled={isRefreshingIp}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Network Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingIp ? 'animate-spin text-teal-400' : ''}`} />
            </button>
            <button
              onClick={() => setIsQuickSettingsOpen(true)}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Open Android Quick Settings"
            >
              <SlidersHorizontal className="w-4 h-4 text-teal-400" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2 bg-amber-950/50 border-b border-amber-800/60 text-[10px] leading-relaxed text-amber-200">
          Preview controls and adapter/MAC details are sample data only; this browser cannot read or change Android system network settings. IP and speed results are measured when available.
        </div>

        {/* Tab View Content Area */}
        <main className="flex-1 overflow-y-auto relative bg-slate-950">
          {activeTab === 'dashboard' && (
            <DashboardTab
              publicIp={publicIp}
              localIp={localIp}
              interfaces={interfaces}
              connection={connection}
              networkType={networkType}
              isVpnActive={isVpnActive}
              latestSpeedRecord={speedRecords[0] || null}
              onNavigateTab={setActiveTab}
              onRefreshIp={() => loadIpData('Dashboard Refresh')}
              isRefreshingIp={isRefreshingIp}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'speed' && (
            <SpeedTestTab
              publicIp={publicIp}
              connection={connection}
              onAddSpeedRecord={handleAddSpeedRecord}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'ip' && (
            <IpTrackerTab
              publicIp={publicIp}
              localIp={localIp}
              ipHistory={ipHistory}
              onRefreshIp={() => loadIpData('IP Tab Refresh')}
              isRefreshing={isRefreshingIp}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'mac' && (
            <MacTrackerTab
              interfaces={interfaces}
              onUpdateInterfaceMac={handleUpdateInterfaceMac}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'tools' && (
            <ToolsTab
              publicIp={publicIp}
              localIp={localIp}
              speedRecords={speedRecords}
              onClearRecords={() => {
                setSpeedRecords([]);
                showToast('Cleared speed test history');
              }}
              onShowToast={showToast}
            />
          )}
        </main>

        {/* Android Material 3 Bottom Navigation Bar */}
        <AndroidNavBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          accentColor={accentColor}
        />

        {/* Android Quick Settings Pull-Down Drawer Modal */}
        <QuickSettingsDrawer
          isOpen={isQuickSettingsOpen}
          onClose={() => setIsQuickSettingsOpen(false)}
          networkType={networkType}
          onToggleNetworkType={handleToggleNetworkType}
          isVpnActive={isVpnActive}
          onToggleVpn={handleToggleVpn}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
          dataSaver={dataSaver}
          onToggleDataSaver={() => setDataSaver(!dataSaver)}
          isPhoneFrame={isPhoneFrame}
          onTogglePhoneFrame={() => setIsPhoneFrame(!isPhoneFrame)}
          accentColor={accentColor}
          onChangeAccentColor={setAccentColor}
        />

        {/* Android Toast Notification Capsule */}
        {toastMessage && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 text-slate-100 text-xs font-medium border border-slate-750 shadow-2xl flex items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
