import React, { useEffect, useState, useMemo, memo } from 'react';
import { api, formatCOP } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Percent, ArrowDownLeft, ShieldAlert, Wallet, AlertTriangle, Clock, Ban } from 'lucide-react';

const MetricCard = memo(function MetricCard({ title, value, icon: Icon, delay = 0 }) {
  return (
    <div
      className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-slide-up"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-card)',
        animationDelay: `${delay}s`,
        opacity: 0,
      }}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            {title}
          </span>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)', opacity: 0.5 }}>
            <Icon size={20} />
          </div>
        </div>
        <span className="text-2xl font-bold font-mono break-all" style={{ color: 'var(--color-text)' }}>
          {value}
        </span>
      </div>
    </div>
  );
});

const CustomTooltip = memo(function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl p-4 shadow-lg border" style={{ background: 'rgba(15,21,36,0.95)', borderColor: 'var(--color-border)', backdropFilter: 'blur(10px)' }}>
        <p className="font-bold text-sm mb-2" style={{ color: '#fff' }}>{label}</p>
        {payload.map((item, idx) => (
          <p key={idx} style={{ color: item.color, fontSize: '0.85rem', margin: '0.2rem 0' }}>
            {item.name}: <strong>{formatCOP(item.value)}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
});

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

export default function Resumen() {
  const { width: windowWidth } = useWindowSize();
  const chartHeight = windowWidth < 768 ? 250 : 350;
  const [data, setData] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, loans] = await Promise.all([api.getResumen(), api.getPrestamos()]);
      setData(res);
      setPrestamos(loans);
    } catch (err) {
      setError('No se pudo cargar el resumen de métricas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const prestamosEnRiesgo = useMemo(() => {
    const hoy = new Date();
    return prestamos.filter(p => {
      const activo = parseFloat(p.capital_pendiente) > 0;
      if (!activo) return false;
      const ultimoAbono = new Date(p.fecha_inicio);
      const mesesSinAbono = (hoy - ultimoAbono) / (1000 * 60 * 60 * 24 * 30);
      return mesesSinAbono > 3 && parseFloat(p.total_abonado_interes || 0) === 0;
    });
  }, [prestamos]);

  const activeLoans = useMemo(() => {
    return prestamos.filter(p => parseFloat(p.capital_pendiente) > 0);
  }, [prestamos]);

  const mayorInteresPendiente = useMemo(() => {
    return activeLoans.length > 0 ? activeLoans.reduce((max, p) => Math.max(max, parseFloat(p.interes_pendiente) || 0), 0) : 0;
  }, [activeLoans]);

  const prestamoMayorInteres = useMemo(() => {
    return activeLoans.find(p => (parseFloat(p.interes_pendiente) || 0) === mayorInteresPendiente);
  }, [activeLoans, mayorInteresPendiente]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
            </div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center p-6 rounded-xl" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 text-sm font-medium rounded-xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>Reintentar</button>
        </div>
      </div>
    );
  }

  const { resumen, grafica } = data || { resumen: {}, grafica: [] };

  const cards = [
    { title: 'Disponible en Caja', value: formatCOP(resumen.saldoCaja || 0), icon: Wallet },
    { title: 'Total Prestado', value: formatCOP(resumen.totalPrestado || 0), icon: TrendingUp },
    { title: 'Capital Pendiente Total', value: formatCOP(resumen.capitalPendienteTotal || 0), icon: Ban },
    { title: 'Intereses Pendientes', value: formatCOP(resumen.interesesPendientes || 0), icon: ShieldAlert },
    { title: 'Capital Recuperado', value: formatCOP(resumen.capitalRecuperado || 0), icon: ArrowDownLeft },
    { title: 'Intereses Cobrados', value: formatCOP(resumen.interesesCobrados || 0), icon: Percent },
  ];

  return (
    <div className="space-y-4">
      {prestamosEnRiesgo.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', borderColor: 'var(--color-warning)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
            ⚠️ {prestamosEnRiesgo.length} préstamo(s) llevan más de 3 meses sin registrar abonos
          </p>
        </div>
      )}

      {prestamoMayorInteres && mayorInteresPendiente > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
          <Clock size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
            Mayor riesgo: <strong>{prestamoMayorInteres.deudor}</strong> — {formatCOP(mayorInteresPendiente)} de intereses pendientes
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, idx) => (
          <MetricCard key={idx} title={card.title} value={card.value} icon={card.icon} delay={0.03 * idx} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border p-5 lg:p-6 shadow-sm animate-fade-slide-up" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)', animationDelay: '0.18s', opacity: 0 }}>
        <div className="mb-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Análisis de Cartera por Deudor</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Capital pendiente e intereses pendientes acumulados por cada cliente</p>
        </div>
        {grafica.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed" style={{ height: `${chartHeight}px`, borderColor: 'var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay préstamos registrados para mostrar la gráfica.</p>
          </div>
        ) : (
          <div style={{ height: `${chartHeight}px`, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafica} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="deudor" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.85rem' }} />
                <Bar dataKey="capitalPendiente" name="Capital Pendiente" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="interesesPendientes" name="Intereses Pendientes" fill="#FF4757" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
