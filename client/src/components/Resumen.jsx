import React, { useEffect, useState, useMemo, memo } from 'react';
import { api, formatCOP } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Percent, ArrowDownLeft, ShieldAlert, Wallet, AlertTriangle, Clock, Ban } from 'lucide-react';

const MetricCard = memo(function MetricCard({ title, value, icon: Icon, className }) {
  return (
    <div className="card">
      <div className="card-metric">
        <div className="metric-header">
          <span>{title}</span>
          <div className="metric-icon"><Icon size={18} /></div>
        </div>
        <span className={`metric-value ${className}`} style={{ wordBreak: 'break-all' }}>{value}</span>
      </div>
    </div>
  );
});

const CustomTooltip = memo(function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(15, 21, 36, 0.95)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '0.75rem', boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(10px)' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{label}</p>
        {payload.map((item, idx) => <p key={idx} style={{ color: item.color, fontSize: '0.85rem', margin: '0.2rem 0' }}>{item.name}: <strong>{formatCOP(item.value)}</strong></p>)}
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
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Cargando datos del resumen...</p>
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="login-error" style={{ display: 'inline-block' }}>{error}</div></div>;
  }

  const { resumen, grafica } = data || { resumen: {}, grafica: [] };

  const cards = [
    { title: 'Disponible en Caja', value: formatCOP(resumen.saldoCaja || 0), icon: Wallet, className: 'positive' },
    { title: 'Total Prestado', value: formatCOP(resumen.totalPrestado || 0), icon: TrendingUp, className: 'positive' },
    { title: 'Capital Pendiente Total', value: formatCOP(resumen.capitalPendienteTotal || 0), icon: Ban, className: 'positive' },
    { title: 'Intereses Pendientes', value: formatCOP(resumen.interesesPendientes || 0), icon: ShieldAlert, className: 'negative' },
    { title: 'Capital Recuperado', value: formatCOP(resumen.capitalRecuperado || 0), icon: ArrowDownLeft, className: 'positive' },
    { title: 'Intereses Cobrados', value: formatCOP(resumen.interesesCobrados || 0), icon: Percent, className: 'positive' },
  ];

  return (
    <div>
      {/* Alert: Loans with >3 months without payment */}
      {prestamosEnRiesgo.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
          border: '1px solid var(--color-warning)',
          borderRadius: '12px', padding: '16px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <AlertTriangle size={20} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-warning)', fontWeight: '500' }}>
            ⚠️ {prestamosEnRiesgo.length} préstamo(s) llevan más de 3 meses sin registrar abonos
          </p>
        </div>
      )}

      {/* Indicator: Highest pending interest */}
      {prestamoMayorInteres && mayorInteresPendiente > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-primary) 40%, transparent)',
          borderRadius: '12px', padding: '16px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <Clock size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-primary)', fontWeight: '500' }}>
            Mayor riesgo: <strong>{prestamoMayorInteres.deudor}</strong> — {formatCOP(mayorInteresPendiente)} de intereses pendientes
          </p>
        </div>
      )}

      {/* Metric cards */}
      <div className="cards-grid">
        {cards.map((card, idx) => (
          <MetricCard key={idx} title={card.title} value={card.value} icon={card.icon} className={card.className} />
        ))}
      </div>

      {/* Chart */}
      <div className="chart-section">
        <div className="chart-header">
          <h3 className="chart-title">Análisis de Cartera por Deudor</h3>
          <p className="chart-subtitle">Capital pendiente e intereses pendientes acumulados por cada cliente</p>
        </div>
        {grafica.length === 0 ? (
          <div style={{ height: `${chartHeight}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)' }}>No hay préstamos registrados para mostrar la gráfica.</p>
          </div>
        ) : (
          <div className="chart-wrapper" style={{ height: `${chartHeight}px`, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafica} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                <XAxis dataKey="deudor" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.85rem', color: 'var(--text-primary)' }} />
                <Bar dataKey="capitalPendiente" name="Capital Pendiente" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="interesesPendientes" name="Intereses Pendientes" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
