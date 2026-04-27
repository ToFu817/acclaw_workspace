import { useState, useEffect } from 'react';
import { useGasQuery } from '../hooks/useGasQuery';
import { useGasRpc } from '../hooks/useGasRpc';
import { useToast } from '../components/UI/TofuToast';
import { SHEET_NAMES, MONTH_NAMES } from '../utils/constants';
import TofuCard from '../components/UI/TofuCard';
import TofuButton from '../components/UI/TofuButton';
import TofuModal from '../components/UI/TofuModal';
import TofuInput from '../components/UI/TofuInput';
import TofuSelect from '../components/UI/TofuSelect';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import './AnnualSchedule.css';

export default function AnnualSchedule() {
  const toast = useToast();
  const { data, loading, refetch } = useGasQuery(SHEET_NAMES.ANNUAL);
  const { add, update, remove, rpc, loading: mutating } = useGasRpc();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ month: '1', annualTask: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  // 初始化資料（如果 Sheet 是空的）
  useEffect(() => {
    if (!loading && data.length === 0) {
      rpc('initAnnual').then(() => refetch());
    }
  }, [data, loading]);

  const handleOpen = (item = null) => {
    setEditing(item);
    setForm(item ? { ...item } : { month: '1', annualTask: '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.annualTask) return toast.error('請填寫任務名稱');
    const result = editing
      ? await update(SHEET_NAMES.ANNUAL, editing.rowIndex, form)
      : await add(SHEET_NAMES.ANNUAL, form);
    if (result.success) {
      toast.success('存檔成功');
      setModalOpen(false);
      refetch();
    }
  };

  const handleDelete = async () => {
    const result = await remove(SHEET_NAMES.ANNUAL, deleteTarget.rowIndex);
    if (result.success) {
      toast.success('刪除成功');
      setDeleteTarget(null);
      refetch();
    }
  };

  // 按月份分組
  const groupedData = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1);
    return {
      month,
      tasks: data.filter(d => String(d.month) === month)
    };
  });

  return (
    <div className="annual-page">
      <div className="annual-header">
        <TofuButton onClick={() => handleOpen()} icon="➕">新增常態任務</TofuButton>
      </div>

      <div className="annual-grid">
        {groupedData.map(({ month, tasks }) => (
          <TofuCard key={month} className="month-card" title={MONTH_NAMES[month - 1]}>
            <div className="month-tasks">
              {tasks.map((task) => (
                <div key={task.rowIndex} className="month-task-item">
                  <span>{task.annualTask}</span>
                  <div className="month-task-actions">
                    <TofuButton size="xs" variant="ghost" onClick={() => handleOpen(task)}>改</TofuButton>
                    <TofuButton size="xs" variant="danger" onClick={() => setDeleteTarget(task)}>刪</TofuButton>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && <p className="month-empty">尚未設定任務</p>}
            </div>
          </TofuCard>
        ))}
      </div>

      <TofuModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '編輯常態任務' : '新增常態任務'} onConfirm={handleSave} loading={mutating}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <TofuSelect 
            label="月份" 
            value={form.month} 
            onChange={(v) => setForm({ ...form, month: v })} 
            options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))} 
          />
          <TofuInput label="任務名稱" value={form.annualTask} onChange={(v) => setForm({ ...form, annualTask: v })} required />
        </div>
      </TofuModal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="刪除任務" message={`確定要刪除「${deleteTarget?.annualTask}」嗎？`} loading={mutating} />
    </div>
  );
}
