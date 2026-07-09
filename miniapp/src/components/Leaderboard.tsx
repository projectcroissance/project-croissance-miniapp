import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface LeaderboardEntry {
  rank: number;
  first_name: string;
  telegram_username?: string;
  monthly_points: number;
  tier: string;
  is_legacy: boolean;
}

export default function Leaderboard() {
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<any>(null);

  useEffect(() => {
    // Initial fetch
    supabase.from('leaderboard').select('*').then(({ data }) => setBoard(data || []));

    // Realtime subscription
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        supabase.from('leaderboard').select('*').then(({ data }) => setBoard(data || []));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">🏆 Monthly Leaderboard</h2>

      <div className="space-y-3">
        {board.map((entry, i) => (
          <div key={i} className="bg-[#1e2638] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</div>
            
            <div className="flex-1">
              <div className="font-medium">
                {entry.first_name} {entry.telegram_username && `@${entry.telegram_username}`}
                {entry.is_legacy && ' ⭐'}
              </div>
            </div>
            
            <div className="text-right font-mono font-bold text-emerald-400">
              {entry.monthly_points} CP
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-500 mt-8">
        Updates live • Resets 1st of every month
      </p>
    </div>
  );
}