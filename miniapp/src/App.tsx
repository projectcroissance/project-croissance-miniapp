import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import BottomNav from './components/BottomNav';
import Profile from './components/Profile';
import Referral from './components/Referral';
import Tasks from './components/Tasks';
import Leaderboard from './components/Leaderboard';

function App() {
  const [activeTab, setActiveTab] = useState<'profile' | 'referral' | 'tasks' | 'leaderboard'>('profile');

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    WebApp.setHeaderColor('#0b0e14');
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'profile': return <Profile />;
      case 'referral': return <Referral />;
      case 'tasks': return <Tasks />;
      case 'leaderboard': return <Leaderboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white pb-20">
      <div className="max-w-xl mx-auto">
        {renderTab()}
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;