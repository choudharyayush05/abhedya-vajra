import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { InvestigateTab } from './components/InvestigateTab';
import { AccountsTab } from './components/AccountsTab';
import { SyndicatesTab } from './components/SyndicatesTab';
import { LegalReportsTab } from './components/LegalReportsTab';
import { DatasetTab } from './components/DatasetTab';
import { LoadDataTab } from './components/LoadDataTab';
import { SettingsTab } from './components/SettingsTab';
import { AIChatModal } from './components/AIChatModal';
import type { OverviewData } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('load');
  const [selectedVictim, setSelectedVictim] = useState<string>('AIRP10000077');
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);

  const loadOverview = () => {
    fetch('/api/overview')
      .then(res => res.json())
      .then(data => {
        setOverviewData(data);
        if (data.sample_victims && data.sample_victims.length > 0) {
          setSelectedVictim(data.sample_victims[0]);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleSelectPreset = (preset: any) => {
    loadOverview();
    setSelectedVictim(preset.default_victim);
    setActiveTab('investigate');
  };

  const handleSelectVictim = (victim: string) => {
    setSelectedVictim(victim);
    setActiveTab('investigate');
  };

  const handleNavigateToLegal = (victim: string) => {
    setSelectedVictim(victim);
    setActiveTab('legal');
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Automatically collapse sidebar when opening graph/investigate screen
  useEffect(() => {
    if (activeTab === 'investigate') {
      setSidebarCollapsed(true);
    }
  }, [activeTab]);

  const datasetName = overviewData?.dataset_name || 'VoidHacks8_MuleAccount_2M_Transactions.csv';
  const totalRows = overviewData?.total_transactions || 2000000;
  const isInvestigate = activeTab === 'investigate';

  const utilityText = isInvestigate
    ? `Active Trail: ${selectedVictim}`
    : null;

  return (
    <div className="app-root" style={{
      fontFamily: 'var(--font-sans)',
      color: '#334155',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      backgroundColor: '#F4EDE4',
      overflow: 'hidden'
    }}>
      {/* Left Sidebar (Full Height Pastel Almond) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Right Column: Header on Top + Main Content */}
      <div className="app-main-column" style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          telemetry={overviewData?.telemetry || null}
          datasetName={datasetName}
          totalTransactions={totalRows}
          totalAccounts={overviewData?.total_accounts || 24873}
          onDatasetReload={loadOverview}
          onSelectPreset={handleSelectPreset}
          onSelectAccount={handleSelectVictim}
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          utilityText={utilityText}
        />

        {/* Main Content Area */}
        <main className={`app-content ${isInvestigate ? '' : 'animated-ambient-bg'}`} style={{
          flex: 1,
          minWidth: 0,
          padding: isInvestigate ? 0 : '18px 24px',
          overflowY: isInvestigate ? 'hidden' : 'auto',
          overflowX: 'hidden',
          position: 'relative',
          height: 'calc(100vh - 64px)',
          boxSizing: 'border-box'
        }}>
          {!isInvestigate && <div className="ambient-orb-1" />}
          {!isInvestigate && <div className="ambient-orb-2" />}
          <div style={{
            position: 'relative',
            zIndex: 1,
            height: isInvestigate ? '100%' : 'auto',
            width: '100%'
          }}>

          {activeTab === 'investigate' && (
            <InvestigateTab
              initialVictim={selectedVictim}
              onNavigateToLegal={handleNavigateToLegal}
              onDatasetChange={loadOverview}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsTab
              data={overviewData}
              onSelectVictim={handleSelectVictim}
            />
          )}

          {activeTab === 'syndicates' && (
            <SyndicatesTab
              data={overviewData}
              onSelectVictim={handleSelectVictim}
            />
          )}

          {activeTab === 'legal' && (
            <LegalReportsTab
              victimAccount={selectedVictim}
            />
          )}

          {(activeTab === 'dataset' || activeTab === 'bench') && (
            <DatasetTab
              onSelectVictim={handleSelectVictim}
            />
          )}

          {activeTab === 'load' && (
            <LoadDataTab
              overviewData={overviewData}
              onDatasetChange={loadOverview}
              onSelectVictim={handleSelectVictim}
              onNavigateToInvestigate={() => setActiveTab('investigate')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab />
          )}
          </div>
        </main>
      </div>

      {/* Floating AI Utility Copilot Window at bottom right of all screens */}
      <AIChatModal currentAccount={selectedVictim} />
    </div>
  );
};

export default App;
