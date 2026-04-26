import { useState, useMemo, useEffect } from 'react';
import { useGasQuery } from '../hooks/useGasQuery';
import { useGasRpc } from '../hooks/useGasRpc';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/UI/TofuToast';
import { SHEET_NAMES, TASK_STATUS, TASK_STATUS_COLORS } from '../utils/constants';
import { formatDate, inputFormatDate, generateId } from '../utils/helpers';
import TofuTabs from '../components/UI/TofuTabs';
import TofuTable from '../components/UI/TofuTable';
import TofuBadge from '../components/UI/TofuBadge';
import TofuButton from '../components/UI/TofuButton';
import TofuModal from '../components/UI/TofuModal';
import TofuInput from '../components/UI/TofuInput';
import TofuSelect from '../components/UI/TofuSelect';
import TofuCheckbox from '../components/UI/TofuCheckbox';
import ExcelImport from '../components/UI/ExcelImport';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import './TaskManagement.css';

const statusTabs = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: TASK_STATUS.PENDING, label: '待處理', icon: '⏳' },
  { key: TASK_STATUS.DELAYED, label: '延遲中', icon: '⏰' },
  { key: '已完成', label: '已完成', icon: '✅' },
  { key: TASK_STATUS.REVIEWING, label: '待審核', icon: '🔍' },
  { key: TASK_STATUS.REVIEWED, label: '已審核', icon: '✨' },
];

const emptyForm = () => ({
  taskId: generateId('T'),
  taskItem: '',
  clientId: '',
  companyName: '',
  handler: '',
  dueDate: new Date().toISOString().split('T')[0],
  completedDate: '',
  status: TASK_STATUS.PENDING,
  sopSteps: '',
  note: '',
  reviewer: '',
  reviewDate: '',
});

export default function TaskManagement() {
  const { isAdmin, user } = useAuth();
  const toast = useToast();
  const { data: tasks = [], loading, refetch } = useGasQuery(SHEET_NAMES.TASKS);
  const { data: taskItems = [] } = useGasQuery(SHEET_NAMES.TASK_ITEMS);
  const { data: clients = [] } = useGasQuery(SHEET_NAMES.CLIENTS);
  const { data: employees = [] } = useGasQuery(SHEET_NAMES.GROUPS);
  const { add, update, remove, rpc, importBatch, loading: mutating } = useGasRpc();

  const [activeTab, setActiveTab] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sopModal, setSopModal] = useState({ isOpen: false, task: null });
  const [importOpen, setImportOpen] = useState(false);
  const [clickingIds, setClickingIds] = useState(new Set());

  const clientMap = useMemo(() => {
    const map = new Map();
    clients.forEach(c => map.set(String(c.clientId).trim(), c));
    return map;
  }, [clients]);

  useEffect(() => {
    if (form.clientId) {
      const client = clientMap.get(String(form.clientId).trim());
      if (client) {
        setForm(prev => ({
          ...prev,
          companyName: client.companyName || '',
          handler: prev.handler || client.handler || ''
        }));
      }
    }
  }, [form.clientId, clientMap]);

  const filtered = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = formatDate(now, 'yyyy/MM/dd');
    const todayMidnight = new Date().setHours(0,0,0,0);

    const checkIsReviewing = (t) => {
      if (t.status === TASK_STATUS.REVIEWING) return true;
      if (t.status === '已完成') {
        if (!t.completedDate) return false;
        const compDate = new Date(t.completedDate);
        if (isNaN(compDate.getTime())) return false;

        // 轉成日期字串比較 (避免時間干擾)
        const compDateStr = compDate.getFullYear() + '/' + (compDate.getMonth() + 1).toString().padStart(2, '0') + '/' + compDate.getDate().toString().padStart(2, '0');
        
        if (compDateStr < todayStr) return true;
        if (compDateStr === todayStr && currentHour >= 22) return true;
      }
      return false;
    };

    const checkIsDelayed = (t) => {
      const status = t.status || '';
      const hasFinished = t.completedDate || ['已完成', '待審核', '已審核'].includes(status);
      const isOverdue = t.dueDate && new Date(t.dueDate) < todayMidnight;
      return !hasFinished && (status === '延遲中' || isOverdue);
    };

    const filteredData = tasks.filter((t) => {
      const isReviewing = checkIsReviewing(t);
      const isDelayed = checkIsDelayed(t);
      const hasFinished = t.completedDate || ['已完成', '待審核', '已審核'].includes(t.status || '');

      if (activeTab === 'all') return t.status !== '已審核';
      if (activeTab === TASK_STATUS.REVIEWING) return isReviewing;
      if (activeTab === '已完成') return t.status === '已完成' && !isReviewing;
      if (activeTab === '延遲中') return isDelayed;
      if (activeTab === '待處理') return !hasFinished && !isDelayed && !isReviewing;
      return t.status === activeTab;
    });

    return { filteredTasks: filteredData, checkIsReviewing, checkIsDelayed };
  }, [tasks, activeTab]);

  const { filteredTasks, checkIsReviewing, checkIsDelayed } = filtered;

  const tabsWithCounts = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = formatDate(now, 'yyyy/MM/dd');
    const todayMidnight = new Date().setHours(0,0,0,0);

    const checkIsReviewing = (t) => {
      if (t.status === TASK_STATUS.REVIEWING) return true;
      if (t.status === '已完成') {
        const compDate = t.completedDate ? formatDate(t.completedDate, 'yyyy/MM/dd') : '';
        if (compDate && compDate < todayStr) return true;
        if (compDate === todayStr && currentHour >= 22) return true;
      }
      return false;
    };

    return statusTabs.map((tab) => ({
      ...tab,
      count: tab.key === 'all' ? tasks.length : tasks.filter((t) => {
        const status = t.status || '';
        const isReviewing = checkIsReviewing(t);
        const hasFinished = t.completedDate || ['已完成', '待審核', '已審核'].includes(status);
        const isOverdue = t.dueDate && new Date(t.dueDate) < todayMidnight;

        if (tab.key === TASK_STATUS.REVIEWING) return isReviewing;
        if (tab.key === '已完成') return status === '已完成' && !isReviewing;
        if (tab.key === '延遲中') return !hasFinished && (status === '延遲中' || isOverdue);
        if (tab.key === '待處理') return !hasFinished && !isOverdue;
        return status === tab.key;
      }).length,
    }));
  }, [tasks]);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setForm({ 
      ...task, 
      dueDate: inputFormatDate(task.dueDate),
      completedDate: inputFormatDate(task.completedDate)
    });
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    let updates = { [field]: value };
    if (field === 'status' && (value === '已完成' || value === '待審核')) {
      if (!form.completedDate) updates.completedDate = new Date().toISOString().split('T')[0];
    }
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!form.taskItem || !form.clientId) return toast.error('請填寫必填欄位');
    const result = await (editingTask ? update(SHEET_NAMES.TASKS, editingTask.rowIndex, form) : add(SHEET_NAMES.TASKS, form));
    if (result.success) {
      toast.success('存檔成功');
      setModalOpen(false);
      refetch();
    }
  };

  const handleToggleStatus = async (task, targetStatus) => {
    setClickingIds(prev => new Set(prev).add(task.taskId));
    const action = targetStatus === '已完成' ? 'completeTask' : 'reviewTask';
    const params = action === 'completeTask' ? { taskId: task.taskId } : { taskId: task.taskId, reviewedBy: user.employeeName };

    const result = await rpc(action, params);
    if (result.success) {
      toast.success('狀態更新成功');
      setTimeout(() => {
        setClickingIds(prev => {
          const next = new Set(prev);
          next.delete(task.taskId);
          return next;
        });
        refetch();
      }, 500);
    } else {
      setClickingIds(prev => {
        const next = new Set(prev);
        next.delete(task.taskId);
        return next;
      });
    }
  };

  const handleToggleSopStep = async (task, stepIndex) => {
    const steps = (task.sopSteps || '').split(',').map(s => s.trim());
    const currentSteps = steps.map((s, idx) => {
      if (idx === stepIndex) {
        return s.includes('[done]') ? s.replace('[done]', '') : `${s}[done]`;
      }
      return s;
    });

    const newSopSteps = currentSteps.join(', ');
    const doneCount = currentSteps.filter(s => s.includes('[done]')).length;
    const isAllDone = doneCount === currentSteps.length;

    const result = await update(SHEET_NAMES.TASKS, task.rowIndex, {
      ...task,
      sopSteps: newSopSteps
    });

    if (result.success) {
      if (isAllDone) toast.success('所有 SOP 步驟已完成！');
      refetch();
      setSopModal(prev => ({ ...prev, task: { ...task, sopSteps: newSopSteps } }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await remove(SHEET_NAMES.TASKS, deleteTarget.rowIndex);
    if (result.success) {
      toast.success('刪除成功');
      setDeleteTarget(null);
      refetch();
    }
  };

  const columns = [
    {
      key: 'taskItem',
      label: '任務項目',
      minWidth: '150px',
      render: (v, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: 600 }}>{v}</span>
          {row.sopSteps && (
            <div 
              className="sop-progress-mini" 
              onClick={(e) => { e.stopPropagation(); setSopModal({ isOpen: true, task: row }); }}
            >
              <div className="sop-progress-bar">
                <div 
                  className="sop-progress-fill" 
                  style={{ width: `${(row.sopSteps.split(',').filter(s => s.includes('[done]')).length / row.sopSteps.split(',').length) * 100}%` }} 
                />
              </div>
              <span className="sop-progress-text">
                SOP: {row.sopSteps.split(',').filter(s => s.includes('[done]')).length}/{row.sopSteps.split(',').length}
              </span>
            </div>
          )}
        </div>
      )
    },
    { key: 'clientId', label: '客戶編號', width: '80px' },
    { key: 'companyName', label: '公司行號', minWidth: '140px' },
    { key: 'handler', label: '承辦', width: '80px' },
    { key: 'dueDate', label: '預計完成', width: '100px', render: (v) => formatDate(v) },
    { key: 'completedDate', label: '實際完成', width: '100px', render: (v) => formatDate(v) },
    { key: 'reviewDate', label: '審核時間', width: '100px', render: (v) => formatDate(v) },
    {
      key: 'complete',
      label: '完成',
      width: '50px',
      align: 'center',
      render: (_, row) => {
        const isActuallyDone = row.completedDate || ['已完成', '待審核', '已審核'].includes(row.status);
        const isClicking = clickingIds.has(row.taskId);
        return (
          <TofuCheckbox 
            checked={isActuallyDone || isClicking} 
            onChange={() => !isActuallyDone && !isClicking && handleToggleStatus(row, '已完成')}
            disabled={isActuallyDone || isClicking}
          />
        );
      },
    },
    {
      key: 'review',
      label: '審核',
      width: '50px',
      align: 'center',
      render: (_, row) => {
        const isReviewDone = row.status === '已審核';
        const canReview = isAdmin && (row.status === '已完成' || row.status === '待審核');
        const isClicking = clickingIds.has(row.taskId);
        return (
          <TofuCheckbox 
            checked={isReviewDone || isClicking} 
            onChange={() => canReview && !isClicking && handleToggleStatus(row, '已審核')}
            disabled={!canReview || isReviewDone || isClicking}
          />
        );
      },
    },
    {
      key: 'status',
      label: '狀態',
      width: '90px',
      render: (v, row) => {
        const isReviewing = checkIsReviewing(row);
        const isDelayed = checkIsDelayed(row);
        let displayStatus = v;
        if (isReviewing) displayStatus = '待審核';
        else if (isDelayed) displayStatus = '延遲中';

        return (
          <div className={isDelayed ? 'delayed-highlight' : ''}>
            <TofuBadge color={TASK_STATUS_COLORS[displayStatus] || 'yellow'}>
              {displayStatus}
            </TofuBadge>
          </div>
        );
      },
    },
  ];

  const taskItemOptions = taskItems.map((t) => t.taskItem || t.itemName || t['項目名稱'] || '');
  const handlerOptions = employees.map((e) => ({ value: e.employeeName, label: e.employeeName }));

  return (
    <div className="task-mgmt">
      <div className="task-mgmt__toolbar">
        <TofuButton onClick={handleOpenCreate} icon="➕">新增任務</TofuButton>
        <TofuButton variant="secondary" onClick={() => setImportOpen(true)} icon="📥">Excel 匯入</TofuButton>
      </div>

      <TofuTabs tabs={tabsWithCounts} activeTab={activeTab} onChange={setActiveTab} />

      <TofuTable columns={columns} data={filteredTasks} loading={loading}
        actions={(row) => (
          <>
            <TofuButton size="sm" variant="ghost" onClick={() => handleOpenEdit(row)}>編輯</TofuButton>
            <TofuButton size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>刪除</TofuButton>
          </>
        )}
      />

      <TofuModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTask ? '編輯任務' : '新增任務'} onConfirm={handleSave} loading={mutating} size="lg">
        <div className="modal-form-grid">
          <TofuSelect label="任務項目" value={form.taskItem} onChange={(v) => handleFormChange('taskItem', v)} options={taskItemOptions} required />
          <TofuInput label="客戶編號" value={form.clientId} onChange={(v) => handleFormChange('clientId', v)} placeholder="輸入編號自動帶入" required />
          <TofuInput label="公司行號名稱" value={form.companyName} readOnly placeholder="自動匹配中..." />
          <TofuSelect label="承辦" value={form.handler} onChange={(v) => handleFormChange('handler', v)} options={handlerOptions} />
          <TofuInput label="預計完成日" value={form.dueDate} onChange={(v) => handleFormChange('dueDate', v)} type="date" />
          <TofuInput label="實際完成日" value={form.completedDate} onChange={(v) => handleFormChange('completedDate', v)} type="date" />
          <TofuSelect label="狀態" value={form.status} onChange={(v) => handleFormChange('status', v)} options={Object.values(TASK_STATUS)} />
          <div className="full-width">
            <TofuInput label="備註" value={form.note} onChange={(v) => handleFormChange('note', v)} type="textarea" />
          </div>
        </div>
      </TofuModal>

      <TofuModal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Excel 批次匯入任務" hideFooter size="md">
        <ExcelImport onImport={(d) => importBatch(SHEET_NAMES.TASKS, d).then(() => { setImportOpen(false); refetch(); })} loading={mutating} />
      </TofuModal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="刪除任務" message="確定要刪除嗎？" loading={mutating} />

      {/* SOP 勾選清單彈窗 */}
      <TofuModal 
        isOpen={sopModal.isOpen} 
        onClose={() => setSopModal({ isOpen: false, task: null })} 
        title={`SOP 進度：${sopModal.task?.taskItem}`}
        hideFooter
      >
        <div className="sop-tracker">
          {sopModal.task?.sopSteps?.split(',').map((step, i) => {
            const isDone = step.includes('[done]');
            const cleanStep = step.replace('[done]', '').trim();
            return (
              <div key={i} className={`sop-tracker-item ${isDone ? 'done' : ''}`} onClick={() => handleToggleSopStep(sopModal.task, i)}>
                <div className="sop-tracker-check">
                  {isDone ? '✅' : '⭕'}
                </div>
                <div className="sop-tracker-content">
                  <span className="sop-tracker-label">{cleanStep}</span>
                </div>
              </div>
            );
          })}
        </div>
      </TofuModal>
    </div>
  );
}
