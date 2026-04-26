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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const result = await getDashboardStats({ employeeName: user?.employeeName, role: user?.role });
      if (result.status === 'success') setStats(result.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.employeeName) {
      fetchStats();
    }
  }, [user?.employeeName]);

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

        <TofuCard className="summary-card">
          <div className="summary-card__header">
            <span>🔥</span>
            <h3>我的緊急任務</h3>
          </div>
          <div className="summary-card__body">
            <div className="monthly-goals" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {(stats?.urgentTasks || []).map((task, i) => (
                <div key={i} className="monthly-goal-item" style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
                  <span className="goal-bullet" style={{ color: task.status === '延遲中' ? '#e74c3c' : '#f39c12' }}>•</span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div className="goal-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                      {task.taskItem}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🏢 {task.companyName}
                    </div>
                    <div style={{ fontSize: '11px', color: task.status === '延遲中' ? '#e74c3c' : '#888', marginTop: '2px' }}>
                      {task.status === '延遲中' ? `❌ 已延遲 (${task.dueDate})` : `⏳ 期限: ${task.dueDate}`}
                    </div>
                  </div>
                </div>
              ))}
              {(!stats?.urgentTasks || stats.urgentTasks.length === 0) && (
                <p className="summary-card__note">目前沒有緊急或延遲的任務，太棒了！🎉</p>
              )}
            </div>
          </div>
        </TofuCard>

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
