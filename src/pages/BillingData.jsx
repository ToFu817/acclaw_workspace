import { useState, useMemo, useEffect } from 'react';
import { useGasQuery } from '../hooks/useGasQuery';
import { useGasRpc } from '../hooks/useGasRpc';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/UI/TofuToast';
import { SHEET_NAMES, BILLING_FIELDS } from '../utils/constants';
import { formatCurrency } from '../utils/helpers';
import TofuTable from '../components/UI/TofuTable';
import TofuButton from '../components/UI/TofuButton';
import TofuModal from '../components/UI/TofuModal';
import TofuInput from '../components/UI/TofuInput';
import TofuSelect from '../components/UI/TofuSelect';
import TofuBadge from '../components/UI/TofuBadge';
import TofuCard from '../components/UI/TofuCard';
import TofuTabs from '../components/UI/TofuTabs';
import TofuAvatar from '../components/UI/TofuAvatar';
import ExcelImport from '../components/UI/ExcelImport';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import './BillingData.css';

export default function BillingData() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { data = [], loading, refetch } = useGasQuery(SHEET_NAMES.BILLING);
  const { data: clients = [] } = useGasQuery(SHEET_NAMES.CLIENTS);
  const { data: employees = [] } = useGasQuery(SHEET_NAMES.GROUPS);
  const { add, update, remove, importBatch, loading: mutating } = useGasRpc();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // 篩選器狀態
  const [filterStartMonth, setFilterStartMonth] = useState('');
  const [filterEndMonth, setFilterEndMonth] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');

  // 年月份選單選項
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({ value: String(currentYear - 2 + i), label: String(currentYear - 2 + i) }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: `${i + 1}月` }));

  const [selYear, setSelYear] = useState(String(currentYear));
  const [selMonth, setSelMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));

  // 基本篩選後的資料
  const displayData = useMemo(() => {
    let list = data || [];
    
    if (filterStartMonth || filterEndMonth) {
      list = list.filter(row => {
        if (!row.billingMonth) return false;
        const bm = String(row.billingMonth).replace(/\//g, '-');
        const fm = bm.length >= 7 ? bm.substring(0, 7) : bm;
        if (filterStartMonth && fm < filterStartMonth) return false;
        if (filterEndMonth && fm > filterEndMonth) return false;
        return true;
      });
    }

    if (filterEmployee) {
      list = list.filter(row => row.handler === filterEmployee);
    }
    return list;
  }, [data, filterStartMonth, filterEndMonth, filterEmployee]);

  // 收款統計
  const stats = useMemo(() => {
    const byHandler = {};
    let totalAmount = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    displayData.forEach((row) => {
      const amount = Number(row.amount) || 0;
      const paid = Number(row.paid) || 0;
      const unpaid = Number(row.unpaid) || 0;
      totalAmount += amount;
      totalPaid += paid;
      totalUnpaid += unpaid;

      const handler = row.handler || '未指定';
      if (!byHandler[handler]) byHandler[handler] = { total: 0, paid: 0, unpaid: 0, count: 0 };
      byHandler[handler].total += amount;
      byHandler[handler].paid += paid;
      byHandler[handler].unpaid += unpaid;
      byHandler[handler].count += 1;
    });

    return { totalAmount, totalPaid, totalUnpaid, byHandler };
  }, [displayData]);

  const unpaidList = useMemo(() => displayData.filter((r) => Number(r.unpaid) > 0), [displayData]);

  const filteredData = useMemo(() => {
    if (activeTab === 'all') return displayData;
    if (activeTab === 'unpaid') return unpaidList;
    if (activeTab === 'paid') return displayData.filter((r) => Number(r.unpaid) === 0 && Number(r.paid) > 0);
    return displayData;
  }, [displayData, activeTab, unpaidList]);

  const handleOpen = (item = null) => {
    setEditing(item);
    if (item) {
      setForm({ ...item });
      const [y, m] = String(item.billingMonth || '').split('/');
      if (y && m) { setSelYear(y); setSelMonth(m); }
    } else {
      const empty = {};
      BILLING_FIELDS.forEach((f) => { empty[f.key] = ''; });
      setForm({ ...empty, billingMonth: `${selYear}/${selMonth}` });
    }
    setModalOpen(true);
  };

  // 當年份或月份下拉選單變動時，更新 form.billingMonth
  useEffect(() => {
    if (modalOpen) {
      setForm(prev => ({ ...prev, billingMonth: `${selYear}/${selMonth}` }));
    }
  }, [selYear, selMonth]);

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      // 自動帶入客戶資料
      if (field === 'clientId') {
        const client = clients.find(c => String(c.clientId).trim() === String(value).trim());
        if (client) {
          updated.companyName = client.companyName || '';
          updated.handler = client.handler || '';
        }
      }

      // 自動計算待收款: 收費金額 - 已收款
      if (field === 'amount' || field === 'paid') {
        const amt = Number(field === 'amount' ? value : updated.amount) || 0;
        const paid = Number(field === 'paid' ? value : updated.paid) || 0;
        updated.unpaid = amt - paid;
      }

      return updated;
    });
  };

  const handleSave = async () => {
    if (!form.clientId) return toast.error('請填寫客戶編號');
    const result = editing
      ? await update(SHEET_NAMES.BILLING, editing.rowIndex, form)
      : await add(SHEET_NAMES.BILLING, form);
    if (result.success) {
      toast.success(editing ? '更新成功' : '新增成功');
      setModalOpen(false);
      refetch();
    }
  };

  const handleTogglePaid = async (row) => {
    const isCurrentlyPaid = Number(row.unpaid) === 0 && Number(row.paid) > 0;
    let updates;
    if (isCurrentlyPaid) {
      updates = { ...row, paid: 0, unpaid: row.amount, paymentDate: '' };
    } else {
      const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
      updates = { ...row, paid: row.amount, unpaid: 0, paymentDate: today };
    }
    const result = await update(SHEET_NAMES.BILLING, row.rowIndex, updates);
    if (result.success) {
      toast.success(isCurrentlyPaid ? '已取消收款狀態' : '收款成功！');
      refetch();
    }
  };

  const handleDelete = async () => {
    const result = await remove(SHEET_NAMES.BILLING, deleteTarget.rowIndex);
    if (result.success) { toast.success('刪除成功'); setDeleteTarget(null); refetch(); }
  };

  const handleImport = async (rows) => {
    const result = await importBatch(SHEET_NAMES.BILLING, rows);
    if (result.success) { toast.success(result.message); setImportOpen(false); refetch(); }
  };

  const handlerOptions = employees.map((e) => ({ value: e.employeeName, label: e.employeeName }));

  const tabs = [
    { key: 'all', label: '全部', count: data?.length || 0 },
    { key: 'unpaid', label: '待收款', count: unpaidList?.length || 0 },
    { key: 'paid', label: '已收款', count: (data || []).filter((r) => Number(r.unpaid) === 0 && Number(r.paid) > 0).length },
  ];

  const columns = [
    { key: 'clientId', label: '客戶編號', width: '90px' },
    { key: 'companyName', label: '公司行號', minWidth: '160px' },
    { key: 'handler', label: '承辦', width: '80px' },
    {
      key: 'billingMonth',
      label: '月份',
      width: '90px',
      render: (v) => {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v).substring(0, 7);
        // 強制處理時區，避免少一天
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        // 如果小時是 16，代表是台灣時間 00:00 的 UTC 偏移，要加回一天或直接用當地時間
        const localDate = new Date(d.getTime() + (d.getTimezoneOffset() * 60000));
        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    },
    {
      key: 'isPaid',
      label: '收款',
      width: '50px',
      align: 'center',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={Number(row.unpaid) === 0 && Number(row.paid) > 0}
          onChange={() => handleTogglePaid(row)}
          style={{ cursor: 'pointer', width: '20px', height: '20px' }}
        />
      )
    },
    { key: 'amount', label: '總額', width: '100px', render: (v) => formatCurrency(v) },
    { key: 'paid', label: '已收', width: '100px', render: (v) => <span style={{ color: '#3A6B3A', fontWeight: 600 }}>{formatCurrency(v)}</span> },
    { key: 'unpaid', label: '待收', width: '100px', render: (v) => Number(v) > 0 ? <span style={{ color: '#D4726A', fontWeight: 700 }}>{formatCurrency(v)}</span> : '0' },
    {
      key: 'paymentDate', label: '收款日期', width: '110px', render: (v) => {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d.getTime())) return v;
        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      }
    },
  ];

  return (
    <div className="billing-page">
      {isAdmin && (
        <div className="billing-stats stagger-children">
          <TofuCard className="billing-stat-card">
            <span className="billing-stat-icon">💰</span>
            <span className="billing-stat-label">總收費</span>
            <span className="billing-stat-value">${formatCurrency(stats.totalAmount)}</span>
          </TofuCard>
          <TofuCard className="billing-stat-card billing-stat-card--green">
            <span className="billing-stat-icon">✅</span>
            <span className="billing-stat-label">已收款</span>
            <span className="billing-stat-value">${formatCurrency(stats.totalPaid)}</span>
          </TofuCard>
          <TofuCard className="billing-stat-card billing-stat-card--red">
            <span className="billing-stat-icon">⏳</span>
            <span className="billing-stat-label">待收款</span>
            <span className="billing-stat-value">${formatCurrency(stats.totalUnpaid)}</span>
          </TofuCard>
        </div>
      )}

      <div className="billing-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TofuButton onClick={() => handleOpen()} icon="➕">新增收費紀錄</TofuButton>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f5f5', padding: '8px 12px', borderRadius: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>查詢區間:</span>
          <input 
            type="month" 
            value={filterStartMonth} 
            onChange={(e) => setFilterStartMonth(e.target.value)} 
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <span>~</span>
          <input 
            type="month" 
            value={filterEndMonth} 
            onChange={(e) => setFilterEndMonth(e.target.value)} 
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          
          <span style={{ fontSize: '14px', fontWeight: 600, marginLeft: '8px' }}>員工:</span>
          <select 
            value={filterEmployee} 
            onChange={(e) => setFilterEmployee(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">全部</option>
            {handlerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          {isAdmin && (
            <TofuButton variant="secondary" onClick={() => setImportOpen(true)} icon="📥">Excel 匯入</TofuButton>
          )}
        </div>
      </div>

      <TofuTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <TofuTable columns={columns} data={filteredData} loading={loading}
        actions={(row) => (
          <>
            <TofuButton size="sm" variant="ghost" onClick={() => handleOpen(row)}>編輯</TofuButton>
            <TofuButton size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>刪除</TofuButton>
          </>
        )}
      />

      <TofuModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '編輯收費' : '新增收費'} onConfirm={handleSave} loading={mutating}>
        <div className="modal-form-grid">
          <TofuInput label="客戶編號" value={form.clientId || ''} onChange={(v) => handleFormChange('clientId', v)} placeholder="輸入自動帶入公司名稱" required />
          <TofuInput label="公司行號名稱" value={form.companyName || ''} readOnly placeholder="自動匹配中..." />
          <TofuSelect label="承辦" value={form.handler || ''} onChange={(v) => handleFormChange('handler', v)} options={handlerOptions} />

          <div className="form-row-multi">
            <TofuSelect label="收費年份" value={selYear} onChange={setSelYear} options={yearOptions} />
            <TofuSelect label="收費月份" value={selMonth} onChange={setSelMonth} options={monthOptions} />
          </div>

          <TofuInput label="收費金額" value={form.amount || ''} onChange={(v) => handleFormChange('amount', v)} type="number" />
          <TofuInput label="已收款" value={form.paid || ''} onChange={(v) => handleFormChange('paid', v)} type="number" />
          <TofuInput label="待收款" value={form.unpaid || ''} readOnly style={{ backgroundColor: '#f0f0f0' }} />
          <TofuInput label="收款日期" value={form.paymentDate || ''} onChange={(v) => handleFormChange('paymentDate', v)} type="date" />
          <div className="full-width">
            <TofuInput label="銀行帳戶 / 備註" value={form.bankAccount || ''} onChange={(v) => handleFormChange('bankAccount', v)} type="textarea" />
          </div>
        </div>
      </TofuModal>

      <TofuModal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Excel 匯入收費資料" hideFooter>
        <ExcelImport onImport={handleImport} loading={mutating} />
      </TofuModal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="刪除收費" message={`確定要刪除「${deleteTarget?.companyName}」的收費紀錄嗎？`} loading={mutating} />
    </div>
  );
}
