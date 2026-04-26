import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import TofuCard from '../components/UI/TofuCard';
import { getDashboardStats } from '../api/gasApi';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/helpers';
import './Dashboard.css';

const statCards = [
  { key: 'pending', label: '待處理', icon: '📋', color: 'yellow' },
  { key: 'delayed', label: '延遲中', icon: '⏰', color: 'pink' },
  { key: 'completed', label: '已完成', icon: '✅', color: 'green' },
  { key: 'reviewing', label: '待審核', icon: '🔍', color: 'blue' },
  { key: 'reviewed', label: '已審核', icon: '✨', color: 'purple' },
];

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [startMonth, setStartMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().substring(0, 7);
  });
  const [endMonth, setEndMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().substring(0, 7);
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const result = await getDashboardStats({ startMonth, endMonth });
      if (result.status === 'success') setStats(result.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [startMonth, endMonth]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="tofu-spinner" style={{ width: 40, height: 40 }} />
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <motion.div
        className="dashboard__welcome"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2>
          歡迎回來，{user?.employeeName} 👋
        </h2>
        <p>以下是今天的工作摘要</p>
      </motion.div>

      {/* Task Status Cards */}
      <div className="dashboard__stats stagger-children">
        {statCards.map((card, i) => (
          <TofuCard key={card.key} className={`stat-card stat-card--${card.color}`}>
            <div className="stat-card__header">
              <span className="stat-card__icon">{card.icon}</span>
              <span className="stat-card__label">{card.label}</span>
            </div>
            <motion.div
              className="stat-card__value"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 + i * 0.08 }}
            >
              {stats?.[card.key] ?? 0}
            </motion.div>
          </TofuCard>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="dashboard__summary stagger-children">
        <TofuCard className="summary-card">
          <div className="summary-card__header">
            <span>🏢</span>
            <h3>客戶總覽</h3>
          </div>
          <div className="summary-card__body">
            <div className="summary-item">
              <span className="summary-item__label">總客戶數</span>
              <span className="summary-item__value">{stats?.totalClients ?? 0}</span>
            </div>
            <div className="summary-item">
              <span className="summary-item__label">待分配客戶</span>
              <span className="summary-item__value summary-item__value--warn">{stats?.unassignedClients ?? 0}</span>
            </div>
          </div>
        </TofuCard>

        {isAdmin && (
          <TofuCard className="summary-card">
            <div className="summary-card__header">
              <span>💰</span>
              <h3>收費統計</h3>
            </div>
            <div className="summary-card__body">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input 
                  type="month" 
                  value={startMonth} 
                  onChange={(e) => setStartMonth(e.target.value)} 
                  style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <span style={{ alignSelf: 'center' }}>-</span>
                <input 
                  type="month" 
                  value={endMonth} 
                  onChange={(e) => setEndMonth(e.target.value)} 
                  style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div className="summary-item">
                <span className="summary-item__label">總收費金額</span>
                <span className="summary-item__value">${formatCurrency(stats?.totalBilling ?? 0)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-item__label">待收款金額</span>
                <span className="summary-item__value summary-item__value--warn">${formatCurrency(stats?.unpaidBilling ?? 0)}</span>
              </div>
            </div>
          </TofuCard>
        )}

        <TofuCard className="summary-card">
          <div className="summary-card__header">
            <span>📅</span>
            <h3>本月待辦</h3>
          </div>
          <div className="summary-card__body">
            <div className="monthly-goals">
              {(stats?.monthlyGoals || []).map((goal, i) => (
                <div key={i} className="monthly-goal-item">
                  <span className="goal-bullet">•</span>
                  <span className="goal-text">{goal}</span>
                </div>
              ))}
              {(!stats?.monthlyGoals || stats.monthlyGoals.length === 0) && (
                <p className="summary-card__note">本月無特殊年度任務</p>
              )}
            </div>
          </div>
        </TofuCard>
      </div>
    </div>
  );
}
