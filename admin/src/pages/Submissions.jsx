import React, { useState, useEffect } from 'react';
import { submissions as api } from '../api';
import { useToast } from '../hooks/useAdmin';

const TIER_EMOJI = { Recruit:'🌱', Active:'⚡', Contributor:'🥉', Elite:'🥇', Legacy:'⭐' };

export default function Submissions() {
  const [list,      setList]      = useState([]);
  const [filter,    setFilter]    = useState('pending');
  const [loading,   setLoading]   = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [note,      setNote]      = useState('');
  const [customPts, setCustomPts] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [preview,   setPreview]   = useState(null);
  const { show, ToastEl }         = useToast();

  useEffect(() => { fetchSubs(); }, [filter]);

  async function fetchSubs() {
    setLoading(true);
    const data = await api.list(filter).catch(() => []);
    setList(data);
    setLoading(false);
  }

  function openReview(sub) { setReviewing(sub); setNote(''); setCustomPts(sub.tasks?.points_reward?.toString() || '15'); }

  async function handleDecision(decision) {
    setSaving(true);
    try {
      await api.review(reviewing.id, decision, parseInt(customPts), note.trim());
      show(`Submission ${decision} ✓`);
      setReviewing(null);
      fetchSubs();
    } catch (err) { show(err.message, 'error'); }
    finally { setSaving(false); }
  }

  const counts = list.reduce((a,s) => { a[s.status]=(a[s.status]||0)+1; return a; }, {});

  return (
    <div className="page-content">
      {ToastEl}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[{id:'pending',color:'var(--gold)'},{id:'approved',color:'var(--green)'},{id:'rejected',color:'var(--red)'},{id:'all',color:'var(--text)'}].map(({id,color}) => (
          <button key={id} onClick={()=>setFilter(id)} className="btn btn-sm" style={{ background:filter===id?`${color}18`:'var(--bg3)', color:filter===id?color:'var(--text-dim)', border:`1px solid ${filter===id?`${color}40`:'var(--border)'}` }}>
            {id.charAt(0).toUpperCase()+id.slice(1)}
            {id!=='all' && counts[id]>0 && <span style={{ marginLeft:6, background:color, color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:10, fontFamily:'var(--mono)' }}>{counts[id]}</span>}
          </button>
        ))}
      </div>
      {loading ? <div className="loader"><div className="spinner"/></div> : list.length===0 ? (
        <div className="empty"><div className="empty-icon">📭</div><h3>No {filter} submissions</h3></div>
      ) : (
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Task</th><th>Submitted</th><th>Status</th><th>Proof</th><th>Action</th></tr></thead>
              <tbody>
                {list.map(sub => {
                  const m=sub.members, t=sub.tasks;
                  const time=new Date(sub.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
                  return (
                    <tr key={sub.id}>
                      <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="avatar">{m?.first_name?.[0]?.toUpperCase()||'?'}</div><div><div style={{fontWeight:500,color:'var(--text-bright)'}}>{m?.first_name} {m?.last_name||''} {m?.tier&&TIER_EMOJI[m.tier]}</div>{m?.telegram_username&&<div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'var(--mono)'}}>@{m.telegram_username}</div>}</div></div></td>
                      <td><div style={{fontWeight:500,color:'var(--text-bright)',marginBottom:2}}>{t?.title}</div><div style={{fontSize:11,color:'var(--teal)',fontFamily:'var(--mono)'}}>+{t?.points_reward} CP</div></td>
                      <td style={{fontSize:12,color:'var(--text-dim)',fontFamily:'var(--mono)'}}>{time}</td>
                      <td><span className={`badge badge-${sub.status}`}>{sub.status}</span>{sub.status==='approved'&&<div style={{fontSize:11,color:'var(--teal)',fontFamily:'var(--mono)',marginTop:3}}>+{sub.points_awarded} CP</div>}</td>
                      <td>{sub.proof_url?<button className="btn btn-xs btn-secondary" onClick={()=>setPreview(sub.proof_url)}>👁 View</button>:<span style={{color:'var(--text-dim)',fontSize:12}}>—</span>}</td>
                      <td><button className={`btn btn-xs ${sub.status==='pending'?'btn-primary':'btn-secondary'}`} onClick={()=>openReview(sub)}>{sub.status==='pending'?'Review':'Details'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {preview && <div className="modal-overlay" onClick={()=>setPreview(null)} style={{cursor:'zoom-out'}}><img src={preview} alt="Proof" style={{maxWidth:'90vw',maxHeight:'90vh',borderRadius:12,objectFit:'contain'}} /></div>}
      {reviewing && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setReviewing(null);}}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Review Submission</div><button className="modal-close" onClick={()=>setReviewing(null)}>×</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                <div style={{background:'var(--bg3)',borderRadius:8,padding:'12px 14px'}}><div style={{fontSize:11,color:'var(--text-dim)',marginBottom:4}}>Member</div><div style={{fontWeight:600,color:'var(--text-bright)'}}>{reviewing.members?.first_name}</div>{reviewing.members?.telegram_username&&<div style={{fontSize:12,color:'var(--text-dim)',fontFamily:'var(--mono)'}}>@{reviewing.members.telegram_username}</div>}</div>
                <div style={{background:'var(--bg3)',borderRadius:8,padding:'12px 14px'}}><div style={{fontSize:11,color:'var(--text-dim)',marginBottom:4}}>Task</div><div style={{fontWeight:600,color:'var(--text-bright)'}}>{reviewing.tasks?.title}</div><div style={{fontSize:12,color:'var(--teal)',fontFamily:'var(--mono)'}}>Default: +{reviewing.tasks?.points_reward} CP</div></div>
              </div>
              {reviewing.proof_url&&<div style={{marginBottom:14}}><img src={reviewing.proof_url} alt="Proof" style={{width:'100%',maxHeight:280,objectFit:'cover',borderRadius:10,cursor:'zoom-in',border:'1px solid var(--border)'}} onClick={()=>setPreview(reviewing.proof_url)} /><div style={{fontSize:11,color:'var(--text-dim)',marginTop:4,textAlign:'center'}}>Click to view full size</div></div>}
              {reviewing.proof_note&&<div style={{background:'var(--bg3)',borderRadius:8,padding:'12px 14px',marginBottom:14,fontSize:13,color:'var(--text)',borderLeft:'2px solid var(--teal)'}}><div style={{fontSize:11,color:'var(--text-dim)',marginBottom:4}}>Member's Note</div>{reviewing.proof_note}</div>}
              {reviewing.status!=='pending'&&<div style={{background:reviewing.status==='approved'?'var(--green-pale)':'var(--red-pale)',border:`1px solid ${reviewing.status==='approved'?'rgba(22,163,74,0.2)':'rgba(220,38,38,0.2)'}`,borderRadius:8,padding:'12px 14px',marginBottom:14,fontSize:13,color:reviewing.status==='approved'?'var(--green)':'var(--red)'}}>{reviewing.status==='approved'?`✅ Approved — +${reviewing.points_awarded} CP`:'❌ Rejected'}{reviewing.reviewer_note&&<div style={{marginTop:4,fontSize:12,color:'var(--text-dim)'}}>Note: {reviewing.reviewer_note}</div>}</div>}
              {reviewing.status==='pending'&&<>
                <div className="form-group"><label>Points to Award</label><input type="number" value={customPts} onChange={e=>setCustomPts(e.target.value)} /><div style={{fontSize:11,color:'var(--text-dim)',marginTop:4}}>Default is {reviewing.tasks?.points_reward} CP. Override if needed.</div></div>
                <div className="form-group"><label>Reviewer Note (optional)</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} /></div>
              </>}
            </div>
            {reviewing.status==='pending'?(
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={()=>setReviewing(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={()=>handleDecision('rejected')} disabled={saving}>{saving?'...':'❌ Reject'}</button>
                <button className="btn btn-success" onClick={()=>handleDecision('approved')} disabled={saving}>{saving?'...':`✅ Approve +${customPts} CP`}</button>
              </div>
            ):(
              <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setReviewing(null)}>Close</button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}