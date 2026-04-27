import { useState, useMemo } from 'react';
import { useGasQuery } from '../hooks/useGasQuery';
import { useGasRpc } from '../hooks/useGasRpc';
import { useToast } from '../components/UI/TofuToast';
import { SHEET_NAMES } from '../utils/constants';
import TofuCard from '../components/UI/TofuCard';
import TofuButton from '../components/UI/TofuButton';
import TofuSelect from '../components/UI/TofuSelect';
import TofuBadge from '../components/UI/TofuBadge';
import TofuAvatar from '../components/UI/TofuAvatar';
import TofuModal from '../components/UI/TofuModal';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import './ClientAllocation.css';

export default function ClientAllocation() {
  const toast = useToast();
  const { data: clients = [], loading, refetch } = useGasQuery(SHEET_NAMES.CLIENTS);
  const { data: employees = [] } = useGasQuery(SHEET_NAMES.GROUPS);
  const { update, loading: mutating } = useGasRpc();

  const [assignModal, setAssignModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedHandler, setSelectedHandler] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // 1. 待分配
  const unassignedClients = useMemo(() =>
    (clients || []).filter((c) => !c.handler || String(c.handler).trim() === '')
    .sort((a, b) => String(a.clientId).localeCompare(String(b.clientId), undefined, { numeric: true })),
    [clients]
  );

  // 2. 已分配：按承辦人員分組顯示
  const handlerGroups = useMemo(() => {
    const groups = {};
    (employees || []).forEach((emp) => {
      if (emp && emp.employeeName) {
        groups[emp.employeeName.trim()] = { 
          '營業中': [], '停業': [], '歇業': [], '轉出': [], '其他': []
        };
      }
    });
    
    (clients || []).forEach((c) => {
      const handlerName = (c.handler || '').trim();
      if (handlerName && groups[handlerName]) {
        const status = (c.status || '').trim();
        const groupKey = ['營業中', '停業', '歇業', '轉出'].includes(status) ? status : '其他';
        groups[handlerName][groupKey].push(c);
        groups[handlerName][groupKey].sort((a, b) => String(a.clientId).localeCompare(String(b.clientId), undefined, { numeric: true }));
      }
    });
    return groups;
  }, [clients, employees]);

  const handleAssign = async () => {
    if (!selectedClient || !selectedHandler) return toast.error('請選擇承辦人');
    const result = await update(SHEET_NAMES.CLIENTS, selectedClient.rowIndex, {
      ...selectedClient,
      handler: selectedHandler
    });
    if (result.success) {
      toast.success('分配成功');
      setAssignModal(false);
      setSelectedClient(null);
      setSelectedHandler('');
      refetch();
    }
  };

  const handleRemoveAlloc = async () => {
    if (!deleteTarget) return;
    const result = await update(SHEET_NAMES.CLIENTS, deleteTarget.rowIndex, {
      ...deleteTarget,
      handler: ''
    });
    if (result.success) {
      toast.success('已移除分配');
      setDeleteTarget(null);
      refetch();
    }
  };

  const handlerOptions = (employees || []).map((e) => ({ value: e.employeeName, label: e.employeeName }));

  return (
    <div className="alloc-page">
      <div className="alloc-layout">
        <TofuCard className="alloc-unassigned" hoverable={false}>
          <h3 className="alloc-section-title">
            📋 待分配客戶
            <TofuBadge color="yellow" size="sm">{unassignedClients?.length || 0}</TofuBadge>
          </h3>
          <div className="alloc-list">
            {unassignedClients.length === 0 ? (
              <p className="alloc-empty">所有客戶都已分配完畢 ✨</p>
            ) : (
              unassignedClients.map((client) => (
                <div key={client.clientId} className="alloc-client-item">
                  <div className="alloc-client-info">
                    <span className="alloc-client-id">[{client.clientId}]</span>
                    <span className="alloc-client-name">{client.companyName}</span>
                  </div>
                  <TofuButton size="sm" onClick={() => { setSelectedClient(client); setSelectedHandler(''); setAssignModal(true); }}>分配</TofuButton>
                </div>
              ))
            )}
          </div>
        </TofuCard>

        <div className="alloc-handlers">
          <h3 className="alloc-section-title">👥 團隊案件分配</h3>
          <div className="alloc-handler-grid">
            {Object.entries(handlerGroups).map(([name, group]) => (
              <TofuCard key={name} className="alloc-handler-card">
                <div className="alloc-handler-header">
                  <TofuAvatar seed={name} size={32} />
                  <div>
                    <span className="alloc-handler-name">{name}</span>
                    <span className="alloc-handler-count">
                      {Object.values(group || {}).reduce((sum, list) => sum + (list?.length || 0), 0)} 件
                    </span>
                  </div>
                </div>
                <div className="alloc-handler-clients">
                  {Object.entries(group || {}).map(([status, groupClients]) => (
                    (groupClients?.length || 0) > 0 && (
                      <div key={status} className="alloc-status-group">
                        <div className="alloc-status-label">{status}</div>
                        {groupClients.map((c) => (
                          <div key={c.clientId} className="alloc-handler-client-row">
                            <div className="alloc-handler-client-info">
                              <span className="alloc-client-id">[{c.clientId}]</span>
                              <span>{c.companyName}</span>
                            </div>
                            <div className="alloc-client-actions">
                              <TofuButton size="xs" variant="ghost" onClick={() => { setSelectedClient(c); setSelectedHandler(c.handler); setAssignModal(true); }}>更改</TofuButton>
                              <TofuButton size="xs" variant="danger" onClick={() => setDeleteTarget(c)}>移除</TofuButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              </TofuCard>
            ))}
          </div>
        </div>
      </div>

      <TofuModal isOpen={assignModal} onClose={() => setAssignModal(false)} title="分配案件" onConfirm={handleAssign} loading={mutating}>
        <div className="modal-form-inline">
          <p>客戶：<strong>{selectedClient?.companyName}</strong></p>
          <TofuSelect label="選擇承辦人員" value={selectedHandler} onChange={setSelectedHandler} options={handlerOptions} />
        </div>
      </TofuModal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleRemoveAlloc} title="移除分配" message={`確定要移除「${deleteTarget?.companyName}」的分配嗎？`} loading={mutating} />
    </div>
  );
}
