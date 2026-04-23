import { useState, useMemo } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Settings, Bell,
  AlertTriangle, CheckCircle, Clock, Activity, ChevronRight,
  Droplets, Wind, X, TrendingDown, Zap, RefreshCw,
  PackagePlus, Truck, ExternalLink, Calendar, User, Search
} from 'lucide-react';

// ─── Mock Data ──────────────────────────────────────────────────────────────
const VALVES_RAW = [
  { id: 'V-001', serialNumber: 'SN-4471-A', tag: 'FV-101', location: 'Line A – Reactor Feed', mediaType: 'Liquid', installDate: '2022-03-15', maxLifespanDays: 1000, leadTimeDays: 90 },
  { id: 'V-002', serialNumber: 'SN-4472-B', tag: 'PV-204', location: 'Line B – Pressure Control', mediaType: 'Gas',    installDate: '2023-07-01', maxLifespanDays: 1200, leadTimeDays: 75 },
  { id: 'V-003', serialNumber: 'SN-4473-C', tag: 'CV-318', location: 'Line C – Cooling Loop',   mediaType: 'Liquid', installDate: '2021-11-20', maxLifespanDays: 900,  leadTimeDays: 120 },
  { id: 'V-004', serialNumber: 'SN-4474-D', tag: 'HV-412', location: 'Line D – Header Supply',  mediaType: 'Gas',    installDate: '2024-01-10', maxLifespanDays: 1500, leadTimeDays: 60 },
  { id: 'V-005', serialNumber: 'SN-4475-E', tag: 'TV-507', location: 'Line E – Thermal Bypass',  mediaType: 'Liquid', installDate: '2022-08-05', maxLifespanDays: 800,  leadTimeDays: 100 },
  { id: 'V-006', serialNumber: 'SN-4476-F', tag: 'LV-603', location: 'Line F – Level Control',   mediaType: 'Gas',    installDate: '2023-12-18', maxLifespanDays: 1100, leadTimeDays: 90 },
];

const INVENTORY_INITIAL = [
  { id: 'INV-001', partNumber: 'GP-100-GT', type: 'Gate', quantity: 12, reorderPoint: 5, location: 'Aisle 4', mediaType: 'Liquid', maxLifespanDays: 1000, leadTimeDays: 90 },
  { id: 'INV-002', partNumber: 'GP-200-GB', type: 'Globe', quantity: 2, reorderPoint: 5, location: 'Aisle 2', mediaType: 'Gas', maxLifespanDays: 1200, leadTimeDays: 75 },
  { id: 'INV-003', partNumber: 'GP-300-CH', type: 'Check', quantity: 5, reorderPoint: 3, location: 'Aisle 5', mediaType: 'Liquid', maxLifespanDays: 900, leadTimeDays: 120 },
];

const PURCHASE_ORDERS_INITIAL = [
  { id: 'PO-8821', serialNumber: 'SN-TEMP-01', vendor: 'Global Valve Corp', orderDate: '2024-04-10', eta: '2024-04-20', status: 'Shipped', partNumber: 'GP-100-GT' },
  { id: 'PO-9912', serialNumber: 'SN-TEMP-02', vendor: 'Precision Flow', orderDate: '2024-04-15', eta: '2024-04-22', status: 'Pending', partNumber: 'GP-200-GB' },
];

const MEDIA_FACTOR = { Liquid: 1.5, Gas: 1.0 };

function computeValves(raw, today) {
  return raw.map(v => {
    const install = new Date(v.installDate);
    const elapsed = Math.max(0, (today - install) / 86400000);
    const effectiveElapsed = elapsed * MEDIA_FACTOR[v.mediaType];
    const healthPct = Math.max(0, Math.round((1 - effectiveElapsed / v.maxLifespanDays) * 100));
    const criticalThreshold = Math.round((v.leadTimeDays / v.maxLifespanDays) * 100);
    const isCritical = healthPct <= criticalThreshold;
    const status =
      healthPct >= 80 ? 'Healthy' :
      healthPct >= 21 ? 'Monitoring' : 'Replace';
    return { ...v, healthPct, criticalThreshold, isCritical, status, effectiveElapsed };
  });
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    Healthy:    { cls: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30', icon: <CheckCircle size={11} /> },
    Monitoring: { cls: 'bg-yellow-500/15  text-yellow-400  ring-yellow-500/30',  icon: <Clock size={11} /> },
    Replace:    { cls: 'bg-red-500/15     text-red-400     ring-red-500/30',      icon: <AlertTriangle size={11} /> },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${cfg.cls}`}>
      {cfg.icon}{status === 'Replace' ? 'Replace Triggered' : status}
    </span>
  );
}

function HealthBar({ pct, status }) {
  const color =
    status === 'Healthy'    ? 'bg-emerald-500' :
    status === 'Monitoring' ? 'bg-yellow-400'  : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function MediaIcon({ type }) {
  const tooltip = type === 'Liquid' 
    ? "Liquid Media: 1.5x accelerated decay factor applied to health calculation." 
    : "Gas Media: 1.0x standard decay factor applied to health calculation.";
  return type === 'Liquid'
    ? <span className="inline-flex items-center gap-1 text-blue-400 text-xs cursor-help" title={tooltip}><Droplets size={12}/> Liquid</span>
    : <span className="inline-flex items-center gap-1 text-violet-400 text-xs cursor-help" title={tooltip}><Wind size={12}/> Gas</span>;
}

function StatCard({ icon, label, value, sub, accent }) {
  const colors = {
    blue:    'from-blue-500/20 to-transparent border-blue-500/20 text-blue-400',
    red:     'from-red-500/20  to-transparent border-red-500/20  text-red-400',
    yellow:  'from-yellow-500/20 to-transparent border-yellow-500/20 text-yellow-400',
  };
  return (
    <div className={`relative bg-slate-900 border rounded-xl p-5 overflow-hidden bg-gradient-to-br ${colors[accent]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-100">{value}</p>
          {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-slate-800 ${colors[accent].split(' ').slice(-1)}`}>{icon}</div>
      </div>
    </div>
  );
}

function NotificationsPanel({ valves, onClose }) {
  const critical = valves.filter(v => v.isCritical);
  return (
    <div className="absolute right-0 top-14 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-sm font-semibold text-slate-200">Procurement Alerts</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={15}/></button>
      </div>
      {critical.length === 0
        ? <p className="text-slate-500 text-sm text-center py-8">No active alerts</p>
        : critical.map(v => (
          <div key={v.id} className="px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-red-300">{v.tag} — Critical: Order Now</p>
                <p className="text-xs text-slate-500">{v.serialNumber} · {v.location}</p>
                <p className="text-xs text-slate-600 mt-0.5">Health: {v.healthPct}% · Lead time: {v.leadTimeDays}d</p>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',   icon: <LayoutDashboard size={18}/> },
  { id: 'inventory',   label: 'Inventory',   icon: <Package size={18}/> },
  { id: 'procurement', label: 'Procurement', icon: <ShoppingCart size={18}/> },
  { id: 'settings',    label: 'Settings',    icon: <Settings size={18}/> },
];
// ─── Inventory View ──────────────────────────────────────────────────────────
function InventoryView({ inventory, onDeploy, thCls }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Warehouse Inventory</h2>
          <p className="text-sm text-slate-500">Manage spare parts and ready-to-deploy assets</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search parts..." 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-800 bg-slate-950/50">
            <tr>
              <th className={thCls}>Part Number</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Storage Location</th>
              <th className={thCls}>Stock Level</th>
              <th className={thCls}>Reorder Point</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {inventory.map(item => (
              <tr key={item.id} className="transition-colors hover:bg-slate-800/50">
                <td className="px-4 py-4 font-semibold text-slate-200">{item.partNumber}</td>
                <td className="px-4 py-4 text-slate-400">{item.type} Valve</td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs">
                    <Package size={12}/> {item.location}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${item.quantity > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {item.quantity}
                    </span>
                    {item.quantity <= item.reorderPoint && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 font-bold uppercase">Low Stock</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-500 font-mono">{item.reorderPoint} units</td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => onDeploy(item)}
                    disabled={item.quantity <= 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <PackagePlus size={12}/> Deploy to Field
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShippingProgressBar({ orderDate, eta, status }) {
  if (status === 'Arrived') return <div className="text-[10px] text-emerald-500 font-bold uppercase flex items-center gap-1"><CheckCircle size={10}/> Fulfilled</div>;
  
  const start = new Date(orderDate).getTime();
  const end = new Date(eta).getTime();
  const now = Date.now();
  
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const remainingDays = Math.max(0, Math.round((end - now) / 86400000));

  return (
    <div className="w-full max-w-[140px] space-y-1.5">
      <div className="flex justify-between items-center text-[9px]">
        <span className="text-slate-500 font-medium">Transit Progress</span>
        <span className={`${remainingDays === 0 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
          {remainingDays > 0 ? `${remainingDays}d left` : 'Delayed'}
        </span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${remainingDays === 0 ? 'bg-red-500' : 'bg-blue-500'}`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
    </div>
  );
}

// ─── Procurement View ────────────────────────────────────────────────────────
function ProcurementView({ purchaseOrders, onUpdateStatus, thCls, today }) {
  const overduePOs = purchaseOrders.filter(po => po.status !== 'Arrived' && new Date(po.eta) < today);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Procurement & Logistics</h2>
          <p className="text-sm text-slate-500">Track active purchase orders and incoming supply</p>
        </div>
      </div>

      {/* Urgency Filter / Overdue Section */}
      {overduePOs.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-500" size={18} />
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Urgent: Overdue Shipments ({overduePOs.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overduePOs.map(po => (
              <div key={po.id} className="bg-slate-900 border border-red-500/30 rounded-lg p-3 flex justify-between items-center shadow-lg">
                <div>
                  <p className="text-xs font-bold text-slate-200">{po.id} — {po.partNumber}</p>
                  <p className="text-[10px] text-red-400 font-medium">Missed ETA: {new Date(po.eta).toLocaleDateString()}</p>
                </div>
                <button 
                  onClick={() => onUpdateStatus(po.id, 'Arrived')}
                  className="p-1.5 rounded-md bg-red-500 text-white hover:bg-red-400 transition-colors"
                >
                  <CheckCircle size={14}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-800 bg-slate-950/50">
            <tr>
              <th className={thCls}>Order ID</th>
              <th className={thCls}>Asset/Part</th>
              <th className={thCls}>Vendor</th>
              <th className={thCls}>Order Date</th>
              <th className={thCls}>ETA</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Delivery Timeline</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {purchaseOrders.map(po => {
              const isOverdue = po.status !== 'Arrived' && new Date(po.eta) < today;
              return (
                <tr key={po.id} className={`transition-colors hover:bg-slate-800/50 ${isOverdue ? 'bg-red-500/5' : ''}`}>
                  <td className="px-4 py-4 font-mono text-xs text-blue-400">{po.id}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-200">{po.partNumber}</p>
                    <p className="text-[10px] text-slate-500">{po.serialNumber}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-400">{po.vendor}</td>
                  <td className="px-4 py-4 text-slate-400 font-mono text-xs">{new Date(po.orderDate).toLocaleDateString()}</td>
                  <td className={`px-4 py-4 font-mono text-xs ${isOverdue ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                    {new Date(po.eta).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ring-1 
                      ${po.status === 'Arrived' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' : 
                        po.status === 'Shipped' ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20' : 
                        'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'}`}>
                      {po.status === 'Arrived' ? <CheckCircle size={10}/> : po.status === 'Shipped' ? <Truck size={10}/> : <Clock size={10}/>}
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <ShippingProgressBar orderDate={po.orderDate} eta={po.eta} status={po.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {po.status !== 'Arrived' && (
                        <>
                          <button 
                            onClick={() => onUpdateStatus(po.id, po.status === 'Pending' ? 'Shipped' : 'Arrived')}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded uppercase transition-colors"
                          >
                            Mark {po.status === 'Pending' ? 'Shipped' : 'Arrived'}
                          </button>
                        </>
                      )}
                      {po.status === 'Arrived' && (
                        <span className="text-[10px] text-slate-600 font-bold uppercase">Fulfilled</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {purchaseOrders.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            <ShoppingCart size={32} className="mx-auto mb-3 opacity-40"/>
            <p className="text-sm">No purchase orders found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const today = useMemo(() => new Date(), []);
  const [rawValves, setRawValves] = useState(VALVES_RAW);
  const valves = useMemo(() => computeValves(rawValves, today), [rawValves, today]);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [showNotif, setShowNotif] = useState(false);
  const [orderedIds, setOrderedIds] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortKey, setSortKey] = useState('healthPct');
  const [sortDir, setSortDir] = useState('asc');

  const [inventory, setInventory] = useState(INVENTORY_INITIAL);
  const [purchaseOrders, setPurchaseOrders] = useState(PURCHASE_ORDERS_INITIAL);

  const criticalCount = valves.filter(v => v.isCritical).length;
  const atRiskCount   = valves.filter(v => v.status !== 'Healthy').length;
  const pendingOrders = purchaseOrders.filter(po => po.status !== 'Arrived').length;

  const handleOrder = (valve) => {
    if (orderedIds.includes(valve.id)) return;
    
    setOrderedIds(prev => [...prev, valve.id]);
    const newPO = {
      id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      serialNumber: valve.serialNumber,
      vendor: 'Industrial Valvco',
      orderDate: today.toISOString().split('T')[0],
      eta: new Date(today.getTime() + 14 * 86400000).toISOString().split('T')[0],
      status: 'Pending',
      partNumber: valve.mediaType === 'Liquid' ? 'GP-100-GT' : 'GP-200-GB'
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
  };

  const handleUpdatePOStatus = (poId, newStatus) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === poId) {
        if (newStatus === 'Arrived' && po.status !== 'Arrived') {
          // Increment inventory
          setInventory(inv => inv.map(item => 
            item.partNumber === po.partNumber 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ));
        }
        return { ...po, status: newStatus };
      }
      return po;
    }));
  };

  const handleDeploy = (invItem) => {
    if (invItem.quantity <= 0) return;

    const newId = `V-${Math.floor(100 + Math.random() * 900)}`;
    const newValve = {
      id: newId,
      serialNumber: `SN-NEW-${Math.floor(1000 + Math.random() * 9000)}`,
      tag: `FV-${Math.floor(700 + Math.random() * 200)}`,
      location: 'Unassigned – Storage Transfer',
      mediaType: invItem.mediaType,
      installDate: today.toISOString().split('T')[0],
      maxLifespanDays: invItem.maxLifespanDays,
      leadTimeDays: invItem.leadTimeDays,
    };

    setInventory(prev => prev.map(item => 
      item.id === invItem.id ? { ...item, quantity: item.quantity - 1 } : item
    ));
    setRawValves(prev => [...prev, newValve]);
    setActiveNav('dashboard');
  };

  const handleSimulateAge = (id) => {
    setRawValves(prev => prev.map(v =>
      v.id === id ? { ...v, installDate: new Date(new Date(v.installDate).getTime() - 200 * 86400000).toISOString().split('T')[0] } : v
    ));
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = filterStatus === 'All' ? [...valves] : valves.filter(v => v.status === filterStatus);
    list.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [valves, filterStatus, sortKey, sortDir]);

  const SortIcon = ({ k }) => (
    <span className={`ml-1 text-[10px] ${sortKey === k ? 'text-blue-400' : 'text-slate-600'}`}>
      {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const thCls = "px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none";

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100 leading-tight">ValveLCM</p>
              <p className="text-[10px] text-slate-500 leading-tight">Lifecycle & Inventory</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${activeNav === item.id
                  ? 'bg-blue-600/20 text-blue-400 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <span className={activeNav === item.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}>
                {item.icon}
              </span>
              {item.label}
              {item.id === 'procurement' && criticalCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {criticalCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">RL</div>
            <div>
              <p className="text-xs font-medium text-slate-300">Rapidev Labs</p>
              <p className="text-[10px] text-slate-600">Plant Engineer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <header className="h-14 shrink-0 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span>{NAV_ITEMS.find(n => n.id === activeNav)?.label}</span>
            <ChevronRight size={14} />
            <span className="text-slate-200 font-medium">Overview</span>
          </div>
          <div className="flex items-center gap-3 relative">
            <span className="text-xs text-slate-600">{today.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
            <button
              onClick={() => setShowNotif(v => !v)}
              className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
            >
              <Bell size={18}/>
              {criticalCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
            {showNotif && <NotificationsPanel valves={valves} onClose={() => setShowNotif(false)} />}
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeNav === 'dashboard' && (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard icon={<Package size={20}/>}        label="Total Valves"   value={valves.length}  sub="Active field assets"       accent="blue" />
                <StatCard icon={<ShoppingCart size={20}/>}   label="Pending Orders" value={pendingOrders}  sub="Simulated procurement"     accent="yellow" />
                <StatCard icon={<AlertTriangle size={20}/>}  label="At-Risk Assets" value={atRiskCount}    sub={`${criticalCount} critical · ${atRiskCount - criticalCount} monitoring`} accent="red" />
              </div>

              {/* Health Overview mini-chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-200">Fleet Health Overview</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time condition index with media-adjusted decay</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/> Healthy</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"/> Monitoring</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"/> Replace</span>
                  </div>
                </div>
                <div className="flex items-end gap-3 h-20">
                  {valves.map(v => {
                    const color = v.status === 'Healthy' ? 'bg-emerald-500' : v.status === 'Monitoring' ? 'bg-yellow-400' : 'bg-red-500';
                    return (
                      <div key={v.id} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full rounded-t-md relative" style={{ height: `${Math.max(4, v.healthPct * 0.75)}px` }}>
                          <div className={`absolute bottom-0 left-0 right-0 rounded-t-md ${color} opacity-80`} style={{ height: '100%' }} />
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono">{v.tag}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Table Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {['All','Healthy','Monitoring','Replace'].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                        ${filterStatus === s
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                    >
                      {s === 'Replace' ? 'Replace Triggered' : s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-600">{filtered.length} valve{filtered.length !== 1 ? 's' : ''} shown</p>
              </div>

              {/* Main Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/50">
                    <tr>
                      <th className={thCls} onClick={() => handleSort('tag')}>Tag <SortIcon k="tag"/></th>
                      <th className={thCls} onClick={() => handleSort('serialNumber')}>Serial No. <SortIcon k="serialNumber"/></th>
                      <th className={thCls} onClick={() => handleSort('mediaType')}>Media <SortIcon k="mediaType"/></th>
                      <th className={thCls} onClick={() => handleSort('installDate')}>Install Date <SortIcon k="installDate"/></th>
                      <th className={thCls} onClick={() => handleSort('healthPct')}>Health <SortIcon k="healthPct"/></th>
                      <th className={thCls} onClick={() => handleSort('status')}>Status <SortIcon k="status"/></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filtered.map(v => {
                      const isOrdered = orderedIds.includes(v.id);
                      return (
                        <tr
                          key={v.id}
                          className={`transition-colors hover:bg-slate-800/50
                            ${v.isCritical ? 'row-critical' : ''}
                            ${isOrdered ? 'opacity-60' : ''}`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              {v.isCritical && !isOrdered && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                              )}
                              <div>
                                <p className="font-semibold text-slate-200">{v.tag}</p>
                                <p className="text-xs text-slate-600 mt-0.5">{v.location}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{v.serialNumber}</td>
                          <td className="px-4 py-3.5"><MediaIcon type={v.mediaType}/></td>
                          <td className="px-4 py-3.5 text-slate-400 text-xs">
                            {new Date(v.installDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                            <p className="text-slate-600 mt-0.5">{Math.round(v.effectiveElapsed / MEDIA_FACTOR[v.mediaType])}d elapsed</p>
                          </td>
                          <td className="px-4 py-3.5 w-40">
                            <HealthBar pct={v.healthPct} status={v.status}/>
                            {v.isCritical && !isOrdered && (
                              <p className="text-[10px] text-red-400 mt-1 font-medium flex items-center gap-1">
                                <AlertTriangle size={9}/> Critical: Order Now
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5"><StatusBadge status={v.status}/></td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              {v.isCritical && !isOrdered && (
                                <button
                                  onClick={() => handleOrder(v)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                                >
                                  <ShoppingCart size={12}/> Simulate Order
                                </button>
                              )}
                              {isOrdered && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/40 text-emerald-400 text-xs font-semibold rounded-lg ring-1 ring-emerald-500/30">
                                  <CheckCircle size={12}/> Ordered
                                </span>
                              )}
                              <button
                                onClick={() => handleSimulateAge(v.id)}
                                title="Simulate aging (+200 days)"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                <TrendingDown size={13}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-slate-600">
                    <Package size={32} className="mx-auto mb-3 opacity-40"/>
                    <p className="text-sm">No valves match the current filter.</p>
                  </div>
                )}
              </div>

              {/* Legend / Info */}
              <div className="grid grid-cols-3 gap-4 pb-2">
                {[
                  { icon: <Zap size={14} className="text-blue-400"/>, title: 'Media Factor Logic', body: 'Liquid media accelerates degradation 1.5× faster than Gas, reducing effective lifespan proportionally.' },
                  { icon: <RefreshCw size={14} className="text-violet-400"/>, title: 'Lead Time Window', body: 'When health % falls below the lead-time threshold, procurement is automatically flagged as "Critical."' },
                  { icon: <Activity size={14} className="text-emerald-400"/>, title: 'Simulate Aging', body: 'Use the ↘ button on any valve row to advance its effective age by 200 days and observe state changes.' },
                ].map((c, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {c.icon}
                      <span className="text-xs font-semibold text-slate-300">{c.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{c.body}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeNav === 'inventory' && (
            <InventoryView inventory={inventory} onDeploy={handleDeploy} thCls={thCls} />
          )}

          {activeNav === 'procurement' && (
            <ProcurementView purchaseOrders={purchaseOrders} onUpdateStatus={handleUpdatePOStatus} thCls={thCls} today={today} />
          )}

          {activeNav === 'settings' && (
            <div className="text-center py-32">
              <Settings size={48} className="mx-auto mb-4 text-slate-700 animate-spin-slow" />
              <h2 className="text-lg font-bold text-slate-400">Settings Page</h2>
              <p className="text-sm text-slate-600">Configuration and user preferences are coming soon.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
