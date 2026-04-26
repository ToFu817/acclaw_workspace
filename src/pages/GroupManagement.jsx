import { useState } from 'react';
import { useGasQuery } from '../hooks/useGasQuery';
import { useGasRpc } from '../hooks/useGasRpc';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/UI/TofuToast';
import { SHEET_NAMES, ROLES } from '../utils/constants';
import { generateId } from '../utils/helpers';
import TofuTable from '../components/UI/TofuTable';
import TofuButton from '../components/UI/TofuButton';
import TofuModal from '../components/UI/TofuModal';
import TofuInput from '../components/UI/TofuInput';
import TofuSelect from '../components/UI/TofuSelect';
import TofuAvatar from '../components/UI/TofuAvatar';
import TofuBadge from '../components/UI/TofuBadge';
import ExcelImport from '../components/UI/ExcelImport';
import ConfirmDialog from '../components/UI/ConfirmDialog';

const emptyForm = { employeeId: '', employeeName: '', title: '', role: '一般使用者', username: '', password: '' };

export default function GroupManagement() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { data, loading, refetch } = useGasQuery(SHEET_NAMES.GROUPS);
  const { add, update, remove, importBatch, loading: mutating } = useGasRpc();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleOpen = (item = null) => {
    setEditing(item);
    setForm(item ? { ...item, password: '' } : { ...emptyForm, employeeId: generateId('EMP') });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.employeeName) { toast.error('請輸入員工姓名'); return; }
    const saveData = { ...form };
    if (!saveData.password && editing) delete saveData.password; // Don't overwrite password if empty
    const result = editing
      ? await update(SHEET_NAMES.GROUPS, editing.rowIndex, saveData)
      : await add(SHEET_NAMES.GROUPS, saveData);
    if (result.success) { toast.success(editing ? '更新成功' : '新增成功'); setModalOpen(false); refetch(); }
  };

  const handleDelete = async () => {
    const result = await remove(SHEET_NAMES.GROUPS, deleteTarget.rowIndex);
    if (result.success) { toast.success('刪除成功'); setDeleteTarget(null); refetch(); }
  };

  const handleImport = async (rows) => {
    const result = await importBatch(SHEET_NAMES.GROUPS, rows);
    if (result.success) { toast.success(result.message); setImportOpen(false); refetch(); }
  };

  const columns = [
    {
      key: 'avatar',
      label: '',
      width: '50px',
      render: (_, row) => <TofuAvatar seed={row.employeeName} size={32} />,
    },
    { key: 'employeeId', label: '員工編號', width: '120px' },
    { key: 'employeeName', label: '員工姓名' },
    { key: 'title', label: '職稱', width: '120px' },
    {
      key: 'role',
      label: '權限',
      width: '100px',
      render: (v) => {
        let color = 'blue';
        let label = v;
        if (v === '管理者') color = 'purple';
        else if (v === '資深使用者') color = 'orange';
        return <TofuBadge color={color}>{label}</TofuBadge>;
      },
    },
    { key: 'username', label: '帳號', width: '100px' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <TofuButton onClick={() => handleOpen()} icon="➕">新增員工</TofuButton>
        <TofuButton variant="secondary" onClick={() => setImportOpen(true)} icon="📥">Excel 匯入</TofuButton>
      </div>

      <TofuTable
        columns={columns}
        data={data}
        actions={(row) => (
          <>
            <TofuButton size="sm" variant="ghost" onClick={() => handleOpen(row)}>編輯</TofuButton>
            <TofuButton size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>刪除</TofuButton>
          </>
        )}
      />

      <TofuModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '編輯員工' : '新增員工'} onConfirm={handleSave} loading={mutating}>
        <div className="modal-form-grid">
          <TofuInput label="員工編號" value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} required />
          <TofuInput label="員工姓名" value={form.employeeName} onChange={(v) => setForm({ ...form, employeeName: v })} required />
          <TofuInput label="職稱" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <TofuSelect 
            label="權限" 
            value={form.role} 
            onChange={(v) => setForm({ ...form, role: v })} 
            options={[
              { value: '管理者', label: '管理者' }, 
              { value: '資深使用者', label: '資深使用者' }, 
              { value: '一般使用者', label: '一般使用者' }
            ]} 
          />
          <TofuInput label="帳號" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
          <TofuInput label="密碼" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" placeholder={editing ? '留空則不變更' : ''} />
        </div>
      </TofuModal>

      <TofuModal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Excel 匯入員工" hideFooter>
        <ExcelImport onImport={handleImport} loading={mutating} />
      </TofuModal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="刪除員工" message={`確定要刪除「${deleteTarget?.employeeName}」嗎？`} loading={mutating} />
    </div>
  );
}
