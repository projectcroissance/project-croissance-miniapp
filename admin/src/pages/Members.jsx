import React, { useState, useEffect } from 'react';
import { members as api } from '../api';
import { useToast } from '../hooks/useAdmin';

const TIER_EMOJI = { Recruit:'🌱', Active:'⚡', Contributor:'🥉', Elite:'🥇', Legacy:'⭐' };
const ACTIVITIES = [
  { value:'general_post',    label:'Quality post in #general (+2 CP)',  pts:2  },
  { value:'ama_attendance',  label:'Attended AMA (+5 CP)',              pts:5  },
  { value:'ama_question',    label:'Asked AMA question (+3 CP)',        pts:3  },
  { value:'space_attendance',label:'Attended X Space (+5 CP)',          pts:5  },
  { value:'introduction',    label:'Proper introduction (+10 CP)',      pts:10 },
  { value:'help_member',     label:'Helped another member (+3 CP)',     pts:3  },
];

export default function Members() {
  const [memberList, setMemberList] = useState([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [modal,      setModal]      = useState(null);
  const [awardForm,  setAwardForm]  = useState({ points:'', reason:'', category:'manual_award' });
  const [actForm,    setActForm]    = useState({ activity:'general_post' });
  const [saving,     setSaving]     = useState(false);
  const [txHistory,  setTxHistory]  = useState([]);
  const { show, ToastEl }           = useToast();

  useEffect(() => { fetchMembers(); }, []);

  async function fetchMembers() {
    setLoading(true);
    const data = await api.list().catch(() => []);
    setMemberList(data);
    setLoading(false);
  }

  async function openProfile(m) {
    setSelected(m); setModal('profile');
    const data = await api.transactions(m.id).catch(() => []);
    setTxHistory(data);
  }

  async function handleAward() {
    if (!awardForm.points || !awardForm.reason.trim()) { show('Points and reason required','error'); return; }
    setSaving(true);
    try {
      await api.award(selected.id, parseInt(awardForm.points), awardForm.reason.trim(), awardForm.category);
      show(`${parseInt(awardForm.points)>0?'+':''}${awardForm.points} CP awarded ✓`);
      setModal(null); setAwardForm({ points:'', reason:'', category:'manual_award' });
      fetchMembers();
    } catch (err) { show(err.message,'error'); }
    finally { setSaving(false); }
  }

  async function handleActivity() {
    setSaving(true);
    try {
      const act = ACTIVITIES.find(a => a.value === actForm.activity);
      await api.activity(selected.id, actForm.activity);
      show(`+${act?.pts} CP awarded ✓`);
      setModal(null); fetchMembers();
    } catch (err) { show(err.message,'error'); }
    finally { setSaving(false); }
  }

  async function toggleLegacy(m) {
    try {
      await api.setLegacy(m.id, !m.is_legacy);
      show(`Legacy ${!m.is_legacy?'granted':'removed'} ✓`);
      fetchMembers();
      if (selected?.id===m.id) setSelected(p=>({...p,is_legacy:!m.is_legacy}));
    } catch (err) { show(err.message,'error'); }
  }

  const filtered = memberList.filter(m => {
    const q = search.toLowerCase();
    return !q || m.first_name?.toLowerCase().includes(q) || m.telegram_username?.toLowerCase().includes(q) || m.referral_code?.toLowerCase().includes(q);
  });

  const catIcon = { task_completion:'📋', referral:'🔗', referral_bonus:'🎉', community_activity:'💬', milestone:'🏅', manual_award:'⚡', manual_deduction:'⚠️', legacy_monthly_bonus:'⭐', reset:'🔄' };
  const actPts = actForm.activity ? (ACTIVITIES.find(a=>a.value===actForm.activity)?.pts||0) : 0;

  return (
    <div className="page-content">
      {ToastEl}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        <div className="search-bar" style={{flex:1}}>
          <span style={{color:'var(--text-dim)'}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, username or referral code..." />
        </div>
        <div style={{fontSize:13,color:'var(--text-dim)',display:'flex',alignItems:'center',whiteSpace:'nowrap'}}>{filtered.length} member{filtered.length!==1?'s':''}</div>
      </div>
      {loading ? <div className="loader"><div className="spinner"/></div> : (
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Tier</th><th>Monthly CP</th><th>Total CP</th><th>Referrals</th><th>Submissions</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:10}}><div className="avatar">{m.first_name?.[0]?.toUpperCase()||'?'}</div><div><div style={{fontWeight:500,color:'var(--text-bright)'}}>{m.first_name} {m.last_name||''}{m.is_legacy&&' ⭐'}</div>{m.telegram_username&&<div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'var(--mono)'}}>@{m.telegram_username}</div>}</div></div></td>
                    <td>{TIER_EMOJI[m.tier]} {m.tier}</td>
                    <td><span style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--teal)'}}>{m.monthly_points}</span></td>
                    <td><span style={{fontFamily:'var(--mono)',color:'var(--text-bright)'}}>{m.total_points}</span></td>
                    <td style={{fontFamily:'var(--mono)',fontSize:13}}>{m.active_referrals||0}/{m.total_referrals||0}</td>
                    <td style={{fontFamily:'var(--mono)',fontSize:13}}>{m.approved_submissions||0}</td>
                    <td style={{fontSize:12,color:'var(--text-dim)',fontFamily:'var(--mono)'}}>{new Date(m.joined_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</td>
                    <td><div style={{display:'flex',gap:5}}>
                      <button className="btn btn-xs btn-secondary" onClick={()=>openProfile(m)}>Profile</button>
                      <button className="btn btn-xs btn-primary" onClick={()=>{setSelected(m);setModal('award');}}>⚡</button>
                      <button className="btn btn-xs" style={{background:'var(--purple-pale)',color:'var(--purple)',border:'1px solid rgba(124,58,237,0.2)'}} onClick={()=>{setSelected(m);setModal('activity');}}>💬</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {modal==='profile'&&selected&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}>
          <div className="modal" style={{maxWidth:600}}>
            <div className="modal-header">
              <div style={{display:'flex',alignItems:'center',gap:12}}><div className="avatar" style={{width:40,height:40,fontSize:16}}>{selected.first_name?.[0]?.toUpperCase()}</div><div><div className="modal-title">{selected.first_name} {selected.last_name||''}</div>{selected.telegram_username&&<div style={{fontSize:12,color:'var(--text-dim)',fontFamily:'var(--mono)'}}>@{selected.telegram_username}</div>}</div></div>
              <button className="modal-close" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                {[{l:'Monthly CP',v:selected.monthly_points,c:'var(--teal)'},{l:'Total CP',v:selected.total_points,c:'var(--text-bright)'},{l:'Tier',v:`${TIER_EMOJI[selected.tier]} ${selected.tier}`,c:'var(--text-bright)'},{l:'Referrals',v:`${selected.active_referrals||0} active`,c:'var(--text-bright)'},{l:'Approved',v:selected.approved_submissions||0,c:'var(--green)'},{l:'Legacy',v:selected.is_legacy?'⭐ Yes':'No',c:selected.is_legacy?'var(--gold)':'var(--text-dim)'}].map(({l,v,c})=>(
                  <div key={l} style={{background:'var(--bg3)',borderRadius:8,padding:'12px 14px',border:'1px solid var(--border)'}}><div style={{fontSize:10,color:'var(--text-dim)',fontFamily:'var(--mono)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4}}>{l}</div><div style={{fontSize:16,fontWeight:700,color:c}}>{v}</div></div>
                ))}
              </div>
              <div style={{display:'flex',gap:10,marginBottom:16}}>
                <button className="btn btn-sm btn-primary" onClick={()=>setModal('award')}>⚡ Award / Deduct Points</button>
                <button className="btn btn-sm" style={{background:'var(--gold-pale)',color:'var(--gold)',border:'1px solid rgba(217,119,6,0.2)'}} onClick={()=>toggleLegacy(selected)}>{selected.is_legacy?'⭐ Remove Legacy':'⭐ Grant Legacy'}</button>
              </div>
              <div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'var(--mono)',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:10}}>Recent Transactions</div>
              {txHistory.map((tx,i)=>{
                const isPos=tx.points>=0;
                const date=new Date(tx.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
                return <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<txHistory.length-1?'1px solid var(--border2)':'none'}}><span style={{fontSize:16,width:24,textAlign:'center',flexShrink:0}}>{catIcon[tx.category]||'📌'}</span><span style={{flex:1,fontSize:13,color:'var(--text)'}}>{tx.reason}</span><span style={{fontSize:12,color:'var(--text-dim)',fontFamily:'var(--mono)'}}>{date}</span><span style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:13,color:isPos?'var(--teal)':'var(--red)',minWidth:56,textAlign:'right'}}>{isPos?'+':''}{tx.points} CP</span></div>;
              })}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setModal(null)}>Close</button></div>
          </div>
        </div>
      )}

      {/* Award Modal */}
      {modal==='award'&&selected&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Award / Deduct — {selected.first_name}</div><button className="modal-close" onClick={()=>setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Points (negative to deduct)</label><input type="number" value={awardForm.points} onChange={e=>setAwardForm(f=>({...f,points:e.target.value}))} placeholder="e.g. 25 or -10" /></div>
              <div className="form-group"><label>Category</label><select value={awardForm.category} onChange={e=>setAwardForm(f=>({...f,category:e.target.value}))}><option value="manual_award">Manual Award</option><option value="manual_deduction">Manual Deduction</option><option value="milestone">Milestone</option><option value="community_activity">Community Activity</option></select></div>
              <div className="form-group"><label>Reason *</label><input value={awardForm.reason} onChange={e=>setAwardForm(f=>({...f,reason:e.target.value}))} placeholder="e.g. Exceptional thread on Web3" /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleAward} disabled={saving}>{saving?'Saving...':'Award Points'}</button></div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {modal==='activity'&&selected&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Log Activity — {selected.first_name}</div><button className="modal-close" onClick={()=>setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Activity</label><select value={actForm.activity} onChange={e=>setActForm({activity:e.target.value})}>{ACTIVITIES.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
              <div style={{background:'var(--teal-pale)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'var(--teal)'}}>This will award <strong>+{actPts} CP</strong> to {selected.first_name}.</div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleActivity} disabled={saving}>{saving?'Saving...':`Award +${actPts} CP`}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}