import React, { useEffect, useState } from 'react';
import { api, formatCOP } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Percent, ArrowDownLeft, ShieldAlert, Wallet } from 'lucide-react';

export default function Resumen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchResumen = async () => {
    try {
      setLoading(true);
      const res = await api.getResumen();
      setData(res);
    } catch (err) {
      setError('No se pudo cargar el resumen de métricas.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumen();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Cargando datos del resumen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="login-error" style={{ display: 'inline-block' }}>{error}</div>
      </div>
    );
  }

  const { resumen, grafica } = data || { resumen: {}, grafica: [] };

  const cards = [
    {
      title: 'Disponible en Caja',
      value: formatCOP(resumen.saldoCaja || 0),
      icon: Wallet,
      className: 'positive',
    },
    {
      title: 'Total Prestado',
      value: formatCOP(resumen.totalPrestado || 0),
      icon: TrendingUp,
      className: 'positive',
    },
    {
      title: 'Intereses Pendientes',
      value: formatCOP(resumen.interesesPendientes || 0),
      icon: ShieldAlert,
      className: 'negative',
    },
    {
      title: 'Capital Recuperado',
      value: formatCOP(resumen.capitalRecuperado || 0),
      icon: ArrowDownLeft,
      className: 'positive',
    },
    {
      title: 'Intereses Cobrados',
      value: formatCOP(resumen.interesesCobrados || 0),
      icon: Percent,
      className: 'positive',
    },
  ];

  // Custom tooltips para la gráfica
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: 'rgba(15, 21, 36, 0.95)', 
          border: '1px solid var(--border-color)', 
          padding: '1rem', 
          borderRadius: '0.75rem',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(10px)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{label}</p>
          {payload.map((item, idx) => (
            <p key={idx} style={{ color: item.color, fontSize: '0.85rem', margin: '0.2rem 0' }}>
              {item.name}: <strong>{formatCOP(item.value)}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="cards-grid">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div className="card" key={idx}>
              <div className="card-metric">
                <div className="metric-header">
                  <span>{card.title}</span>
                  <div className="metric-icon">
                    <Icon size={18} />
                  </div>
                </div>
                <span className={`metric-value ${card.className}`}>
                  {card.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <h3 className="chart-title">Análisis de Cartera por Deudor</h3>
          <p className="chart-subtitle">Capital pendiente e intereses pendientes acumulados por cada cliente</p>
        </div>
        
        {grafica.length === 0 ? (
          <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)' }}>No hay préstamos registrados para mostrar la gráfica.</p>
          </div>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={grafica}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                <XAxis 
                  dataKey="deudor" 
                  stroke="var(--text-secondary)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={{ stroke: 'var(--border-color)' }}
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={{ stroke: 'var(--border-color)' }}
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}
                />
                <Bar 
                  dataKey="capitalPendiente" 
                  name="Capital Pendiente" 
                  fill="#6366f1" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="interesesPendientes" 
                  name="Intereses Pendientes" 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
