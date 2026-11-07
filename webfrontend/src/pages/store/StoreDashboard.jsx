import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import storeService from '../../services/storeService';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  SlidersHorizontal,
  History,
  AlertTriangle,
  Warehouse as WarehouseIcon,
  RefreshCw,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Layers,
  CheckCircle2
} from 'lucide-react';

export default function StoreDashboard() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dashboard Data State
  const [items, setItems] = useState([]);
  const [balances, setBalances] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [pendingGRVs, setPendingGRVs] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingAdjustments, setPendingAdjustments] = useState([]);
  const [inTransitTransfers, setInTransitTransfers] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [
        itemsRes,
        balancesRes,
        warehousesRes,
        grvsRes,
        requestsRes,
        adjRes,
        transfersRes,
        movementsRes
      ] = await Promise.allSettled([
        storeService.getItems({ limit: 150 }),
        storeService.getStockBalances({ limit: 300 }),
        storeService.getWarehouses({ limit: 50 }),
        storeService.getGoodsReceipts({ status: 'pending inspection', limit: 10 }),
        storeService.getStockRequests({ status: 'pending', limit: 10 }),
        storeService.getStockAdjustments({ status: 'pending', limit: 10 }),
        storeService.getStockTransfers({ status: 'in transit', limit: 10 }),
        storeService.getStockMovements({ limit: 10 })
      ]);

      if (itemsRes.status === 'fulfilled' && itemsRes.value?.data) {
        setItems(Array.isArray(itemsRes.value.data) ? itemsRes.value.data : []);
      }
      if (balancesRes.status === 'fulfilled' && balancesRes.value?.data) {
        setBalances(Array.isArray(balancesRes.value.data) ? balancesRes.value.data : []);
      }
      if (warehousesRes.status === 'fulfilled' && warehousesRes.value?.data) {
        setWarehouses(Array.isArray(warehousesRes.value.data) ? warehousesRes.value.data : []);
      }
      if (grvsRes.status === 'fulfilled' && grvsRes.value?.data) {
        setPendingGRVs(Array.isArray(grvsRes.value.data) ? grvsRes.value.data : []);
      }
      if (requestsRes.status === 'fulfilled' && requestsRes.value?.data) {
        setPendingRequests(Array.isArray(requestsRes.value.data) ? requestsRes.value.data : []);
      }
      if (adjRes.status === 'fulfilled' && adjRes.value?.data) {
        setPendingAdjustments(Array.isArray(adjRes.value.data) ? adjRes.value.data : []);
      }
      if (transfersRes.status === 'fulfilled' && transfersRes.value?.data) {
        setInTransitTransfers(Array.isArray(transfersRes.value.data) ? transfersRes.value.data : []);
      }
      if (movementsRes.status === 'fulfilled' && movementsRes.value?.data) {
        setRecentMovements(Array.isArray(movementsRes.value.data) ? movementsRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load store dashboard data:', err);
      setError(err.message || 'Failed to load store overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute total valuation across stock balances
  const totalValuation = balances.reduce((sum, b) => {
    const unitCost = b.item?.unitCost || 0;
    const qty = b.quantityOnHand || 0;
    return sum + (qty * unitCost);
  }, 0);

  // Compute Low stock items
  const lowStockBalances = balances.filter((b) => {
    const minLevel = b.minimumStockLevel || b.item?.minimumStockLevel || 0;
    return (b.quantityOnHand || 0) <= minLevel;
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {t('store.dashboardTitle')}
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300">
              Storekeeper
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('store.dashboardSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title={t('actions.refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('actions.refresh')}</span>
          </button>

          <Link
            to="/store/inward"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>{t('store.createGRV')}</span>
          </Link>

          <Link
            to="/store/outward"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition flex items-center gap-1.5"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>{t('store.issueItems')}</span>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="font-bold underline ml-2">{t('retry')}</button>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title={t('store.totalValuation')}
          value={formatCurrency(totalValuation)}
          subtitle={`${balances.length} ${t('warehouses')}`}
          icon={Boxes}
          tag="ETB"
        />
        <StatCard
          title={t('store.totalItems')}
          value={items.length}
          subtitle={`${warehouses.length} ${t('warehouses')}`}
          icon={Layers}
        />
        <StatCard
          title={t('store.lowStockAlerts')}
          value={lowStockBalances.length}
          subtitle={t('items require reorder attention')}
          icon={AlertTriangle}
          tag={lowStockBalances.length > 0 ? 'CRITICAL' : 'OPTIMAL'}
        />
        <StatCard
          title={t('store.pendingReceipts')}
          value={pendingGRVs.length}
          subtitle={`${pendingRequests.length} ${t('store.pendingIssues')}`}
          icon={ArrowDownToLine}
        />
      </div>

      {/* Secondary Status Badges Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to="/store/outward"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-500/50 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <ArrowUpFromLine className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {pendingRequests.length} {t('store.pendingIssues')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('awaiting storekeeper release')}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/store/transfers"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-500/50 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {inTransitTransfers.length} {t('transfers in-transit')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('moving between warehouses')}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/store/adjustments"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-500/50 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {pendingAdjustments.length} {t('store.pendingAdjustments')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('physical count discrepancies')}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      {/* Critical Stock Alert Banner (If Any Low Stock Exists) */}
      {lowStockBalances.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                {lowStockBalances.length} {t('items require reorder attention')}
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {t('current quantities on hand have dropped below the configured safety threshold. inspect catalog and raise purchase requests.')}
              </p>
            </div>
          </div>
          <Link
            to="/store/inventory?filter=low"
            className="px-3 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold shrink-0 self-start sm:self-auto transition"
          >
            {t('review low stock')}
          </Link>
        </div>
      )}

      {/* Main Content Grid: Low Stock Watchlist & Recent Movement Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Low Stock Items Watchlist */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {t('low stock & reorder watchlist')}
              </h3>
            </div>
            <Link
              to="/store/inventory"
              className="text-xs font-semibold text-primary-500 hover:underline flex items-center gap-1"
            >
              <span>{t('view all')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto">
            {lowStockBalances.length === 0 ? (
              <EmptyState
                title={t('all stock levels optimal')}
                description={t('no items are currently below minimum safety thresholds.')}
                icon={CheckCircle2}
              />
            ) : (
              <>
                {/* Mobile View: Card Stack */}
                <div className="block md:hidden space-y-2.5">
                  {lowStockBalances.slice(0, 6).map((b) => (
                    <div
                      key={b._id}
                      className="p-3 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {b.item?.itemName || 'Unknown Item'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {b.item?.itemCode} • {b.warehouse?.warehouseName}
                          </div>
                        </div>
                        <Badge status="low_stock" text={t('low stock')} size="xs" />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <div>
                          <span className="text-slate-400">{t('on hand:')}</span>{' '}
                          <span className="font-bold text-rose-600 dark:text-rose-400">{b.quantityOnHand}</span> {b.item?.unitOfMeasurement}
                        </div>
                        <div>
                          <span className="text-slate-400">{t('min level:')}</span>{' '}
                          <span>{b.minimumStockLevel || b.item?.minimumStockLevel || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Clean Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3 py-2.5">{t('item')}</th>
                        <th className="px-3 py-2.5">{t('warehouse')}</th>
                        <th className="px-3 py-2.5 text-center">{t('on hand')}</th>
                        <th className="px-3 py-2.5 text-center">{t('min level')}</th>
                        <th className="px-3 py-2.5 text-right">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {lowStockBalances.slice(0, 6).map((b) => (
                        <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {b.item?.itemName}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {b.item?.itemCode}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                            {b.warehouse?.warehouseName || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-rose-600 dark:text-rose-400">
                            {b.quantityOnHand} {b.item?.unitOfMeasurement}
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-500">
                            {b.minimumStockLevel || b.item?.minimumStockLevel || 0}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Badge status="low_stock" text="Critical" size="xs" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Recent Stock Movements Audit Feed */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {t('store.recentMovements')}
              </h3>
            </div>
            <Link
              to="/store/movements"
              className="text-xs font-semibold text-primary-500 hover:underline flex items-center gap-1"
            >
              <span>{t('audit ledger')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {recentMovements.length === 0 ? (
              <EmptyState
                title={t('no movements recorded')}
                description={t('inventory movements will automatically appear here as grvs, issues, and transfers occur.')}
                icon={History}
              />
            ) : (
              recentMovements.map((mov) => {
                const isInward = ['purchase receipt', 'stock transfer in', 'adjustment'].includes(mov.movementType);
                return (
                  <div
                    key={mov._id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isInward
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                        }`}
                      >
                        {isInward ? (
                          <ArrowDownToLine className="w-4 h-4" />
                        ) : (
                          <ArrowUpFromLine className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {mov.item?.itemName || 'Item'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="uppercase font-semibold text-primary-500">
                            {t(mov.movementType)}
                          </span>
                          <span>•</span>
                          <span>{mov.warehouse?.warehouseName}</span>
                          <span>•</span>
                          <span>{formatDate(mov.movementDate || mov.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-black ${
                          isInward ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {isInward ? `+${mov.quantity}` : `-${mov.quantity}`} {mov.item?.unitOfMeasurement || ''}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {mov.movementNumber}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Warehouses Snapshot Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-4">
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-primary-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {t('warehouses & storage facilities')}
            </h3>
          </div>
          <Link
            to="/store/warehouses"
            className="text-xs font-semibold text-primary-500 hover:underline flex items-center gap-1"
          >
            <span>{t('manage warehouses')}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {warehouses.map((wh) => {
            const whBalances = balances.filter(
              (b) => b.warehouse?._id === wh._id || b.warehouse === wh._id
            );
            const totalUnits = whBalances.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);

            return (
              <div
                key={wh._id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 hover:border-primary-500/50 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        {wh.warehouseName}
                      </h4>
                      <div className="text-[10px] font-mono text-slate-400">
                        {wh.warehouseCode} {wh.branch ? `• ${wh.branch}` : ''}
                      </div>
                    </div>
                    <Badge status={wh.status || 'active'} size="xs" />
                  </div>

                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div><span className="text-slate-400">{t('location:')}</span> {wh.location || '-'}</div>
                    <div><span className="text-slate-400">{t('manager:')}</span> {wh.manager?.fullName || wh.contactPerson || '-'}</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">{t('items stored:')}</span>{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{whBalances.length}</span>
                  </div>
                  <div className="font-bold text-primary-600 dark:text-primary-400">
                    {totalUnits.toLocaleString()} {t('units')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
