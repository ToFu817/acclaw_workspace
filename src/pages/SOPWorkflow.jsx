import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGasQuery } from '../hooks/useGasQuery';
import { useGasRpc } from '../hooks/useGasRpc';
import { useToast } from '../components/UI/TofuToast';
import { SHEET_NAMES } from '../utils/constants';
import { generateId } from '../utils/helpers';
import TofuCard from '../components/UI/TofuCard';
import TofuButton from '../components/UI/TofuButton';
import TofuModal from '../components/UI/TofuModal';
import TofuInput from '../components/UI/TofuInput';
import TofuSelect from '../components/UI/TofuSelect';
import TofuBadge from '../components/UI/TofuBadge';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import './SOPWorkflow.css';

export default function SOPWorkflow() {
  const toast = useToast();
  const { data, loading, refetch } = useGasQuery(SHEET_NAMES.SOP);
  const { data: clients } = useGasQuery(SHEET_NAMES.CLIENTS);
  const { data: employees } = useGasQuery(SHEET_NAMES.GROUPS);
  const { add, update, remove, loading: mutating } = useGasRpc();
  const rpc = useGasRpc();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ sopId: '', sopName: '', steps: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [applyModal, setApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ sopId: '', clientId: '', handler: '' });

  const handleOpen = (item = null) => {
    setEditing(item);
    setForm(item ? { ...item } : { sopId: generateId('SOP'), sopName: '', steps: '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.sopName || !form.steps) { toast.error('請填寫 SOP 名稱和步驟'); return; }
    const result = editing
      ? await update(SHEET_NAMES.SOP, editing.rowIndex, form)
      : await add(SHEET_NAMES.SOP, form);
    if (result.success) { toast.success(editing ? '更新成功' : '新增成功'); setModalOpen(false); refetch(); }
  };

  const handleDelete = async () => {
    const result = await remove(SHEET_NAMES.SOP, deleteTarget.rowIndex);
    if (result.success) { toast.success('刪除成功'); setDeleteTarget(null); refetch(); }
  };

  const handleApplySOP = async () => {
    if (!applyForm.sopId || !applyForm.clientId) {
      toast.error('請選擇 SOP 和客戶');
      return;
    }
    const sop = data.find((s) => String(s.sopId).trim() === String(applyForm.sopId).trim());
    const client = clients.find((c) => String(c.clientId).trim() === String(applyForm.clientId).trim());
    if (!sop || !client) { toast.error('資料不完整'); return; }

    // Create a single task with all SOP steps embedded
    const taskData = {
      taskId: generateId('T'),
      taskItem: sop.sopName,
      clientId: client.clientId,
      companyName: client.companyName,
      handler: applyForm.handler || client.handler || '',
      dueDate: '',
      completedDate: '',
      status: '待處理',
      sopSteps: sop.steps, // All steps stored in one task
      note: `SOP 流程：${sop.sopName}`,
      reviewer: '',
      reviewDate: '',
    };

    const result = await rpc.add(SHEET_NAMES.TASKS, taskData);
    if (result.success) {
      toast.success(`已將「${sop.sopName}」套用到「${client.companyName}」的工作任務中`);
      setApplyModal(false);
      setApplyForm({ sopId: '', clientId: '', handler: '' });
    }
  };

  const clientOptions = clients.map((c) => ({ value: c.clientId, label: `${c.clientId} - ${c.companyName}` }));
  const handlerOptions = employees.map((e) => ({ value: e.employeeName, label: e.employeeName }));
  const sopOptions = data.map((s) => ({ value: s.sopId, label: s.sopName }));

  return (
    <div className="sop-page">
      <div className="sop-page__toolbar">
        <TofuButton onClick={() => handleOpen()} icon="➕">新增 SOP</TofuButton>
        <TofuButton variant="secondary" onClick={() => setApplyModal(true)} icon="🚀">
          套用 SOP 到任務
        </TofuButton>
      </div>

      <div className="sop-grid stagger-children">
        {data.map((sop) => {
          const steps = (sop.steps || '').split(',').filter(Boolean);
          return (
            <TofuCard key={sop.sopId} className="sop-card">
              <div className="sop-card__header">
                <h3 className="sop-card__title">⚙️ {sop.sopName}</h3>
                <div className="sop-card__actions">
                  <TofuButton size="sm" variant="ghost" onClick={() => handleOpen(sop)}>編輯</TofuButton>
                  <TofuButton size="sm" variant="danger" onClick={() => setDeleteTarget(sop)}>刪除</TofuButton>
                </div>
              </div>
              <div className="sop-steps">
                {steps.map((step, i) => (
                  <motion.div
                    key={i}
                    className="sop-step"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="sop-step__number">{i + 1}</div>
                    <span className="sop-step__label">{step.trim()}</span>
                    {i < steps.length - 1 && <div className="sop-step__connector" />}
                  </motion.div>
                ))}
              </div>
              <div className="sop-card__footer">
                <TofuBadge color="blue" size="sm">{steps.length} 個步驟</TofuBadge>
              </div>
            </TofuCard>
          );
        })}

        {data.length === 0 && (
          <div className="sop-empty">
            <span>📭</span>
            <p>尚未建立任何 SOP 流程</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <TofuModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '編輯 SOP' : '新增 SOP'} onConfirm={handleSave} loading={mutating}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <TofuInput label="SOP 名稱" value={form.sopName} onChange={(v) => setForm({ ...form, sopName: v })} required placeholder="如：工商登記流程" />
          <TofuInput label="步驟（以逗號分隔）" value={form.steps} onChange={(v) => setForm({ ...form, steps: v })} type="textarea" required placeholder="客戶訪談,名稱預查,印章刻印,..." />
          {form.steps && (
            <div className="sop-preview">
              <p className="sop-preview__title">預覽：</p>
              <div className="sop-steps sop-steps--preview">
                {form.steps.split(',').filter(Boolean).map((step, i) => (
                  <div key={i} className="sop-step">
                    <div className="sop-step__number">{i + 1}</div>
                    <span className="sop-step__label">{step.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </TofuModal>

      {/* Apply SOP Modal */}
      <TofuModal isOpen={applyModal} onClose={() => setApplyModal(false)} title="套用 SOP 到工作任務" onConfirm={handleApplySOP} loading={rpc.loading} confirmText="套用">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <TofuSelect label="選擇 SOP" value={applyForm.sopId} onChange={(v) => setApplyForm({ ...applyForm, sopId: v })} options={sopOptions} required />
          <TofuSelect label="選擇客戶" value={applyForm.clientId} onChange={(v) => setApplyForm({ ...applyForm, clientId: v })} options={clientOptions} required />
          <TofuSelect label="承辦人" value={applyForm.handler} onChange={(v) => setApplyForm({ ...applyForm, handler: v })} options={handlerOptions} />
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            套用後會自動在「工作任務」中建立一筆包含所有 SOP 步驟的任務。
          </p>
        </div>
      </TofuModal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="刪除 SOP" message={`確定要刪除「${deleteTarget?.sopName}」嗎？`} loading={mutating} />
    </div>
  );
}
