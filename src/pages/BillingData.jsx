import { useState, useMemo } from 'react';
import { useGasQuery } from '../hooks/useGasQuery';
import { useGasRpc } from '../hooks/useGasRpc';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/UI/TofuToast';
import { SHEET_NAMES, BILLING_FIELDS } from '../utils/constants';
import { formatCurrency, autoFillClientData } from '../utils/helpers';
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

  // 收款統計
  const stats = useMemo(() => {
    const byHandler = {};
    let totalAmount = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    (data || []).forEach((row) => {
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
  }, [data]);

  const unpaidList = useMemo(() => (data || []).filter((r) => Number(r.unpaid) > 0), [data]);

  const filteredData = useMemo(() => {
    if (activeTab === 'all') return data;
    if (activeTab === 'unpaid') return unpaidList;
    if (activeTab === 'paid') return data.filter((r) => Number(r.unpaid) === 0 && Number(r.paid) > 0);
    return data;
  }, [data, activeTab, unpaidList]);

  const handleOpen = (item = null) => {
    setEditing(item);
    if (item) {
      setForm({ ...item });
    } else {
      const empty = {};
      BILLING_FIELDS.forEach((f) => { empty[f.key] = ''; });
      setForm(empty);
    }
    setModalOpen(true);
  };

  // 處理客戶編號變更：自動帶入公司名稱
  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'clientId') {
        const client = clients.find(c => String(c.clientId).trim() === String(value).trim());
        if (client) {
          updated.companyName = client.companyName || '';
          updated.handler = client.handler || '';
        }
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

  // 列表一鍵收款功能
  const handleTogglePaid = async (row) => {
    const isCurrentlyPaid = Number(row.unpaid) === 0 && Number(row.paid) > 0;
    
    let updates;
    if (isCurrentlyPaid) {
      // 取消勾選
      updates = { ...row, paid: 0, unpaid: row.amount, paymentDate: '' };
    } else {
      // 勾選：收齊全額
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
    { key: 'billingMonth', label: '月份', width: '90px' },
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
    { key: 'paymentDate', label: '收款日期', width: '110px' },
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

      <div className="billing-toolbar">
        <TofuButton onClick={() => handleOpen()} icon="➕">新增收費紀錄</TofuButton>
        {isAdmin && (
          <TofuButton variant="secondary" onClick={() => setImportOpen(true)} icon="📥">Excel 匯入</TofuButton>
        )}
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
          <TofuInput label="客戶編號" value={form.clientId || ''} onChange={(v) => handleFormChange('clientId', v)} placeholder="輸入後自動帶入公司名" required />
          <TofuInput label="公司行號名稱" value={form.companyName || ''} readOnly placeholder="自動匹配中..." />
          <TofuSelect label="承辦" value={form.handler || ''} onChange={(v) => handleFormChange('handler', v)} options={handlerOptions} />
          <TofuInput label="收費月份" value={form.billingMonth || ''} onChange={(v) => handleFormChange('billingMonth', v)} placeholder="如：2026/04" />
          <TofuInput label="收費金額" value={form.amount || ''} onChange={(v) => handleFormChange('amount', v)} type="number" />
          <TofuInput label="已收款" value={form.paid || ''} onChange={(v) => handleFormChange('paid', v)} type="number" />
          <TofuInput label="待收款" value={form.unpaid || ''} onChange={(v) => handleFormChange('unpaid', v)} type="number" />
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
