import React, { useState, useEffect } from 'react';
import { leaderboard as api } from '../api';
import { useToast } from '../hooks/useAdmin';

const TIER_EMOJI = { Recruit:'🌱', Active:'⚡', Contributor:'🥉', Elite:'🥇', Legacy:'⭐' };
const MEDALS     = ['🥇','🥈','🥉'];

export default function Leaderboard() {
  const [board,     setBoard]     = useState([]);
  const [legacy,    setLegacy]    = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [resetting, setResetting] = useState(false);
  const [tab,       setTab]       = useState('live');
  const { show, ToastEl }         = useToast();

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [b, l, h] = await Promise.all([
      api.live().catch(()=>[]),
      api.legacy().catch(()=>[]),
      api.history().catch(()=>[]),
    ]);
    setBoard(b); setLegacy(l); setHistory(h);
    setLoading(false);
  }

  async function handleReset() {
    if (!window.confirm('Run the monthly reset?\n\n• Scores saved as snapshot\n• All monthly CP resets to 0\n• Legacy members get +30 CP\n\nThis cannot be undone.')) return;
    setResetting(true);
    try { await api.reset(); show('Monthly reset complete ✓'); fetchAll(); }
    catch (err) { show(err.message,'error'); }
    finally { setResetting(false); }
  }

  async function removeLegacy(id, name) {
    if (!window.confirm(`Remove Legacy Tier from ${name}?`)) return;
    // Use members API via leaderboard page
    try {
      const { members: mApi } = await import('../api');
      await mApi.setLegacy(id, false);
      show('Legacy status removed'); fetchAll();
    } catch (err) { show(err.message,'error'); }
  }

  return (
    <div className="page-content">
      {ToastEl}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div style={{display:'flex',gap:8}}>
          {[{id:'live',label:'🏆 Live Board'},{id:'legacy',label:'⭐ Legacy'},{id:'history',label:'📅 History'}].map(t=>(
            <button key={t.id} className="btn btn-sm" onClick={()=>setTab(t.id)} style={{background:tab===t.id?'var(--teal-pale)':'var(--bg3)',color:tab===t.id?'var(--teal)':'var(--text-dim)',border:`1px solid ${tab===t.id?'rgba(13,148,136,0.3)':'var(--border)'}`}}>{t.label}</button>
          ))}
        </div>
        <button className="btn btn-danger" onClick={handleReset} disabled={resetting}>{resetting?'Resetting...':'🔄 Run Monthly Reset'}</button>
      </div>

      {loading ? <div className="loader"><div className="spinner"/></div> : <>
        {tab==='live'&&(
          <>
            {board.length>=3&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
                {[board[0],board[1],board[2]].map((m,i)=>(
                  <div key={m.id} className="stat-card" style={{borderColor:['rgba(217,119,6,0.3)','rgba(148,163,184,0.2)','rgba(205,124,47,0.2)'][i]}}>
                    <div style={{fontSize:22,marginBottom:6}}>{MEDALS[i]}</div>
                    <div style={{fontWeight:700,color:'var(--text-bright)',marginBottom:2}}>{m.first_name} {m.last_name||''}{m.is_legacy&&' ⭐'}</div>
                    {m.telegram_username&&<div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'var(--mono)',marginBottom:6}}>@{m.telegram_username}</div>}
                    <div style={{fontSize:24,fontWeight:700,fontFamily:'var(--mono)',color:['var(--gold)','#94a3b8','#cd7c2f'][i]}}>{m.monthly_points} CP</div>
                  </div>
                ))}
              </div>
            )}
            <div className="card" style={{padding:0}}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Rank</th><th>Member</th><th>Tier</th><th>Monthly CP</th><th>Total CP</th><th>Legacy</th></tr></thead>
                  <tbody>
                    {board.map((m,i)=>(
                      <tr key={m.id}>
                        <td style={{fontFamily:'var(--mono)',fontWeight:700,color:i<3?['var(--gold)','#94a3b8','#cd7c2f'][i]:'var(--text-dim)'}}>{i<3?MEDALS[i]:`#${m.rank}`}</td>
                        <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="avatar">{m.first_name?.[0]?.toUpperCase()}</div><div><div style={{fontWeight:500,color:'var(--text-bright)'}}>{m.first_name} {m.last_name||''}</div>{m.telegram_username&&<div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'var(--mono)'}}>@{m.telegram_username}</div>}</div></div></td>
                        <td>{TIER_EMOJI[m.tier]} {m.tier}</td>
                        <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--teal)'}}>{m.monthly_points}</td>
                        <td style={{fontFamily:'var(--mono)',color:'var(--text-bright)'}}>{m.total_points}</td>
                        <td>{m.is_legacy?'⭐ Legacy':'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab==='legacy'&&(
          <>
            <div className="card" style={{background:'rgba(217,119,6,0.04)',border:'1px solid rgba(217,119,6,0.2)',marginBottom:20}}><div style={{fontSize:13,color:'var(--text)',lineHeight:1.8}}><strong style={{color:'var(--gold)'}}>Legacy Tier:</strong> Members who hit 500+ CP in 3 separate months. Status is permanent. They receive +30 CP at the start of every month automatically.</div></div>
            {legacy.length===0?<div className="empty"><div className="empty-icon">⭐</div><h3>No Legacy Tier members yet</h3></div>:(
              <div className="card" style={{padding:0}}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Member</th><th>Total CP</th><th>Qualifying Months</th><th>Guild Since</th><th>Action</th></tr></thead>
                    <tbody>
                      {legacy.map(m=>(
                        <tr key={m.id}>
                          <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="avatar" style={{background:'rgba(217,119,6,0.15)',borderColor:'rgba(217,119,6,0.3)',color:'var(--gold)'}}>{m.first_name?.[0]?.toUpperCase()}</div><div><div style={{fontWeight:600,color:'var(--text-bright)'}}>⭐ {m.first_name} {m.last_name||''}</div>{m.telegram_username&&<div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'var(--mono)'}}>@{m.telegram_username}</div>}</div></div></td>
                          <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--gold)'}}>{m.total_points}</td>
                          <td style={{fontFamily:'var(--mono)',fontSize:13}}>{m.legacy_months} months</td>
                          <td style={{fontSize:12,color:'var(--text-dim)',fontFamily:'var(--mono)'}}>{new Date(m.joined_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</td>
                          <td><button className="btn btn-xs btn-danger" onClick={()=>removeLegacy(m.id,m.first_name)}>Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab==='history'&&(
          <>
            <p style={{marginBottom:20}}>Snapshots saved before each monthly reset.</p>
            {history.length===0?<div className="empty"><div className="empty-icon">📅</div><h3>No history yet</h3><p>Snapshots are saved when the monthly reset runs.</p></div>:history.map(month=><MonthSnapshot key={month} month={month}/>)}
          </>
        )}
      </>}
    </div>
  );
}

function MonthSnapshot({ month }) {
  const [open,    setOpen]    = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (entries.length>0) { setOpen(o=>!o); return; }
    setLoading(true);
    const data = await api.snapshot(month).catch(()=>[]);
    setEntries(data); setLoading(false); setOpen(true);
  }

  const label = new Date(month+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric'});

  return (
    <div className="card" style={{padding:0,marginBottom:10}}>
      <button onClick={load} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',background:'none',border:'none',cursor:'pointer',color:'var(--text-bright)',fontSize:14,fontWeight:600}}>
        <span>📅 {label}</span><span style={{color:'var(--text-dim)'}}>{open?'▲':'▼'}</span>
      </button>
      {open&&<div style={{borderTop:'1px solid var(--border)'}}>
        {loading?<div style={{padding:20,textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}/></div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Rank','Member','Final CP'].map(h=><th key={h} style={{padding:'8px 20px',textAlign:'left',fontSize:10,fontFamily:'var(--mono)',color:'var(--text-dim)',letterSpacing:'0.15em',textTransform:'uppercase',background:'var(--bg3)'}}>{h}</th>)}</tr></thead>
            <tbody>
              {entries.map((e,i)=>(
                <tr key={e.id}>
                  <td style={{padding:'10px 20px',fontFamily:'var(--mono)',fontWeight:700,color:i<3?['var(--gold)','#94a3b8','#cd7c2f'][i]:'var(--text-dim)',borderBottom:'1px solid var(--border2)'}}>{i<3?['🥇','🥈','🥉'][i]:`#${e.final_rank}`}</td>
                  <td style={{padding:'10px 20px',color:'var(--text-bright)',borderBottom:'1px solid var(--border2)'}}>{e.members?.first_name} {e.members?.last_name||''}{e.members?.telegram_username&&<span style={{fontSize:11,color:'var(--text-dim)',fontFamily:'var(--mono)',marginLeft:6}}>@{e.members.telegram_username}</span>}</td>
                  <td style={{padding:'10px 20px',fontFamily:'var(--mono)',fontWeight:700,color:'var(--teal)',borderBottom:'1px solid var(--border2)'}}>{e.final_points} CP</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>}
    </div>
  );
}