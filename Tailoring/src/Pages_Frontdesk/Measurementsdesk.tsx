import { useMemo, useState } from 'react';
import { Bell, Check, ChevronRight, Plus, Ruler, Search, X } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type Measurement = { label: string; value: string };
type CustomerProfile = { id: string; name: string; contact: string; updated: string; garment: string; measurements: Measurement[] };

const MEASUREMENT_FIELDS = ['Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeve', 'Neck', 'Inseam'];
const INITIAL_PROFILES: CustomerProfile[] = [
  { id: 'CUS-001', name: 'Reyna Fuentes', contact: '0917 555 0182', updated: 'Aug 01, 2026', garment: 'Barong Tagalog', measurements: [{ label: 'Chest', value: '36 in' }, { label: 'Waist', value: '29 in' }, { label: 'Hip', value: '38 in' }, { label: 'Shoulder', value: '15 in' }, { label: 'Sleeve', value: '23 in' }, { label: 'Neck', value: '14 in' }, { label: 'Inseam', value: '29 in' }] },
  { id: 'CUS-002', name: 'Boyet Salcedo', contact: '0918 420 7641', updated: 'Jul 29, 2026', garment: 'Two-piece Suit', measurements: [{ label: 'Chest', value: '41 in' }, { label: 'Waist', value: '35 in' }, { label: 'Hip', value: '40 in' }, { label: 'Shoulder', value: '18 in' }, { label: 'Sleeve', value: '25 in' }, { label: 'Neck', value: '16 in' }, { label: 'Inseam', value: '31 in' }] },
  { id: 'CUS-003', name: 'Consuelo Reyes', contact: '0920 336 9028', updated: 'Jul 25, 2026', garment: "Women's Coat", measurements: [{ label: 'Chest', value: '39 in' }, { label: 'Waist', value: '33 in' }, { label: 'Hip', value: '42 in' }, { label: 'Shoulder', value: '16 in' }, { label: 'Sleeve', value: '22 in' }, { label: 'Neck', value: '15 in' }, { label: 'Inseam', value: '28 in' }] },
  { id: 'CUS-004', name: 'Tomas Villareal', contact: '0919 812 4420', updated: 'Jul 18, 2026', garment: 'School Uniform Set', measurements: [] },
];

export function FrontDeskMeasurementsView() {
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CustomerProfile | null>(null);
  const [editor, setEditor] = useState<CustomerProfile | null>(null);
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => profiles.filter((profile) => `${profile.name} ${profile.id} ${profile.contact} ${profile.garment}`.toLowerCase().includes(query.toLowerCase())), [profiles, query]);
  const complete = profiles.filter((profile) => profile.measurements.length).length;
  const needsMeasuring = profiles.length - complete;
  const donutData = useMemo(() => [
    { name: 'Complete', value: complete, color: '#4E7357' },
    { name: 'Needs measuring', value: needsMeasuring || 0.0001, color: '#ECD8A7' },
  ], [complete, needsMeasuring]);

  function saveMeasurements(measurements: Measurement[]) {
    if (!editor) return;
    const updated = { ...editor, measurements, updated: new Date().toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) };
    setProfiles((current) => current.map((profile) => profile.id === updated.id ? updated : profile));
    setSelected(updated);
    setEditor(null);
    setNotice(`Measurements saved for ${updated.name}.`);
    window.setTimeout(() => setNotice(''), 4000);
  }

  return <div className="space-y-7">
    <div className="dash-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><Label>Customer profiles</Label><h1 className="mt-1 text-2xl text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Measurements</h1><p className="mt-2 text-sm text-[#766A62]">Record and review body measurements for custom garments.</p></div>
      <button onClick={() => setEditor(profiles[0])} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_26px_-14px_rgba(42,33,29,0.55)] hover:bg-[#47382F]"><Plus className="h-4 w-4" /> Record measurements</button>
    </div>
    {notice && <div className="dash-in flex items-center gap-2 rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357] shadow-sm"><Check className="h-4 w-4" />{notice}</div>}
    <div className="dash-in grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-1"><Metric label="Saved profiles" value={complete} /><Metric label="Needs measuring" value={needsMeasuring} tone={needsMeasuring ? 'warn' : 'default'} /><Metric label="Updated this month" value={3} /></div>
      <div className="dash-card rounded-xl p-6 sm:p-7">
        <Label>Profile coverage</Label>
        <h2 className="mt-0.5 mb-4 text-xl font-normal text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Measurement completeness</h2>
        <div className="flex items-center gap-6">
          <div className="relative h-28 w-28 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={34} outerRadius={52} paddingAngle={3} stroke="none">
                  {donutData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{profiles.length ? Math.round((complete / profiles.length) * 100) : 0}%</span>
              <span className="text-[8.5px] uppercase tracking-[0.12em] text-[#A3958B]">Complete</span>
            </div>
          </div>
          <ul className="flex-1 space-y-2.5">
            <li className="flex items-center justify-between text-[12.5px]"><span className="flex items-center gap-2 text-[#5E5048]"><span className="h-2 w-2 rounded-full bg-[#4E7357]" />Measured</span><span className="font-medium text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{complete}</span></li>
            <li className="flex items-center justify-between text-[12.5px]"><span className="flex items-center gap-2 text-[#5E5048]"><span className="h-2 w-2 rounded-full bg-[#ECD8A7]" />Needs measuring</span><span className="font-medium text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{needsMeasuring}</span></li>
          </ul>
        </div>
      </div>
    </div>
    <section className="dash-in dash-card overflow-hidden rounded-xl">
      <div className="flex flex-col gap-4 border-b border-[#E8DFD3] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3958B]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, ID, contact, or garment" className="w-full rounded-lg border border-[#E2D7C7] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#A46B48]" /></div><span className="text-xs text-[#8C7E74]">{filtered.length} profile{filtered.length === 1 ? '' : 's'}</span></div>
      <div className="hidden grid-cols-[1.25fr_1fr_1fr_0.9fr_24px] gap-4 border-b border-[#E8DFD3] bg-[#FCFAF7] px-6 py-3 md:grid">{['Customer', 'Garment', 'Last updated', 'Status', ''].map((label) => <Label key={label}>{label}</Label>)}</div>
      {filtered.map((profile) => <button key={profile.id} onClick={() => setSelected(profile)} className="grid w-full grid-cols-1 gap-2 border-b border-[#F0EAE2] px-6 py-4 text-left transition-colors hover:bg-[#FCFAF7] md:grid-cols-[1.25fr_1fr_1fr_0.9fr_24px] md:items-center md:gap-4"><div><div className="font-medium text-[#2A211D]">{profile.name}</div><span className="mt-1 block text-[11px] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{profile.id} · {profile.contact}</span></div><span className="text-sm text-[#5E5048]">{profile.garment}</span><span className="text-sm text-[#5E5048]">{profile.measurements.length ? profile.updated : 'Not recorded'}</span><span><span className={`inline-block rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${profile.measurements.length ? 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]' : 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]'}`}>{profile.measurements.length ? 'Complete' : 'Needs measuring'}</span></span><ChevronRight className="hidden h-4 w-4 text-[#A46B48] md:block" /></button>)}
      {!filtered.length && <p className="p-12 text-center text-sm text-[#766A62]">No measurement profile matches your search.</p>}
    </section>
    {selected && <ProfileDetails profile={selected} onClose={() => setSelected(null)} onSendReminder={() => { setNotice(`Measurement reminder queued for ${selected.name}.`); setSelected(null); window.setTimeout(() => setNotice(''), 4000); }} />}
    {editor && <MeasurementEditor profile={editor} onClose={() => setEditor(null)} onSave={saveMeasurements} />}
  </div>;
}

function Label({ children }: { children: React.ReactNode }) { return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>; }
function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warn' }) { const toneClass = tone === 'warn' ? 'text-[#9E5B4B]' : 'text-[#2A211D]'; return <div className="dash-card rounded-xl p-5"><div className={`text-2xl ${toneClass}`} style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div><Label>{label}</Label></div>; }

function ProfileDetails({ profile, onClose, onSendReminder }: { profile: CustomerProfile; onClose: () => void; onSendReminder: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button onClick={onClose} aria-label="Close measurement profile" className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" /><section className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl"><button onClick={onClose} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button><Label>Measurement profile</Label><h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{profile.name}</h2><p className="mt-2 text-sm text-[#766A62]">{profile.id} · {profile.contact} · {profile.garment}</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{profile.measurements.length ? profile.measurements.map((measurement) => <div key={measurement.label} className="rounded-lg border border-[#E2D7C7] bg-white p-3"><Label>{measurement.label}</Label><div className="mt-1 text-sm text-[#2A211D]">{measurement.value}</div></div>) : <p className="col-span-full rounded-lg border border-dashed border-[#D9C8B7] bg-[#FCFAF7] p-6 text-center text-sm text-[#766A62]">No measurements have been recorded for this customer.</p>}</div><div className="mt-7 flex items-center justify-between border-t border-[#E8DFD3] pt-5"><span className="text-xs text-[#8C7E74]">Last updated: {profile.measurements.length ? profile.updated : '—'}</span><button onClick={onSendReminder} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"><Bell className="h-4 w-4" /> Send reminder</button></div></section></div>; }

function MeasurementEditor({ profile, onClose, onSave }: { profile: CustomerProfile; onClose: () => void; onSave: (measurements: Measurement[]) => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(profile.measurements.map((measurement) => [measurement.label, measurement.value.replace(' in', '')])));
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button onClick={onClose} aria-label="Close measurement editor" className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" /><form onSubmit={(event) => { event.preventDefault(); onSave(MEASUREMENT_FIELDS.map((label) => ({ label, value: values[label]?.trim() ? `${values[label].trim()} in` : '—' }))); }} className="relative w-full max-w-2xl rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl"><button type="button" onClick={onClose} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button><Label>Record measurements</Label><h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{profile.name}</h2><p className="mt-2 text-sm text-[#766A62]">Enter measurements in inches for {profile.garment}.</p><div className="mt-7 grid gap-4 sm:grid-cols-2">{MEASUREMENT_FIELDS.map((label) => <label key={label} className="block text-xs font-medium text-[#5E5048]">{label}<div className="mt-2 flex rounded-lg border border-[#E2D7C7] bg-white focus-within:border-[#A46B48]"><input inputMode="decimal" value={values[label] || ''} onChange={(event) => setValues((current) => ({ ...current, [label]: event.target.value }))} placeholder="0" className="w-full rounded-l-lg bg-transparent px-3 py-2.5 text-sm outline-none" /><span className="border-l border-[#E2D7C7] px-3 py-2.5 text-xs text-[#8C7E74]">in</span></div></label>)}</div><div className="mt-7 flex gap-3"><button className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"><Ruler className="h-4 w-4" /> Save profile</button><button type="button" onClick={onClose} className="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048]">Cancel</button></div></form></div>;
}

export default FrontDeskMeasurementsView;
