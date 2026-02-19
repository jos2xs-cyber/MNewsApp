import { useState } from 'react';
import SourceManager from './components/SourceManager';
import TopicManager from './components/TopicManager';
import SettingsPanel from './components/SettingsPanel';
import DigestHistory from './components/DigestHistory';
import TestDigestButton from './components/TestDigestButton';
import AllowedDomainsManager from './components/AllowedDomainsManager';
import StatusBar from './components/StatusBar';

const tabs = ['sources', 'topics', 'domains', 'settings', 'history'] as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('sources');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <h1 className="text-2xl font-bold">News Digest Manager</h1>
          <TestDigestButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-lg border bg-white shadow-sm">
          <nav className="flex gap-4 border-b px-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`border-b-2 py-3 text-sm font-medium capitalize ${activeTab === tab ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-600'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="p-4">
            {activeTab === 'sources' && <SourceManager />}
            {activeTab === 'topics' && <TopicManager />}
            {activeTab === 'domains' && <AllowedDomainsManager />}
            {activeTab === 'settings' && <SettingsPanel />}
            {activeTab === 'history' && <DigestHistory />}
          </div>
        </div>
        <StatusBar />
      </main>
    </div>
  );
}
