import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { supabase } from '../lib/supabase';
import { Share2, Copy } from 'lucide-react';

export default function Referral() {
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0 });

  useEffect(() => {
    const tgUser = WebApp.initDataUnsafe?.user;

      if (!tgUser) {
          console.log("No Telegram user found");
          return;
      }
    supabase.from('member_stats').select('referral_code,total_referrals,active_referrals')
      .eq('telegram_id', tgUser?.id).single().then(({ data }) => {
        if (data) {
          const link = `https://t.me/${import.meta.env.VITE_BOT_USERNAME}?start=ref_${data.referral_code}`;
          setReferralLink(link);
          setStats({ total: data.total_referrals, active: data.active_referrals });
        }
      });
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    WebApp.HapticFeedback.notificationOccurred('success');
  };

  const shareLink = () => {
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}`);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">🌱 Invite Friends</h2>
      
      <div className="bg-[#1e2638] rounded-3xl p-6 mb-6">
        <div className="font-mono text-sm opacity-70 mb-2">YOUR INVITE LINK</div>
        <div className="break-all font-mono text-sm bg-black/40 p-4 rounded-2xl mb-4">
          {referralLink}
        </div>
        
        <div className="flex gap-3">
          <button onClick={copyLink} className="flex-1 bg-white text-black py-4 rounded-2xl font-medium flex items-center justify-center gap-2">
            <Copy size={20} /> Copy
          </button>
          <button onClick={shareLink} className="flex-1 bg-emerald-600 py-4 rounded-2xl font-medium flex items-center justify-center gap-2">
            <Share2 size={20} /> Share
          </button>
        </div>
      </div>

      <div className="text-center text-sm text-gray-400">
        {stats.active} active referrals • Earn +10 CP after 7 days
      </div>
    </div>
  );
}