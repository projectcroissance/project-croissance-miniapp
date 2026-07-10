import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import WebApp from '@twa-dev/sdk';
import { Upload } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  points_reward: number;
  requires_proof: boolean;
  proof_note?: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofNote, setProofNote] = useState('');

  useEffect(() => {
    supabase.from('active_tasks').select('*').then(({ data }) => {
      setTasks(data || []);
    });
  }, []);

  const handleFileUpload = async (file: File, taskId: string) => {
    if (!file) return;

    const tgUser = WebApp.initDataUnsafe.user;
    if (!tgUser?.id) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${tgUser.id}-${Date.now()}.${fileExt}`;

    // Upload image
    const { error: uploadError } = await supabase.storage
      .from('proof-images')
      .upload(fileName, file);

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('proof-images')
      .getPublicUrl(fileName);

    // Get member id and submit
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('telegram_id', tgUser.id)
      .single();

    if (member) {
      await supabase.from('submissions').insert({
        member_id: member.id,
        task_id: taskId,
        proof_url: urlData.publicUrl,
        proof_note: proofNote || null,
      });

      WebApp.HapticFeedback.notificationOccurred('success');
      alert('✅ Proof submitted successfully!');
      setSelectedTask(null);
      setProofNote('');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">📌 Active Tasks</h2>

      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-[#1e2638] rounded-3xl p-6">
            <h3 className="font-semibold text-lg">{task.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{task.description}</p>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-emerald-400 font-bold">+{task.points_reward} CP</div>
              {task.requires_proof && <span className="text-xs text-amber-400">📸 Proof required</span>}
            </div>

            <button
              onClick={() => setSelectedTask(task)}
              className="mt-5 w-full bg-white text-black py-3.5 rounded-2xl font-medium"
            >
              Submit Proof
            </button>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end">
          <div className="bg-[#1e2638] w-full rounded-t-3xl p-6 pb-10">
            <h3 className="text-xl font-bold mb-4">{selectedTask.title}</h3>

            <label className="block border-2 border-dashed border-gray-600 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-500">
              <Upload className="mx-auto mb-3" size={48} />
              <p className="font-medium">Tap to upload image proof</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], selectedTask.id)}
              />
            </label>

            <textarea
              placeholder="Add optional note..."
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              className="w-full mt-4 bg-black/50 rounded-2xl p-4 h-24"
            />

            <button 
              onClick={() => setSelectedTask(null)} 
              className="mt-6 w-full py-3 text-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}