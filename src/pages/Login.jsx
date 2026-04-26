import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import TofuInput from '../components/UI/TofuInput';
import TofuButton from '../components/UI/TofuButton';
import TofuAvatar from '../components/UI/TofuAvatar';
import './Login.css';

const AVATAR_SEEDS = [
  'tofu1', 'bean2', 'mochi3', 'dango4', 'sesame5',
  'matcha6', 'sakura7', 'cloud8', 'pudding9', 'milk10',
];

export default function Login() {
  const { login, loading, error, setError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('請輸入帳號和密碼');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const success = await login(username, password);
    if (!success) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="login-page">
      {/* Floating avatars decoration */}
      <div className="login-avatars">
        {AVATAR_SEEDS.map((seed, i) => (
          <motion.div
            key={seed}
            className="login-avatar-float"
            style={{
              left: `${10 + (i % 5) * 18}%`,
              top: `${15 + Math.floor(i / 5) * 50}%`,
            }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, i % 2 === 0 ? 5 : -5, 0],
            }}
            transition={{
              duration: 3 + i * 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.2,
            }}
          >
            <TofuAvatar seed={seed} size={48 + (i % 3) * 12} />
          </motion.div>
        ))}
      </div>

      <motion.div
        className={`login-card ${shake ? 'login-card--shake' : ''}`}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
      >
        <motion.div
          className="login-card__logo"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
        >
          🧾
        </motion.div>
        <h1 className="login-card__title">案件管理系統</h1>
        <p className="login-card__subtitle">會計師事務所 · 內部管理平台</p>

        <form className="login-card__form" onSubmit={handleSubmit}>
          <TofuInput
            label="帳號"
            value={username}
            onChange={setUsername}
            placeholder="請輸入帳號"
            icon="👤"
          />
          <TofuInput
            label="密碼"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="請輸入密碼"
            icon="🔒"
          />

          {error && (
            <motion.div
              className="login-card__error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <TofuButton
            type="submit"
            size="lg"
            loading={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            登入系統
          </TofuButton>
        </form>

        <div className="login-card__hint">
          <p>請輸入您的員工帳號與密碼</p>
          <div style={{ 
            marginTop: '12px', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '11px',
            display: 'inline-block',
            backgroundColor: import.meta.env.VITE_GAS_URL ? '#e6fffa' : '#fffaf0',
            color: import.meta.env.VITE_GAS_URL ? '#2c7a7b' : '#9c4221',
            border: `1px solid ${import.meta.env.VITE_GAS_URL ? '#b2f5ea' : '#feebc8'}`
          }}>
            連線狀態：{import.meta.env.VITE_GAS_URL ? '🟢 正式連線模式' : '🟡 模擬測試模式 (請設定 Secret)'}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
