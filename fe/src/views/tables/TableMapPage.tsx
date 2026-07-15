import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTableAreas, getTables, type ResmanagerTable } from '../../services/tableService';
import AreaSelector from '../../components/tables/AreaSelector';
import TableMap from '../../components/tables/TableMap';
import StatusLegend from '../../components/tables/StatusLegend';
import TableDetailModal from '../../components/tables/TableDetailModal';
import { OpenTableModal, OpenTableFormData } from '../../components/tables/OpenTableModal';
import { Table, TableArea } from '../../interfaces/table.interface';
import { RefreshCw } from 'lucide-react';

const TableMapPage: React.FC = () => {
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isOpenTableModalOpen, setIsOpenTableModalOpen] = useState(false);

  // For mock state updates (will be replaced by API + Socket.io later)
  const [localTableOverrides, setLocalTableOverrides] = useState<Record<string | number, Partial<Table>>>({});
  // Lấy danh sách khu vực
  const { data: areaResponse, isLoading: isLoadingAreas } = useQuery({
    queryKey: ['table-areas'],
    queryFn: getTableAreas,
  });

  // Lấy danh sách bàn theo khu vực
  const { data: tableResponse, isLoading: isLoadingTables, refetch } = useQuery({
    queryKey: ['tables', selectedAreaId],
    queryFn: () => getTables(selectedAreaId || undefined),
  });

  const areas: TableArea[] = areaResponse || [];
  const rawTables: ResmanagerTable[] = tableResponse || [];

  // Apply local overrides to tables (mock state updates)
  const tables: any[] = rawTables.map((t: ResmanagerTable) => ({
    id: t.id,
    area_id: t.area_id,
    area_name: t.area_name,
    name: t.name,
    capacity: t.capacity,
    row_pos: t.row_pos,
    col_pos: t.col_pos,
    status: t.status,
    currentOrder: null,
    ...(localTableOverrides[t.id] || {}),
  }));

  const selectedTable = useMemo(() => {
    if (selectedTableId === null) return null;
    return tables.find((t) => String(t.id) === String(selectedTableId)) || null;
  }, [tables, selectedTableId]);

  const handleTableClick = useCallback((table: Table) => {
    setSelectedTableId(table.id);
    setIsDetailModalOpen(true);
  }, []);

  const handleOpenTable = useCallback((table: Table) => {
    setSelectedTableId(table.id);
    setIsDetailModalOpen(false);
    setIsOpenTableModalOpen(true);
  }, []);

  const handleConfirmOpenTable = useCallback(
    (data: OpenTableFormData) => {
      if (!selectedTableId) return;

      // Mock: update table status locally to 'serving'
      setLocalTableOverrides((prev) => ({
        ...prev,
        [selectedTableId]: {
          status: 'serving' as const,
          currentOrder: {
            id: Math.floor(1000 + Math.random() * 9000),
            guestCount: data.guestCount,
            customerName: data.customerName || 'Khách vãng lai',
            customerPhone: data.customerPhone,
            startTime: new Date().toISOString(),
          },
        },
      }));

      console.log('[MOCK] Open table:', {
        tableId: selectedTableId,
        ...data,
      });
    },
    [selectedTableId]
  );

  const handleRefresh = useCallback(() => {
    setLocalTableOverrides({});
    setSelectedTableId(null);
    refetch();
  }, [refetch]);

  return (
    <div className="container mx-auto p-6">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-admin-text-main">Sơ đồ bàn</h1>
          <p className="text-admin-text-sub">Quản lý và theo dõi trạng thái bàn ăn real-time</p>
        </div>
        <button
          onClick={handleRefresh}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Làm mới
        </button>
      </div>

      {/* Area Filter */}
      <AreaSelector
        areas={areas}
        selectedAreaId={selectedAreaId}
        onSelectArea={setSelectedAreaId}
      />

      {/* Status Legend */}
      <div className="mb-6">
        <StatusLegend />
      </div>

      {/* Table Grid */}
      <div className="bg-white p-8 rounded-xl border border-gray-100 min-h-[500px]">
        {isLoadingAreas || isLoadingTables ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          </div>
        ) : (
          <TableMap tables={tables} onTableClick={handleTableClick} />
        )}
      </div>

      {/* Table Detail Modal */}
      <TableDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        table={selectedTable}
        onOpenTable={handleOpenTable}
        onReserve={(t) => {
          console.log('[TODO] Reserve table:', t.name);
          setIsDetailModalOpen(false);
        }}
        onViewOrder={(t) => {
          console.log('[TODO] View order for table:', t.name);
          setIsDetailModalOpen(false);
        }}
        onTransferTable={(t) => {
          console.log('[TODO] Transfer table:', t.name);
          setIsDetailModalOpen(false);
        }}
        onMergeTable={(t) => {
          console.log('[TODO] Merge table:', t.name);
          setIsDetailModalOpen(false);
        }}
        onSplitTable={(t) => {
          console.log('[TODO] Split table:', t.name);
          setIsDetailModalOpen(false);
        }}
        onViewInvoice={(t) => {
          console.log('[TODO] View invoice for table:', t.name);
          setIsDetailModalOpen(false);
        }}
        onCheckIn={(t) => {
          console.log('[TODO] Check-in table:', t.name);
          // Mock: change reserved → serving
          setLocalTableOverrides((prev) => ({
            ...prev,
            [t.id]: { status: 'serving' as const },
          }));
          setIsDetailModalOpen(false);
        }}
        onCancelReservation={(t) => {
          console.log('[TODO] Cancel reservation for table:', t.name);
          // Mock: change reserved → empty
          setLocalTableOverrides((prev) => ({
            ...prev,
            [t.id]: { status: 'empty' as const },
          }));
          setIsDetailModalOpen(false);
        }}
      />

      {/* Open Table Modal */}
      <OpenTableModal
        isOpen={isOpenTableModalOpen}
        onClose={() => setIsOpenTableModalOpen(false)}
        onConfirm={handleConfirmOpenTable}
        table={selectedTable}
      />
    </div>
  );
};

export default TableMapPage;
