import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Image,
  Megaphone,
  Plus,
  Target,
  Trash2,
  Users
} from 'lucide-react';
import './styles.css';

const today = new Date();
const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const initialDate = `${initialMonth}-${String(today.getDate()).padStart(2, '0')}`;

const emptyGoals = {
  paidLeads: 0,
  cpl: 0,
  leadInvestmentPercent: 50,
  followerCost: 0,
  feedPosts: 0,
  manychatActivations: 0,
  manychatToWhatsapp: 0,
  salesConversion: 0,
  averageTicket: 0
};

const emptyMonth = () => ({
  goals: { ...emptyGoals },
  organic: [],
  paidLeads: [],
  followers: [],
  sales: [],
  posts: []
});

const tabs = [
  ['goals', Target, 'Metas'],
  ['overview', BarChart3, 'Visao geral'],
  ['organic', Users, 'Organico'],
  ['paidLeads', Megaphone, 'Leads Pagos'],
  ['followers', Users, 'Seguidores'],
  ['sales', DollarSign, 'Vendas'],
  ['posts', Image, 'Posts']
];

const money = (value) => `R$ ${Math.round(Number(value) || 0).toLocaleString('pt-BR')}`;
const number = (value) => Math.round(Number(value) || 0).toLocaleString('pt-BR');
const percent = (value, digits = 1) => `${(Number(value) || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits
})}%`;
const ratio = (a, b) => (Number(b) ? Number(a) / Number(b) : 0);
const monthName = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (l) => l.toUpperCase());
};
const daysInMonth = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};
const dayLabel = (date) => String(new Date(`${date}T00:00:00`).getDate()).padStart(2, '0');
const tableDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit'
});
const sum = (items, key) => items.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function calcGoals(goals, monthKey) {
  const investLeads = (Number(goals.paidLeads) || 0) * (Number(goals.cpl) || 0);
  const pct = (Number(goals.leadInvestmentPercent) || 0) / 100;
  const totalInvestment = pct ? investLeads / pct : 0;
  const investFollowers = Math.max(0, totalInvestment - investLeads);
  const followerGoal = ratio(investFollowers, goals.followerCost);
  const organicLeads = (Number(goals.manychatActivations) || 0) * ((Number(goals.manychatToWhatsapp) || 0) / 100);
  const totalLeads = (Number(goals.paidLeads) || 0) + organicLeads;
  const sales = totalLeads * ((Number(goals.salesConversion) || 0) / 100);
  const revenue = sales * (Number(goals.averageTicket) || 0);
  const roundedSalesRevenue = Math.round(sales) * (Number(goals.averageTicket) || 0);
  return {
    days: daysInMonth(monthKey),
    totalInvestment,
    investLeads,
    investFollowers,
    followerGoal,
    paidLeads: Number(goals.paidLeads) || 0,
    organicLeads,
    totalLeads,
    sales,
    revenue,
    roundedSalesRevenue,
    roas: ratio(revenue, totalInvestment),
    cpa: ratio(totalInvestment, sales)
  };
}

function currentReal(month) {
  const paidInvestment = sum(month.paidLeads, 'investment');
  const followerInvestment = sum(month.followers, 'investment');
  const paidLeads = sum(month.paidLeads, 'leads');
  const organicLeads = sum(month.organic, 'whatsappLeads');
  const sales = sum(month.sales, 'sales');
  const revenue = sum(month.sales, 'revenue');
  const followers = sum(month.followers, 'followers');
  return {
    investment: paidInvestment + followerInvestment,
    paidInvestment,
    followerInvestment,
    paidLeads,
    organicLeads,
    totalLeads: paidLeads + organicLeads,
    sales,
    revenue,
    followers,
    roas: ratio(revenue, paidInvestment + followerInvestment),
    cpl: ratio(paidInvestment, paidLeads),
    followerCost: ratio(followerInvestment, followers)
  };
}

function projected(real, registeredDays, monthDays) {
  const factor = registeredDays ? monthDays / registeredDays : 0;
  return {
    investment: real.investment * factor,
    totalLeads: real.totalLeads * factor,
    sales: real.sales * factor,
    revenue: real.revenue * factor
  };
}

function App() {
  const [db, setDb] = useState({ months: {} });
  const [monthKey, setMonthKey] = useState(initialMonth);
  const [active, setActive] = useState('goals');
  const [status, setStatus] = useState('Carregando...');

  useEffect(() => {
    fetch('/api/db')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        setDb(data.months ? data : { months: {} });
        setStatus('Banco local conectado');
      })
      .catch(() => setStatus('Sem servidor local: dados temporarios nesta aba'));
  }, []);

  const month = db.months[monthKey] || emptyMonth();
  const goals = month.goals || emptyGoals;
  const goalCalc = useMemo(() => calcGoals(goals, monthKey), [goals, monthKey]);
  const real = useMemo(() => currentReal(month), [month]);
  const registeredDays = useMemo(() => {
    const dates = new Set([
      ...month.organic.map((i) => i.date),
      ...month.paidLeads.map((i) => i.date),
      ...month.followers.map((i) => i.date),
      ...month.sales.map((i) => i.date)
    ]);
    return dates.size || 1;
  }, [month]);
  const projection = projected(real, registeredDays, daysInMonth(monthKey));

  function saveDb(nextDb) {
    setDb(nextDb);
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextDb)
    }).catch(() => {});
  }

  function updateMonth(updater) {
    const base = db.months[monthKey] || emptyMonth();
    const nextMonth = updater(structuredClone(base));
    saveDb({ ...db, months: { ...db.months, [monthKey]: nextMonth } });
  }

  function shiftMonth(delta) {
    const [year, month] = monthKey.split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    setMonthKey(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Leads</h1>
          <p>Acompanhe metas, leads, seguidores e vendas em um so lugar. Tudo recalcula em tempo real.</p>
          <small>{status}</small>
        </div>
        <div className="month-switcher">
          <button onClick={() => shiftMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={16} /></button>
          <strong>{monthName(monthKey)}</strong>
          <button onClick={() => shiftMonth(1)} aria-label="Proximo mes"><ChevronRight size={16} /></button>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map(([id, Icon, label]) => (
          <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </nav>

      {active === 'goals' && <GoalsTab goals={goals} monthKey={monthKey} result={goalCalc} onSave={(next) => updateMonth((m) => ({ ...m, goals: next }))} />}
      {active === 'overview' && <OverviewTab month={month} goals={goalCalc} real={real} projection={projection} registeredDays={registeredDays} monthKey={monthKey} />}
      {active === 'organic' && <OrganicTab items={month.organic} monthKey={monthKey} onChange={(items) => updateMonth((m) => ({ ...m, organic: items }))} />}
      {active === 'paidLeads' && <PaidLeadsTab items={month.paidLeads} target={Number(goals.cpl) || 0} monthKey={monthKey} onChange={(items) => updateMonth((m) => ({ ...m, paidLeads: items }))} />}
      {active === 'followers' && <FollowersTab items={month.followers} target={Number(goals.followerCost) || 0} monthKey={monthKey} onChange={(items) => updateMonth((m) => ({ ...m, followers: items }))} />}
      {active === 'sales' && <SalesTab items={month.sales} monthKey={monthKey} onChange={(items) => updateMonth((m) => ({ ...m, sales: items }))} />}
      {active === 'posts' && <PostsTab items={month.posts} onChange={(items) => updateMonth((m) => ({ ...m, posts: items }))} />}
    </main>
  );
}

function Field({ label, value, onChange, prefix, suffix, type = 'number', placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        {prefix && <b>{prefix}</b>}
        <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {suffix && <b>{suffix}</b>}
      </div>
    </label>
  );
}

function GoalsTab({ goals, monthKey, result, onSave }) {
  const [draft, setDraft] = useState(goals);
  const [period, setPeriod] = useState('month');
  useEffect(() => setDraft(goals), [goals]);
  const divisor = period === 'month' ? 1 : period === 'week' ? result.days / 7 : result.days;
  const scaled = (v) => (Number(v) || 0) / divisor;
  return (
    <section className="goals-grid">
      <article className="panel">
        <div className="panel-title">
          <h2>Parametros Editaveis</h2>
          <span>{monthName(monthKey).toUpperCase()}</span>
        </div>
        <div className="form-grid">
          <Field label="Meta de Leads Pagos" value={draft.paidLeads} onChange={(v) => setDraft({ ...draft, paidLeads: v })} />
          <Field label="Custo por Lead (CPL)" prefix="R$" value={draft.cpl} onChange={(v) => setDraft({ ...draft, cpl: v })} />
          <Field label="% Investimento em Leads" suffix="%" value={draft.leadInvestmentPercent} onChange={(v) => setDraft({ ...draft, leadInvestmentPercent: v })} />
          <Field label="Custo por Seguidor" prefix="R$" value={draft.followerCost} onChange={(v) => setDraft({ ...draft, followerCost: v })} />
          <Field label="Postagens no Feed (mes)" value={draft.feedPosts} onChange={(v) => setDraft({ ...draft, feedPosts: v })} />
          <Field label="Ativacoes ManyChat (mes)" value={draft.manychatActivations} onChange={(v) => setDraft({ ...draft, manychatActivations: v })} />
          <Field label="% Conversao ManyChat -> WhatsApp" suffix="%" value={draft.manychatToWhatsapp} onChange={(v) => setDraft({ ...draft, manychatToWhatsapp: v })} />
          <Field label="% Conversao em Vendas" suffix="%" value={draft.salesConversion} onChange={(v) => setDraft({ ...draft, salesConversion: v })} />
          <Field label="Ticket Medio" prefix="R$" value={draft.averageTicket} onChange={(v) => setDraft({ ...draft, averageTicket: v })} />
        </div>
        <button className="primary save-goals" onClick={() => onSave(draft)}>Salvar metas</button>
      </article>
      <article className="panel result-panel">
        <div className="segmented">
          <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}><Calendar size={13} /> Mensal</button>
          <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}><Calendar size={13} /> Semanal</button>
          <button className={period === 'day' ? 'active' : ''} onClick={() => setPeriod('day')}><Calendar size={13} /> Diario</button>
        </div>
        <MetricList rows={[
          ['Dias no Mes', result.days],
          ['Invest. Total', money(scaled(result.totalInvestment))],
          ['Invest. em Leads', money(scaled(result.investLeads))],
          ['Invest. em Seguidores', money(scaled(result.investFollowers))],
          ['Meta de Seguidores', number(scaled(result.followerGoal))],
          ['Leads Pagos', number(scaled(result.paidLeads))],
          ['Leads Organicos', number(scaled(result.organicLeads))],
          ['Leads Totais', number(scaled(result.totalLeads))],
          ['Vendas', number(scaled(result.sales))],
          ['Receita', money(scaled(result.revenue))],
          ['ROAS Projetado', `${result.roas.toFixed(1).replace('.', ',')}x`],
          ['CPA Projetado', money(result.cpa)]
        ]} />
      </article>
    </section>
  );
}

function MetricList({ rows }) {
  return <div className="metric-list">{rows.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div>;
}

function OverviewTab({ month, goals, real, projection, registeredDays, monthKey }) {
  const dayCount = daysInMonth(monthKey);
  const progress = (value, target) => Math.min(100, ratio(value, target) * 100);
  const revenueSeries = cumulativeByDay(month.sales, 'revenue', dayCount);
  const paidByDay = dayTotals(month.paidLeads, 'leads');
  const organicByDay = dayTotals(month.organic, 'whatsappLeads');
  const leadBars = Array.from({ length: dayCount }, (_, i) => ({
    label: String(i + 1),
    organic: organicByDay[i + 1] || 0,
    paid: paidByDay[i + 1] || 0
  }));
  return (
    <section className="stack">
      <div className="kpi-grid">
        <Kpi label="ROAS REAL" value={real.roas ? `${real.roas.toFixed(1).replace('.', ',')}x` : '-'} />
        <Kpi label="CPL REAL" value={real.cpl ? money(real.cpl) : '-'} />
        <Kpi label="CUSTO / SEGUIDOR" value={real.followerCost ? money(real.followerCost) : '-'} />
        <Kpi label="DIAS REGISTRADOS" value={registeredDays} hint={`de ${dayCount}`} />
      </div>
      <div className="progress-grid">
        <ProgressPanel title="Investimento" meta={goals.totalInvestment} real={real.investment} projection={projection.investment} progress={progress(real.investment, goals.totalInvestment)} moneyMode />
        <ProgressPanel title="Leads" meta={goals.paidLeads} real={real.totalLeads} projection={projection.totalLeads} progress={progress(real.totalLeads, goals.paidLeads)} />
        <ProgressPanel title="Vendas" meta={goals.sales} real={real.sales} projection={projection.sales} progress={progress(real.sales, goals.sales)} />
        <ProgressPanel title="Receita" meta={goals.roundedSalesRevenue} real={real.revenue} projection={projection.revenue} progress={progress(real.revenue, goals.roundedSalesRevenue)} moneyMode />
      </div>
      <div className="chart-grid">
        <ChartCard title="Receita acumulada vs meta" subtitle="Quanto voce ja gerou versus o ritmo necessario para bater a meta">
          <LineChart data={revenueSeries} valueKey="value" targetLine={goals.revenue / dayCount} moneyMode filled />
        </ChartCard>
        <ChartCard title="Leads diarios" subtitle="Organico vs pago - quem esta puxando seu volume">
          <GroupedBars data={leadBars} keys={['organic', 'paid']} />
        </ChartCard>
      </div>
    </section>
  );
}

function Kpi({ label, value, hint }) {
  return <article className="kpi"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</article>;
}

function ProgressPanel({ title, meta, real, projection, progress, moneyMode }) {
  const fmt = moneyMode ? money : number;
  return (
    <article className="panel progress-panel">
      <h3>{title}<span>{Math.round(progress)}%</span></h3>
      <div className="bar"><i style={{ width: `${progress}%` }} /></div>
      <div className="progress-values">
        <p>META<strong>{fmt(meta)}</strong></p>
        <p>REAL<strong>{fmt(real)}</strong></p>
        <p>PROJECAO<strong>{fmt(projection)}</strong></p>
        <p>SALDO<strong>{fmt(Math.max(0, meta - real))}</strong></p>
      </div>
    </article>
  );
}

function OrganicTab({ items, monthKey, onChange }) {
  const [form, setForm] = useState({ date: initialDate, posts: 0, activations: 0, whatsappLeads: 0 });
  return (
    <RegisterTab
      title="Adicionar registro"
      helper="Quanto voce publicou e converteu organicamente hoje."
      form={<>
        <Field label="Data" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
        <Field label="Posts no feed" value={form.posts} onChange={(v) => setForm({ ...form, posts: v })} />
        <Field label="Ativacoes ManyChat" value={form.activations} onChange={(v) => setForm({ ...form, activations: v })} />
        <Field label="Leads WhatsApp" value={form.whatsappLeads} onChange={(v) => setForm({ ...form, whatsappLeads: v })} />
      </>}
      onAdd={() => {
        onChange(sortItems([...items, { id: uid(), ...toNums(form, ['posts', 'activations', 'whatsappLeads']) }]));
      }}
      table={<DataTable rows={items} empty="Nenhum registro ainda." columns={[
        ['Data', (i) => tableDate(i.date)],
        ['Posts no feed', (i) => number(i.posts)],
        ['Ativacoes ManyChat', (i) => number(i.activations)],
        ['Leads WhatsApp', (i) => number(i.whatsappLeads)],
        ['Conv. ManyChat->WA', (i) => percent(ratio(i.whatsappLeads, i.activations) * 100)]
      ]} onDelete={(id) => onChange(items.filter((i) => i.id !== id))} />}
      chart={<ChartCard title="Organico diario" subtitle="Ativacoes ManyChat vs. leads no WhatsApp"><GroupedBars data={items.map((i) => ({ label: dayLabel(i.date), activations: i.activations, whatsappLeads: i.whatsappLeads }))} keys={['activations', 'whatsappLeads']} /></ChartCard>}
    />
  );
}

function PaidLeadsTab({ items, target, onChange }) {
  const [form, setForm] = useState({ date: initialDate, investment: 0, leads: 0 });
  return (
    <RegisterTab
      title="Adicionar registro"
      helper="Quanto voce gastou e quantos leads pagos entraram."
      form={<>
        <Field label="Data" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
        <Field label="Investimento" value={form.investment} onChange={(v) => setForm({ ...form, investment: v })} />
        <Field label="Leads captados" value={form.leads} onChange={(v) => setForm({ ...form, leads: v })} />
      </>}
      onAdd={() => onChange(sortItems([...items, { id: uid(), ...toNums(form, ['investment', 'leads']) }]))}
      table={<DataTable rows={items} empty="Nenhum registro ainda." columns={[
        ['Data', (i) => tableDate(i.date)],
        ['Investimento', (i) => money(i.investment)],
        ['Leads captados', (i) => number(i.leads)],
        ['CPL', (i) => money(ratio(i.investment, i.leads))]
      ]} onDelete={(id) => onChange(items.filter((i) => i.id !== id))} />}
      chart={<ChartCard title="CPL diario" subtitle={`Linha pontilhada = CPL alvo (${money(target)})`}><LineChart data={items.map((i) => ({ label: dayLabel(i.date), value: ratio(i.investment, i.leads) }))} valueKey="value" targetLine={target} moneyMode /></ChartCard>}
    />
  );
}

function FollowersTab({ items, target, onChange }) {
  const [form, setForm] = useState({ date: initialDate, investment: 0, followers: 0 });
  return (
    <RegisterTab
      title="Adicionar registro"
      helper="Quanto investiu em campanhas de seguidor e quantos entraram."
      form={<>
        <Field label="Data" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
        <Field label="Investimento" value={form.investment} onChange={(v) => setForm({ ...form, investment: v })} />
        <Field label="Novos seguidores" value={form.followers} onChange={(v) => setForm({ ...form, followers: v })} />
      </>}
      onAdd={() => onChange(sortItems([...items, { id: uid(), ...toNums(form, ['investment', 'followers']) }]))}
      table={<DataTable rows={items} empty="Nenhum registro ainda." columns={[
        ['Data', (i) => tableDate(i.date)],
        ['Investimento', (i) => money(i.investment)],
        ['Novos seguidores', (i) => number(i.followers)],
        ['Custo/seguidor', (i) => money(ratio(i.investment, i.followers))]
      ]} onDelete={(id) => onChange(items.filter((i) => i.id !== id))} />}
      chart={<ChartCard title="Custo por seguidor" subtitle={`Linha pontilhada = alvo (${money(target)})`}><LineChart data={items.map((i) => ({ label: dayLabel(i.date), value: ratio(i.investment, i.followers) }))} valueKey="value" targetLine={target} moneyMode /></ChartCard>}
    />
  );
}

function SalesTab({ items, onChange }) {
  const [form, setForm] = useState({ date: initialDate, sales: 0, revenue: 0 });
  return (
    <RegisterTab
      title="Adicionar registro"
      helper="Suas vendas e receita do dia."
      form={<>
        <Field label="Data" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
        <Field label="Vendas" value={form.sales} onChange={(v) => setForm({ ...form, sales: v })} />
        <Field label="Receita" value={form.revenue} onChange={(v) => setForm({ ...form, revenue: v })} />
      </>}
      onAdd={() => onChange(sortItems([...items, { id: uid(), ...toNums(form, ['sales', 'revenue']) }]))}
      table={<DataTable rows={items} empty="Nenhum registro ainda." columns={[
        ['Data', (i) => tableDate(i.date)],
        ['Vendas', (i) => number(i.sales)],
        ['Receita', (i) => money(i.revenue)],
        ['Ticket medio', (i) => money(ratio(i.revenue, i.sales))]
      ]} onDelete={(id) => onChange(items.filter((i) => i.id !== id))} />}
      chart={<ChartCard title="Receita acumulada"><LineChart data={cumulativeFromItems(items, 'revenue')} valueKey="value" moneyMode filled /></ChartCard>}
    />
  );
}

function PostsTab({ items, onChange }) {
  const [form, setForm] = useState({ name: '', link: '', investment: 0, reach: 0, clicks: 0, followers: 0 });
  const bestId = [...items].filter((i) => Number(i.followers) > 0).sort((a, b) => ratio(a.investment, a.followers) - ratio(b.investment, b.followers))[0]?.id;
  return (
    <section className="stack">
      <article className="panel">
        <h2>Adicionar post impulsionado</h2>
        <div className="form-grid posts-form">
          <Field label="Nome do post" type="text" placeholder="Ex.: Reel - case Maria" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Link (opcional)" type="text" placeholder="https://..." value={form.link} onChange={(v) => setForm({ ...form, link: v })} />
          <Field label="Investimento (R$)" value={form.investment} onChange={(v) => setForm({ ...form, investment: v })} />
          <Field label="Alcance" value={form.reach} onChange={(v) => setForm({ ...form, reach: v })} />
          <Field label="Cliques" value={form.clicks} onChange={(v) => setForm({ ...form, clicks: v })} />
          <Field label="Novos seguidores" value={form.followers} onChange={(v) => setForm({ ...form, followers: v })} />
        </div>
        <button className="primary add-post" onClick={() => {
          if (!form.name.trim()) return;
          onChange([...items, { id: uid(), ...toNums(form, ['investment', 'reach', 'clicks', 'followers']) }]);
        }}><Plus size={16} /> Adicionar post</button>
      </article>
      {items.length === 0 ? <article className="panel empty">Nenhum post impulsionado registrado neste mes.</article> : (
        <div className="post-grid">
          {items.map((post) => (
            <article className="post-card" key={post.id}>
              <div className="post-head">
                <h3>{post.link ? <a href={post.link} target="_blank" rel="noreferrer">{post.name}</a> : post.name}</h3>
                {post.id === bestId && <span>TOP</span>}
                <button onClick={() => onChange(items.filter((i) => i.id !== post.id))}><Trash2 size={14} /></button>
              </div>
              <dl>
                <div><dt>Investimento</dt><dd>{money(post.investment)}</dd></div>
                <div><dt>Alcance</dt><dd>{number(post.reach)}</dd></div>
                <div><dt>Cliques</dt><dd>{number(post.clicks)}</dd></div>
                <div><dt>Novos seguidores</dt><dd>{number(post.followers)}</dd></div>
                <div><dt>CTR</dt><dd>{percent(ratio(post.clicks, post.reach) * 100)}</dd></div>
                <div><dt>Custo/seguidor</dt><dd>{money(ratio(post.investment, post.followers))}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RegisterTab({ title, helper, form, onAdd, table, chart }) {
  return (
    <section className="stack">
      <article className="panel register-panel">
        <div className="panel-title"><h2>{title}</h2><span>{helper}</span></div>
        <div className="register-row">{form}<button className="primary" onClick={onAdd}><Plus size={16} /> Salvar</button></div>
      </article>
      {table}
      {chart}
    </section>
  );
}

function DataTable({ rows, columns, empty, onDelete }) {
  return (
    <article className="panel table-panel">
      <table>
        <thead><tr>{columns.map(([title]) => <th key={title}>{title}</th>)}<th /></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={columns.length + 1} className="empty">{empty}</td></tr> : rows.map((row) => (
            <tr key={row.id}>
              {columns.map(([title, render]) => <td key={title}>{render(row)}</td>)}
              <td><button className="icon-button" onClick={() => onDelete(row.id)}><Trash2 size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function ChartCard({ title, subtitle, children }) {
  return <article className="panel chart-card"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}{children}</article>;
}

function LineChart({ data, valueKey, targetLine = 0, moneyMode = false, filled = false }) {
  const width = 900;
  const height = 230;
  const pad = 34;
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(1, targetLine || 0, ...values) * 1.2;
  const points = data.map((d, index) => {
    const x = pad + (data.length <= 1 ? 0 : index * ((width - pad * 2) / (data.length - 1)));
    const y = height - pad - ((Number(d[valueKey]) || 0) / max) * (height - pad * 2);
    return { x, y, ...d };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const targetY = height - pad - (targetLine / max) * (height - pad * 2);
  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img">
      <Grid width={width} height={height} pad={pad} />
      {targetLine > 0 && <line x1={pad} x2={width - pad} y1={targetY} y2={targetY} className="target-line" />}
      {filled && points.length > 0 && <polygon className="area" points={`${pad},${height - pad} ${line} ${width - pad},${height - pad}`} />}
      {points.length > 0 && <polyline points={line} className="line" />}
      {points.map((p) => <g key={p.label}><circle cx={p.x} cy={p.y} r="4" className="dot" /><text x={p.x} y={height - 8}>{p.label}</text></g>)}
      <text x="4" y="18" className="axis-label">{moneyMode ? money(max) : number(max)}</text>
    </svg>
  );
}

function GroupedBars({ data, keys }) {
  const width = 900;
  const height = 230;
  const pad = 34;
  const max = Math.max(1, ...data.flatMap((d) => keys.map((k) => Number(d[k]) || 0))) * 1.2;
  const group = (width - pad * 2) / Math.max(1, data.length);
  const colors = ['#a7acb3', '#0b9cff'];
  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img">
      <Grid width={width} height={height} pad={pad} />
      {data.map((d, i) => keys.map((k, ki) => {
        const barWidth = Math.max(5, group / (keys.length + 1));
        const x = pad + i * group + ki * barWidth + group * 0.18;
        const h = ((Number(d[k]) || 0) / max) * (height - pad * 2);
        return <rect key={`${d.label}-${k}`} x={x} y={height - pad - h} width={barWidth * 0.9} height={h} fill={colors[ki]} rx="2" />;
      }))}
      {data.map((d, i) => <text key={d.label} x={pad + i * group + group / 2} y={height - 8}>{d.label}</text>)}
      <text x="4" y="18" className="axis-label">{number(max)}</text>
    </svg>
  );
}

function Grid({ width, height, pad }) {
  const ys = [0, 1, 2, 3, 4].map((i) => pad + i * ((height - pad * 2) / 4));
  return <g>{ys.map((y) => <line key={y} x1={pad} x2={width - pad} y1={y} y2={y} className="grid-line" />)}<line x1={pad} x2={pad} y1={pad} y2={height - pad} className="axis" /><line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} className="axis" /></g>;
}

function toNums(obj, keys) {
  const next = { ...obj };
  keys.forEach((key) => { next[key] = Number(String(next[key]).replace(',', '.')) || 0; });
  return next;
}
function sortItems(items) {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}
function dayTotals(items, key) {
  return items.reduce((acc, item) => {
    const day = Number(dayLabel(item.date));
    acc[day] = (acc[day] || 0) + (Number(item[key]) || 0);
    return acc;
  }, {});
}
function cumulativeByDay(items, key, dayCount) {
  const totals = dayTotals(items, key);
  let running = 0;
  return Array.from({ length: dayCount }, (_, i) => {
    running += totals[i + 1] || 0;
    return { label: String(i + 1), value: running };
  });
}
function cumulativeFromItems(items, key) {
  let running = 0;
  return sortItems(items).map((item) => {
    running += Number(item[key]) || 0;
    return { label: dayLabel(item.date), value: running };
  });
}

createRoot(document.getElementById('root')).render(<App />);
