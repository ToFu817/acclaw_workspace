import { useState, useMemo } from 'react';
import { useGasQuery } from '../hooks/useGasQuery';
import { useGasRpc } from '../hooks/useGasRpc';
import { useToast } from '../components/UI/TofuToast';
import { SHEET_NAMES, CLIENT_STATUS, CLIENT_STATUS_COLORS } from '../utils/constants';
import TofuTable from '../components/UI/TofuTable';
import TofuBadge from '../components/UI/TofuBadge';
import TofuButton from '../components/UI/TofuButton';
import TofuModal from '../components/UI/TofuModal';
import TofuInput from '../components/UI/TofuInput';
import TofuSelect from '../components/UI/TofuSelect';
import ExcelImport from '../components/UI/ExcelImport';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import './ClientData.css';

const emptyForm = () => ({
  clientId: '', orgType: '', companyName: '', handler: '', status: CLIENT_STATUS.ACTIVE,
  yearNote: '', taxId: '', taxRegId: '', zipCode: '', contactAddress: '',
  regAddress: '', owner: '', contactPerson: '', mailPhone: '', deliveryMethod: '',
  pickupMethod: '', companyPhone: '', contactMobile: '', email: '', taxExt: '',
  note: '', taxPassword: '', healthInsCode: '',
});

export default function ClientData() {
  const toast = useToast();
  const { data: clients = [], loading, refetch } = useGasQuery(SHEET_NAMES.CLIENTS);
  const { add, update, remove, importBatch, loading: mutating } = useGasRpc();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  
  // 詳情抽屜控制
  const [drawerClient, setDrawerClient] = useState(null);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const handleOpenEdit = (client, e) => {
    e?.stopPropagation(); // 防止觸發抽屜
    setEditingClient(client);
    setForm({ ...client });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.clientId || !form.companyName) return toast.error('請填寫必填欄位');
    const result = await (editingClient ? update(SHEET_NAMES.CLIENTS, editingClient.rowIndex, form) : add(SHEET_NAMES.CLIENTS, form));
    if (result.success) {
      toast.success('存檔成功');
      setModalOpen(false);
      refetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await remove(SHEET_NAMES.CLIENTS, deleteTarget.rowIndex);
    if (result.success) {
      toast.success('刪除成功');
      setDeleteTarget(null);
      setDrawerClient(null);
      refetch();
    }
  };

  const columns = [
    { key: 'clientId', label: '客戶編號', minWidth: '100px', fixed: 'left' },
    { key: 'companyName', label: '公司行號名稱', minWidth: '200px', fixed: 'left' },
    { key: 'orgType', label: '組織型態', minWidth: '100px' },
    { key: 'handler', label: '承辦', minWidth: '90px' },
    {
      key: 'status', label: '目前狀態', minWidth: '100px',
      render: (v) => <TofuBadge color={CLIENT_STATUS_COLORS[v] || 'gray'}>{v}</TofuBadge>,
    },
    { key: 'yearNote', label: '年度註記', minWidth: '100px' },
    { key: 'taxId', label: '統一編號', minWidth: '120px' },
    { key: 'taxRegId', label: '稅藉編號', minWidth: '120px' },
    { key: 'zipCode', label: '郵遞區號', minWidth: '90px' },
    { key: 'contactAddress', label: '聯絡地址', minWidth: '250px' },
    { key: 'regAddress', label: '營業登記地址', minWidth: '250px' },
    { key: 'owner', label: '負責人', minWidth: '90px' },
    { key: 'contactPerson', label: '聯絡人', minWidth: '90px' },
    { key: 'mailPhone', label: '郵寄電話', minWidth: '130px' },
    { key: 'deliveryMethod', label: '送件方式', minWidth: '100px' },
    { key: 'pickupMethod', label: '取件方式', minWidth: '100px' },
    { key: 'companyPhone', label: '公司電話', minWidth: '130px' },
    { key: 'contactMobile', label: '手機', minWidth: '130px' },
    { key: 'email', label: 'Email', minWidth: '180px' },
    { key: 'taxExt', label: '分機', minWidth: '80px' },
    { key: 'note', label: '備註', minWidth: '250px' },
    { key: 'taxPassword', label: '稅務密碼', minWidth: '120px' },
    { key: 'healthInsCode', label: '健保代號', minWidth: '120px' },
  ];

  return (
    <div className="client-data-page">
      <div className="client-data-page__toolbar">
        <TofuButton onClick={handleOpenCreate} icon="➕">新增客戶</TofuButton>
        <TofuButton variant="secondary" onClick={() => setImportOpen(true)} icon="📥">Excel 匯入</TofuButton>
      </div>

      <div className="client-data-content">
        <div className={`client-table-container ${drawerClient ? 'shrunk' : ''}`}>
          <TofuTable 
            columns={columns} 
            data={clients} 
            loading={loading} 
            onRowClick={(row) => setDrawerClient(row)}
            actions={(row) => (
              <div onClick={(e) => e.stopPropagation()}>
                <TofuButton size="xs" variant="ghost" onClick={(e) => handleOpenEdit(row, e)}>編輯</TofuButton>
              </div>
            )}
          />
        </div>

        {/* 詳情抽屜 (全貌模式) */}
        {drawerClient && (
          <div className="client-drawer">
            <div className="drawer-header">
              <h3>客戶資料全貌</h3>
              <button className="drawer-close" onClick={() => setDrawerClient(null)}>&times;</button>
            </div>
            <div className="drawer-body">
              <div className="detail-section">
                <h4>基本資訊</h4>
                <DetailItem label="客戶編號" value={drawerClient.clientId} />
                <DetailItem label="公司名稱" value={drawerClient.companyName} bold />
                <DetailItem label="統一編號" value={drawerClient.taxId} />
                <DetailItem label="負責人" value={drawerClient.owner} />
                <DetailItem label="承辦人員" value={drawerClient.handler} />
                <DetailItem label="目前狀態" value={<TofuBadge color={CLIENT_STATUS_COLORS[drawerClient.status]}>{drawerClient.status}</TofuBadge>} />
              </div>
              <div className="detail-section">
                <h4>通訊資訊</h4>
                <DetailItem label="聯絡地址" value={drawerClient.contactAddress} />
                <DetailItem label="執照地址" value={drawerClient.regAddress} />
                <DetailItem label="聯絡人" value={drawerClient.contactPerson} />
                <DetailItem label="公司電話" value={drawerClient.companyPhone} />
                <DetailItem label="手機" value={drawerClient.contactMobile} />
                <DetailItem label="Email" value={drawerClient.email} />
              </div>
              <div className="detail-section">
                <h4>密碼與代號</h4>
                <DetailItem label="稅務密碼" value={drawerClient.taxPassword} secret />
                <DetailItem label="健保代碼" value={drawerClient.healthInsCode} />
              </div>
              <div className="detail-section">
                <h4>備註備忘</h4>
                <p className="detail-note">{drawerClient.note || '無備註'}</p>
              </div>
              <div className="drawer-footer">
                <TofuButton size="sm" variant="danger" onClick={() => setDeleteTarget(drawerClient)}>刪除客戶</TofuButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 編輯選單 */}
      <TofuModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingClient ? '編輯客戶資料' : '新增客戶資料'} onConfirm={handleSave} loading={mutating} size="xl">
        <div className="modal-form-grid">
          <TofuInput label="客戶編號" value={form.clientId} onChange={(v) => setForm({...form, clientId: v})} required />
          <TofuInput label="公司名稱" value={form.companyName} onChange={(v) => setForm({...form, companyName: v})} required />
          <TofuInput label="統一編號" value={form.taxId} onChange={(v) => setForm({...form, taxId: v})} />
          <TofuSelect label="狀態" value={form.status} onChange={(v) => setForm({...form, status: v})} options={Object.values(CLIENT_STATUS)} />
          <TofuInput label="負責人" value={form.owner} onChange={(v) => setForm({...form, owner: v})} />
          <TofuInput label="電話" value={form.companyPhone} onChange={(v) => setForm({...form, companyPhone: v})} />
          <TofuInput label="聯絡地址" value={form.contactAddress} onChange={(v) => setForm({...form, contactAddress: v})} />
          <TofuInput label="Email" value={form.email} onChange={(v) => setForm({...form, email: v})} />
          <TofuInput label="稅務密碼" value={form.taxPassword} onChange={(v) => setForm({...form, taxPassword: v})} />
          <div className="full-width">
             <TofuInput label="備註" type="textarea" value={form.note} onChange={(v) => setForm({...form, note: v})} />
          </div>
        </div>
      </TofuModal>

      <TofuModal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Excel 匯入客戶資料" hideFooter>
        <ExcelImport onImport={(d) => importBatch(SHEET_NAMES.CLIENTS, d).then(() => { setImportOpen(false); refetch(); })} loading={mutating} />
      </TofuModal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="刪除客戶" message="確定要永久刪除此客戶嗎？" loading={mutating} />
    </div>
  );
}

function DetailItem({ label, value, bold, secret }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}：</span>
      <span className={`detail-value ${bold ? 'font-bold' : ''} ${secret ? 'font-mono bg-light' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
