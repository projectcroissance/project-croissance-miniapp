import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import WebApp from '@twa-dev/sdk';

interface Member {
  first_name: string;
  monthly_points: number;
  total_points: number;
  tier: string;
  referral_code: string;
}

export default function Profile() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tgUser = WebApp.initDataUnsafe?.user;
  
    if (!tgUser?.id) {
      console.log("No Telegram user");
      setLoading(false);
      return;
  }
  
    supabase
      .from('member_stats')
      .select('*')
      .eq('telegram_id', tgUser.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setMember(data);
        setLoading(false);
      });
  }, []);
  if (loading) return <div className="p-6 text-center">Loading profile...</div>;

  const tierEmoji: Record<string, string> = {
    Recruit: '🌱', Active: '⚡', Contributor: '🥉', Elite: '🥇', Legacy: '⭐'
  };

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">{tierEmoji[member?.tier || 'Recruit']}</div>
        <h1 className="text-3xl font-bold">{member?.first_name}</h1>
        <p className="text-emerald-400 text-xl font-mono mt-1">{member?.tier}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#1e2638] rounded-2xl p-6 text-center">
          <div className="text-4xl font-bold text-emerald-400">{member?.monthly_points}</div>
          <div className="text-sm text-gray-400">This Month</div>
        </div>
        <div className="bg-[#1e2638] rounded-2xl p-6 text-center">
          <div className="text-4xl font-bold">{member?.total_points}</div>
          <div className="text-sm text-gray-400">Total CP</div>
        </div>
      </div>

      <div className="bg-[#1e2638] rounded-2xl p-6">
        <div className="font-mono text-sm text-gray-400 mb-2">YOUR REFERRAL CODE</div>
        <div className="font-mono text-xl bg-black/50 p-3 rounded-xl break-all">
          {member?.referral_code}
        </div>
      </div>
    </div>
  );
}