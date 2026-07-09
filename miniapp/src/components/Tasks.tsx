import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import WebApp from '@twa-dev/sdk';
import { Upload, CheckCircle } from 'lucide-react';

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
  const [uploading, setUploading] = useState(false);
  const [proofNote, setProofNote] = useState('');

  useEffect(() => {
    supabase.from('active_tasks').select('*').then(({ data }) => setTasks(data || []));
  }, []);

  const handleFileUpload = async (file: File, taskId: string) => {
    if (!file) return;
    setUploading(true);

    const tgUser = WebApp.initDataUnsafe.user;
    const fileExt = file.name.split('.').pop();
    const fileName = `${tgUser?.id}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('proof-images')
      .upload(fileName, file);

    if (error) {
      alert('Upload failed');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('proof-images').getPublicUrl(fileName);

    // Submit to submissions table
    await supabase.from('submissions').insert({
      member_id: (await supabase.from('members').select('id').eq('telegram_id', tgUser?.id).single()).data?.id,
      task_id: taskId,
      proof_url: publicUrl,
      proof_note: proofNote,
    });

    WebApp.HapticFeedback.notificationOccurred('success');
    alert('✅ Proof submitted! Waiting for review.');
    setSelectedTask(null);
    setProofNote('');
    setUploading(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        📌 Active Tasks
      </h2>

      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-[#1e2638] rounded-3xl p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{task.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{task.description}</p>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold">+{task.points_reward}</div>
                <div className="text-xs text-gray-500">CP</div>
              </div>
            </div>

            {task.requires_proof && <p className="text-xs text-amber-400 mt-3">📸 Proof required</p>}

            <button
              onClick={() => setSelectedTask(task)}
              className="mt-4 w-full bg-white text-black py-3 rounded-2xl font-medium"
            >
              Submit Proof
            </button>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/90 flex items-end z-50">
          <div className="bg-[#1e2638] w-full rounded-t-3xl p-6">
            <h3 className="text-xl font-bold mb-4">{selectedTask.title}</h3>
            
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], selectedTask.id)}
              className="hidden"
              id="proof-upload"
            />
            
            <label htmlFor="proof-upload" className="block border-2 border-dashed border-gray-600 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-500 transition">
              <Upload className="mx-auto mb-3" size={48} />
              <p>Tap to upload proof image</p>
            </label>

            <textarea
              placeholder="Optional note..."
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              className="w-full mt-4 bg-black/50 rounded-2xl p-4 text-sm"
              rows={3}
            />

            <button onClick={() => setSelectedTask(null)} className="mt-4 w-full py-3 text-gray-400">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}