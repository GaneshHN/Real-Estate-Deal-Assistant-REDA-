import { useEffect, useState } from 'react'
import { getDisplayName, getUserRole, supabase, type AppRole } from './lib/supabase'
import {
  Bell, Building2, CalendarDays, ChevronDown, CircleDollarSign, FileText,
  LayoutDashboard, Menu, MessageSquare, MoreHorizontal, Plus, Search,
  Settings, Sparkles, Users, X,
} from 'lucide-react'

const nav = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Leads', icon: Users, count: '12' },
  { label: 'Properties', icon: Building2 },
  { label: 'Deals', icon: CircleDollarSign },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Messages', icon: MessageSquare, count: '4' },
]
const activities = [
  { initials: 'AK', name: 'Ankit Kapoor', action: 'moved to negotiation', time: '12 min ago', tone: 'amber' },
  { initials: 'PS', name: 'Priya Shah', action: 'requested a site visit', time: '46 min ago', tone: 'violet' },
  { initials: 'RM', name: 'Rahul Mehta', action: 'was added as a new lead', time: '2 hrs ago', tone: 'blue' },
]

export function App() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('Overview')
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(event: React.FormEvent) {
    event.preventDefault(); setError('')
    if (!supabase) { setError('Supabase is not configured.'); return }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError('Invalid email or password.')
  }

  async function logout() { await supabase?.auth.signOut(); setSession(null) }
  if (loading) return <div className="auth-screen"><p>Loading your workspace…</p></div>
  if (!session) return <Login email={email} password={password} error={error} setEmail={setEmail} setPassword={setPassword} onSubmit={login} />
  const name = getDisplayName(session.user)
  const role = getUserRole(session.user)
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><span>Dealflow</span><button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="workspace"><div className="workspace-avatar">{name.slice(0, 2).toUpperCase()}</div><div><strong>{name}</strong><span>{role} workspace</span></div><button className="logout-button" onClick={logout} aria-label="Log out">Log out</button></div>
      <div className="nav-section"><span className="eyebrow">Workspace</span><nav>{nav.map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => { setActive(item.label); setOpen(false) }} className={`nav-item ${active === item.label ? 'active' : ''}`}><Icon size={18} /><span>{item.label}</span>{item.count && <b>{item.count}</b>}</button> })}</nav></div>
      <div className="sidebar-bottom"><button className="nav-item"><Settings size={18} /><span>Settings</span></button><div className="upgrade"><Sparkles size={17}/><div><strong>Unlock more</strong><span>Automate your workflow</span></div><ChevronDown size={14}/></div></div>
    </aside>
    {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <main className="main-content">
      <header className="topbar"><button className="menu-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><div className="crumb"><span>Workspace</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><button className="search-button" aria-label="Search"><Search size={18}/><span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button" aria-label="Notifications"><Bell size={19}/><i /></button><div className="avatar">RD</div></div></header>
      <div className="content-wrap"><div className="page-heading"><div><p className="eyebrow">Monday, 14 October 2024</p><h1>Good morning, Rohan <span>✦</span></h1><p className="subtitle">Here&apos;s what&apos;s happening with your deals today.</p></div><button className="primary-button"><Plus size={17}/> Add new lead</button></div>
        <section className="metric-grid"><Metric label="Active leads" value="128" change="+12.5%" detail="vs. last month" icon={Users} tone="blue"/><Metric label="Properties listed" value="64" change="+8.2%" detail="vs. last month" icon={Building2} tone="violet"/><Metric label="Deals in progress" value="18" change="+4.8%" detail="vs. last month" icon={CircleDollarSign} tone="amber"/><Metric label="Pipeline value" value="₹4.8Cr" change="+16.4%" detail="vs. last month" icon={Sparkles} tone="green"/></section>
        <section className="dashboard-grid"><div className="panel pipeline"><div className="panel-heading"><div><h2>Deal pipeline</h2><p>Track your deals across each stage.</p></div><button className="select-button">This quarter <ChevronDown size={14}/></button></div><div className="pipeline-chart"><div className="chart-y"><span>₹5Cr</span><span>₹4Cr</span><span>₹3Cr</span><span>₹2Cr</span><span>₹1Cr</span><span>₹0</span></div><div className="chart-area"><div className="grid-lines"><i/><i/><i/><i/><i/><i/></div><svg viewBox="0 0 600 190" preserveAspectRatio="none" aria-label="Pipeline trend chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b7cff" stopOpacity=".3"/><stop offset="1" stopColor="#8b7cff" stopOpacity="0"/></linearGradient></defs><path d="M0,157 C40,145 55,148 90,133 S140,152 180,119 S230,125 270,95 S320,121 350,98 S400,82 435,90 S470,53 505,66 S550,37 600,18 L600,190 L0,190 Z" fill="url(#fill)"/><path d="M0,157 C40,145 55,148 90,133 S140,152 180,119 S230,125 270,95 S320,121 350,98 S400,82 435,90 S470,53 505,66 S550,37 600,18" fill="none" stroke="#9b8cff" strokeWidth="3" strokeLinecap="round"/></svg><div className="chart-x"><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span></div></div></div></div>
        <div className="panel activity"><div className="panel-heading"><div><h2>Recent activity</h2><p>Stay up to date with your team.</p></div><button className="more-button" aria-label="More options"><MoreHorizontal size={19}/></button></div><div className="activity-list">{activities.map(item => <div className="activity-item" key={item.name}><div className={`activity-avatar ${item.tone}`}>{item.initials}</div><div><p><strong>{item.name}</strong> {item.action}</p><span>{item.time}</span></div></div>)}</div><button className="view-all">View all activity <span>→</span></button></div></section>
        <section className="panel followups"><div className="panel-heading"><div><h2>Today&apos;s follow-ups</h2><p>Keep your momentum going.</p></div><button className="text-button">View calendar <span>→</span></button></div><div className="followup-row"><Follow time="09:30 AM" name="Site visit with Vikram Mehta" tag="Site visit" tone="blue"/><Follow time="11:00 AM" name="Call with Neha Kapoor" tag="Follow-up" tone="violet"/><Follow time="04:30 PM" name="Send proposal to Arjun Shah" tag="Proposal" tone="amber"/></div></section>
      </div>
    </main>
  </div>
}
function Metric({ label, value, change, detail, icon: Icon, tone }: any) { return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={19}/></div><p>{label}</p><strong>{value}</strong><div className="metric-change"><span>↗ {change}</span><small>{detail}</small></div></div> }
function Follow({ time, name, tag, tone }: any) { return <div className="followup"><span className="follow-time">{time}</span><div className="follow-info"><strong>{name}</strong><span className={`tag ${tone}`}>{tag}</span></div><button aria-label={`More options for ${name}`}><MoreHorizontal size={18}/></button></div> }

function Login({ email, password, error, setEmail, setPassword, onSubmit }: { email: string; password: string; error: string; setEmail: (value: string) => void; setPassword: (value: string) => void; onSubmit: (event: React.FormEvent) => void }) {
  return <main className="auth-screen"><form className="login-card" onSubmit={onSubmit}><div className="brand login-brand"><div className="brand-mark"><Sparkles size={17} /></div><span>Dealflow</span></div><p className="eyebrow">Broker workspace</p><h1>Welcome back</h1><p className="subtitle">Sign in to manage your real estate deals.</p><label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary-button login-button" type="submit">Sign in</button></form></main>
}
