import { Home, Users, Award, Trophy } from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: Props) {
  const tabs = [
    { id: 'profile', icon: Home, label: 'Home' },
    { id: 'referral', icon: Users, label: 'Refer' },
    { id: 'tasks', icon: Award, label: 'Tasks' },
    { id: 'leaderboard', icon: Trophy, label: 'Board' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#111520] border-t border-gray-800 max-w-xl mx-auto">
      <div className="flex justify-around py-2">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center py-2 px-4 ${activeTab === id ? 'text-emerald-400' : 'text-gray-400'}`}
          >
            <Icon size={24} />
            <span className="text-[10px] mt-1">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}