import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import storeService from '../../services/storeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Boxes,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  FolderPlus,
  Warehouse as WarehouseIcon,
  Tag
} from 'lucide-react';

const ITEM_TYPES = [
  { value: 'raw material', label: 'Raw Material' },
  { value: 'finished product', label: 'Finished Product' },
  { value: 'spare part', label: 'Spare Part' },
  { value: 'office supply', label: 'Office Supply' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'fixed asset', label: 'Fixed Asset' }
];

const COMMON_UOMS = [
  'piece',
  'roll',
  'ream',
  'kg',
  'liter',
  'meter',
  'box',
  'pack',
  'sheet',
  'carton',
  'set'
];

export default function StoreInventory() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [searchParams] = useSearchParams();

  // Active sub-tab: 'items' | 'balances' | 'categories'
  const [activeTab, setActiveTab] = useState('items');

  // Master Data State
  const [items, setItems] = useState([]);
  const [balances, setBalances] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stockLevelFilter, setStockLevelFilter] = useState(
    searchParams.get('filter') === 'low' ? 'low' : 'all'
  );
  const [warehouseFilter, setWarehouseFilter] = useState('');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    categoryType: 'raw material',
    description: '',
    parentCategory: ''
  });

  // Item Form State
  const initialItemForm = {
    itemName: '',
    itemCode: '',
    category: '',
    itemType: 'raw material',
    unitOfMeasurement: 'piece',
    brand: '',
    model: '',
    specifications: '',
    minimumStockLevel: 10,
    maximumStockLevel: 500,
    reorderLevel: 25,
    unitCost: 0,
    currency: 'ETB',
    preferredSupplier: '',
    image: '',
    status: 'active'
  };
  const [itemFormData, setItemFormData] = useState(initialItemForm);

  // Fetch Master Data
  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [itemsRes, balancesRes, catRes, whRes, supRes] = await Promise.allSettled([
        storeService.getItems({ limit: 200 }),
        storeService.getStockBalances({ limit: 300 }),
        storeService.getCategories({ limit: 100 }),
        storeService.getWarehouses({ limit: 100 }),
        storeService.getSuppliers({ limit: 100 })
      ]);

      if (itemsRes.status === 'fulfilled' && itemsRes.value?.data) {
        setItems(Array.isArray(itemsRes.value.data) ? itemsRes.value.data : []);
      }
      if (balancesRes.status === 'fulfilled' && balancesRes.value?.data) {
        setBalances(Array.isArray(balancesRes.value.data) ? balancesRes.value.data : []);
      }
      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        setCategories(Array.isArray(catRes.value.data) ? catRes.value.data : []);
      }
      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : []);
      }
      if (supRes.status === 'fulfilled' && supRes.value?.data) {
        setSuppliers(Array.isArray(supRes.value.data) ? supRes.value.data : []);
      }
    } catch (err) {
      console.error('Error fetching inventory catalog:', err);
      setError(err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter Items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
      item.brand?.toLowerCase().includes(search.toLowerCase()) ||
      item.model?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !categoryFilter || (item.category?._id || item.category) === categoryFilter;
    const matchesType = !typeFilter || item.itemType === typeFilter;

    // Calculate total on hand across balances for this item
    const itemBalances = balances.filter(
      (b) => (b.item?._id || b.item) === item._id
    );
    const totalOnHand = itemBalances.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);

    let matchesStock = true;
    if (stockLevelFilter === 'low') {
      matchesStock = totalOnHand <= (item.minimumStockLevel || 0);
    } else if (stockLevelFilter === 'out') {
      matchesStock = totalOnHand === 0;
    } else if (stockLevelFilter === 'healthy') {
      matchesStock = totalOnHand > (item.minimumStockLevel || 0);
    }

    return matchesSearch && matchesCategory && matchesType && matchesStock;
  });

  // Filter Balances
  const filteredBalances = balances.filter((b) => {
    const matchesSearch =
      !search ||
      b.item?.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      b.item?.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
      b.warehouse?.warehouseName?.toLowerCase().includes(search.toLowerCase());

    const matchesWarehouse = !warehouseFilter || (b.warehouse?._id || b.warehouse) === warehouseFilter;

    let matchesStock = true;
    const minLevel = b.minimumStockLevel || b.item?.minimumStockLevel || 0;
    if (stockLevelFilter === 'low') {
      matchesStock = (b.quantityOnHand || 0) <= minLevel;
    } else if (stockLevelFilter === 'out') {
      matchesStock = (b.quantityOnHand || 0) === 0;
    }

    return matchesSearch && matchesWarehouse && matchesStock;
  });

  // Compute next GT-XXX item code from loaded items as client-side instant preview/fallback
  const getClientNextItemCode = () => {
    let maxNum = 0;
    items.forEach((it) => {
      const match = it.itemCode?.match(/^GT-(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    return `GT-${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Open Create Item Modal
  const handleOpenCreateItem = async () => {
    setEditingItem(null);
    const initialCode = getClientNextItemCode();
    setItemFormData({
      ...initialItemForm,
      itemCode: initialCode,
      category: categories[0]?._id || ''
    });
    setFormError('');
    setIsItemModalOpen(true);

    // Fetch confirmed next code from backend
    try {
      const res = await storeService.getNextItemCode();
      if (res.success && res.data?.nextCode) {
        setItemFormData((prev) => ({
          ...prev,
          itemCode: res.data.nextCode
        }));
      }
    } catch (err) {
      console.warn('Using client-calculated item code:', err);
    }
  };

  // Open Edit Item Modal
  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setItemFormData({
      itemName: item.itemName || '',
      itemCode: item.itemCode || '',
      category: item.category?._id || item.category || '',
      itemType: item.itemType || 'raw material',
      unitOfMeasurement: item.unitOfMeasurement || 'piece',
      brand: item.brand || '',
      model: item.model || '',
      specifications: item.specifications || '',
      minimumStockLevel: item.minimumStockLevel ?? 10,
      maximumStockLevel: item.maximumStockLevel ?? 500,
      reorderLevel: item.reorderLevel ?? 25,
      unitCost: item.unitCost ?? 0,
      currency: item.currency || 'ETB',
      preferredSupplier: item.preferredSupplier?._id || item.preferredSupplier || '',
      image: item.image || '',
      status: item.status || 'active'
    });
    setFormError('');
    setIsItemModalOpen(true);
  };

  // View Drilldown Details
  const handleOpenDetails = async (item) => {
    setDetailItem(item);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await storeService.getItemById(item._id);
      if (res.success && res.data) {
        setDetailItem(res.data);
      }
    } catch (err) {
      console.warn('Error fetching detailed item balances:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Save Item (Create or Update)
  const handleSubmitItem = async (e) => {
    e.preventDefault();
    if (!itemFormData.itemName.trim() || !itemFormData.category) {
      setFormError('Item name and category are required.');
      return;
    }

    const finalCode = (itemFormData.itemCode || '').trim() || getClientNextItemCode();
    const payload = {
      ...itemFormData,
      itemCode: finalCode.toUpperCase()
    };

    setSubmitting(true);
    setFormError('');
    try {
      if (editingItem) {
        const res = await storeService.updateItem(editingItem._id, payload);
        if (res.success) {
          setIsItemModalOpen(false);
          fetchAllData();
        }
      } else {
        const res = await storeService.createItem(payload);
        if (res.success) {
          setIsItemModalOpen(false);
          fetchAllData();
        }
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save inventory item');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this item?')) return;
    try {
      await storeService.deleteItem(id);
      fetchAllData();
    } catch (err) {
      alert(err.message || 'Failed to delete item');
    }
  };

  // Save Category
  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await storeService.createCategory({
        ...categoryFormData,
        parentCategory: categoryFormData.parentCategory || null
      });
      if (res.success) {
        setIsCategoryModalOpen(false);
        setCategoryFormData({
          name: '',
          categoryType: 'raw material',
          description: '',
          parentCategory: ''
        });
        fetchAllData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('nav.storeInventory')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage raw materials, papers, inks, spare parts, and multi-warehouse balances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title="Refresh inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('actions.refresh')}</span>
          </button>

          {hasRole(['admin', 'storekeeper']) && (
            <>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5 text-primary-500" />
                <span>{t('store.createCategory')}</span>
              </button>

              <button
                onClick={handleOpenCreateItem}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{t('store.createItem')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold gap-6">
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 relative flex items-center gap-2 transition ${
            activeTab === 'items'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{t('store.itemsCatalog')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {items.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-3 relative flex items-center gap-2 transition ${
            activeTab === 'balances'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <WarehouseIcon className="w-4 h-4" />
          <span>{t('store.stockBalances')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {balances.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 relative flex items-center gap-2 transition ${
            activeTab === 'categories'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>{t('store.categories')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {categories.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search...')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeTab === 'items' && (
            <>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
              >
                <option value="">{t('all')} {t('store.categories')}</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
              >
                <option value="">{t('all')} {t('type')}</option>
                {ITEM_TYPES.map((tItem) => (
                  <option key={tItem.value} value={tItem.value}>
                    {t(tItem.label)}
                  </option>
                ))}
              </select>
            </>
          )}

          {activeTab === 'balances' && (
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
            >
              <option value="">{t('all warehouses')}</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.warehouseName} ({w.warehouseCode})
                </option>
              ))}
            </select>
          )}

          <select
            value={stockLevelFilter}
            onChange={(e) => setStockLevelFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="all">{t('all')}</option>
            <option value="low">{t('low stock')}</option>
            <option value="out">{t('out of stock')}</option>
            <option value="healthy">{t('optimal')}</option>
          </select>
        </div>
      </div>

      {/* Main Tab 1: Catalog Items */}
      {activeTab === 'items' && (
        <div className="w-full">
          {filteredItems.length === 0 ? (
            <EmptyState
              title="No Inventory Items Found"
              description="No items match your filter criteria or search query."
              icon={Boxes}
              actionLabel={hasRole(['admin', 'storekeeper']) ? 'Add First Item' : undefined}
              onAction={handleOpenCreateItem}
            />
          ) : (
            <>
              {/* Mobile View: Card Deck (Strictly no tables on mobile) */}
              <div className="block md:hidden space-y-3">
                {filteredItems.map((item) => {
                  const itemBalances = balances.filter(
                    (b) => (b.item?._id || b.item) === item._id
                  );
                  const totalOnHand = itemBalances.reduce(
                    (sum, b) => sum + (b.quantityOnHand || 0),
                    0
                  );
                  const isLow = totalOnHand <= (item.minimumStockLevel || 0);

                  return (
                    <div
                      key={item._id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs hover:border-primary-500/50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {item.itemName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {item.itemCode} • {item.category?.name || 'No Category'}
                          </div>
                        </div>
                        <Badge
                          status={isLow ? 'low_stock' : item.status || 'active'}
                          text={isLow ? 'Low Stock' : item.status}
                          size="xs"
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-700/60 pt-2 text-slate-600 dark:text-slate-300">
                        <div>
                          <span className="text-slate-400">Total On Hand:</span>{' '}
                          <span className={`font-bold ${isLow ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                            {totalOnHand} {item.unitOfMeasurement}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Unit Cost:</span>{' '}
                          <span className="font-semibold">{formatCurrency(item.unitCost)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Min Safety:</span>{' '}
                          <span>{item.minimumStockLevel || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Type:</span>{' '}
                          <span className="capitalize">{item.itemType}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                        <button
                          onClick={() => handleOpenDetails(item)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs flex items-center gap-1 font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>

                        {hasRole(['admin', 'storekeeper']) && (
                          <>
                            <button
                              onClick={() => handleOpenEditItem(item)}
                              className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-xs flex items-center gap-1 font-semibold"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item._id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Structured Responsive Table */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">{t('store.itemCode')}</th>
                      <th className="px-4 py-3">{t('store.itemName')}</th>
                      <th className="px-4 py-3">{t('store.category')}</th>
                      <th className="px-4 py-3">{t('type')}</th>
                      <th className="px-4 py-3 text-center">{t('uom')}</th>
                      <th className="px-4 py-3 text-center">{t('on hand')}</th>
                      <th className="px-4 py-3 text-center">{t('min level')}</th>
                      <th className="px-4 py-3 text-right">{t('unit cost')}</th>
                      <th className="px-4 py-3 text-center">{t('status')}</th>
                      <th className="px-4 py-3 text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredItems.map((item) => {
                      const itemBalances = balances.filter(
                        (b) => (b.item?._id || b.item) === item._id
                      );
                      const totalOnHand = itemBalances.reduce(
                        (sum, b) => sum + (b.quantityOnHand || 0),
                        0
                      );
                      const isLow = totalOnHand <= (item.minimumStockLevel || 0);

                      return (
                        <tr
                          key={item._id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {item.itemCode}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {item.itemName}
                            {item.brand && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {item.brand} {item.model ? `• ${item.model}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {item.category?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 capitalize">
                            {item.itemType}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                            {item.unitOfMeasurement}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-black ${
                                isLow
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {totalOnHand}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500 font-mono">
                            {item.minimumStockLevel || 0} / {item.reorderLevel || 0}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                            {formatCurrency(item.unitCost)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              status={isLow ? 'low_stock' : item.status || 'active'}
                              text={isLow ? 'Low Stock' : item.status}
                              size="xs"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenDetails(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                title="View Multi-Warehouse Stock"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {hasRole(['admin', 'storekeeper']) && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditItem(item)}
                                    className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition"
                                    title="Edit Item"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item._id)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                    title="Deactivate Item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Tab 2: Multi-Warehouse Stock Balances */}
      {activeTab === 'balances' && (
        <div className="w-full">
          {filteredBalances.length === 0 ? (
            <EmptyState
              title="No Stock Balances Found"
              description="No balances recorded for the selected warehouse or criteria."
              icon={WarehouseIcon}
            />
          ) : (
            <>
              {/* Mobile View: Card Deck */}
              <div className="block md:hidden space-y-3">
                {filteredBalances.map((b) => (
                  <div
                    key={b._id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {b.item?.itemName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {b.item?.itemCode}
                        </div>
                      </div>
                      <Badge
                        status={b.quantityOnHand <= (b.minimumStockLevel || 0) ? 'low_stock' : 'in_stock'}
                        size="xs"
                      />
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Warehouse:
                      </span>{' '}
                      {b.warehouse?.warehouseName} ({b.warehouse?.warehouseCode})
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-700/60 pt-2">
                      <div>
                        <span className="text-slate-400">On Hand:</span>{' '}
                        <span className="font-black text-slate-900 dark:text-slate-100">
                          {b.quantityOnHand} {b.item?.unitOfMeasurement}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Available:</span>{' '}
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {b.availableQuantity}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Reserved:</span>{' '}
                        <span>{b.reservedQuantity || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Damaged:</span>{' '}
                        <span className="text-rose-500">{b.damagedQuantity || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Balances Table */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">{t('store.warehouse')}</th>
                      <th className="px-4 py-3">{t('store.itemCode')}</th>
                      <th className="px-4 py-3">{t('store.itemName')}</th>
                      <th className="px-4 py-3 text-center">{t('on hand')}</th>
                      <th className="px-4 py-3 text-center">{t('store.reservedQuantity')}</th>
                      <th className="px-4 py-3 text-center">{t('store.availableQuantity')}</th>
                      <th className="px-4 py-3 text-center">{t('store.damagedQuantity')}</th>
                      <th className="px-4 py-3 text-right">{t('amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredBalances.map((b) => {
                      const unitCost = b.item?.unitCost || 0;
                      const totalVal = (b.quantityOnHand || 0) * unitCost;

                      return (
                        <tr
                          key={b._id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {b.warehouse?.warehouseName}
                            <span className="block text-[10px] font-mono text-slate-400 font-normal">
                              {b.warehouse?.warehouseCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                            {b.item?.itemCode}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                            {b.item?.itemName}
                          </td>
                          <td className="px-4 py-3 text-center font-black text-slate-900 dark:text-slate-100">
                            {b.quantityOnHand} {b.item?.unitOfMeasurement}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500">
                            {b.reservedQuantity || 0}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {b.availableQuantity}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-rose-500">
                            {b.damagedQuantity || 0}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(totalVal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Tab 3: Categories Management */}
      {activeTab === 'categories' && (
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div
                key={c._id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        {c.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mt-1 inline-block">
                        {c.categoryType}
                      </span>
                    </div>
                    <Badge status={c.status || 'active'} size="xs" />
                  </div>

                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {c.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                  <span>Parent: {c.parentCategory?.name || 'Top-level'}</span>
                  <span>Items: {items.filter((i) => (i.category?._id || i.category) === c._id).length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Detail Modal (Multi-Warehouse Breakdown) */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={detailItem ? `${detailItem.itemName} (${detailItem.itemCode})` : 'Item Details'}
        maxWidth="max-w-2xl"
      >
        {detailItem && (
          <div className="space-y-5 text-xs">
            {/* Top Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <div>
                <span className="text-slate-400 block text-[11px]">Category</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailItem.category?.name || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Type</span>
                <span className="font-bold capitalize text-slate-800 dark:text-slate-200">
                  {detailItem.itemType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Unit of Measure</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailItem.unitOfMeasurement}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Unit Cost</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(detailItem.unitCost)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Min Safety Level</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailItem.minimumStockLevel || 0}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Reorder Threshold</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailItem.reorderLevel || 0}
                </span>
              </div>
            </div>

            {/* Supplier & Specs details */}
            {(detailItem.preferredSupplier || detailItem.specifications) && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                {detailItem.preferredSupplier && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Preferred Supplier</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {detailItem.preferredSupplier?.supplierName || detailItem.preferredSupplier}
                    </span>
                  </div>
                )}
                {detailItem.specifications && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Technical Specifications</span>
                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                      {detailItem.specifications}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Warehouse Balances Breakdown */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                Warehouse Stock Balances
              </h4>

              {detailLoading ? (
                <div className="p-4 text-center text-slate-400">Loading stock balances...</div>
              ) : !detailItem.stockBalances || detailItem.stockBalances.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-center text-slate-500">
                  No stock balances recorded in any warehouse yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3 py-2">Warehouse</th>
                        <th className="px-3 py-2 text-center">On Hand</th>
                        <th className="px-3 py-2 text-center">Available</th>
                        <th className="px-3 py-2 text-center">Reserved</th>
                        <th className="px-3 py-2 text-center">Damaged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {detailItem.stockBalances.map((sb) => (
                        <tr key={sb._id}>
                          <td className="px-3 py-2 font-semibold">
                            {sb.warehouse?.warehouseName}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            {sb.quantityOnHand} {detailItem.unitOfMeasurement}
                          </td>
                          <td className="px-3 py-2 text-center text-emerald-600 font-bold">
                            {sb.availableQuantity}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500">
                            {sb.reservedQuantity || 0}
                          </td>
                          <td className="px-3 py-2 text-center text-rose-500">
                            {sb.damagedQuantity || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700/60">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Item Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Edit Inventory Item' : t('store.createItem')}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitItem} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('store.itemName')} *
              </label>
              <input
                type="text"
                required
                value={itemFormData.itemName}
                onChange={(e) => setItemFormData({ ...itemFormData, itemName: e.target.value })}
                placeholder="e.g. Glossy Art Paper 150gsm"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  {t('store.itemCode')} (SKU) *
                </label>
                {!editingItem && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await storeService.getNextItemCode();
                        if (res.success && res.data?.nextCode) {
                          setItemFormData((prev) => ({ ...prev, itemCode: res.data.nextCode }));
                        } else {
                          setItemFormData((prev) => ({ ...prev, itemCode: getClientNextItemCode() }));
                        }
                      } catch {
                        setItemFormData((prev) => ({ ...prev, itemCode: getClientNextItemCode() }));
                      }
                    }}
                    className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 transition"
                    title="Auto-increment next code (prefix GT-)"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto (GT-XXX)</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={itemFormData.itemCode}
                onChange={(e) => setItemFormData({ ...itemFormData, itemCode: e.target.value })}
                placeholder="e.g. GT-001"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase font-mono font-semibold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Auto-incremented default with prefix <span className="font-semibold text-slate-600 dark:text-slate-300">GT-</span> (e.g. GT-001). You may keep or customize it.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('store.category')} *
              </label>
              <select
                required
                value={itemFormData.category}
                onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('store.itemType')} *
              </label>
              <select
                required
                value={itemFormData.itemType}
                onChange={(e) => setItemFormData({ ...itemFormData, itemType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('store.unitOfMeasurement')} *
              </label>
              <div className="flex gap-2">
                <select
                  value={COMMON_UOMS.includes(itemFormData.unitOfMeasurement) ? itemFormData.unitOfMeasurement : 'other'}
                  onChange={(e) => {
                    if (e.target.value !== 'other') {
                      setItemFormData({ ...itemFormData, unitOfMeasurement: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {COMMON_UOMS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  <option value="other">Custom...</option>
                </select>
                {!COMMON_UOMS.includes(itemFormData.unitOfMeasurement) && (
                  <input
                    type="text"
                    value={itemFormData.unitOfMeasurement}
                    onChange={(e) => setItemFormData({ ...itemFormData, unitOfMeasurement: e.target.value })}
                    placeholder="e.g. drum"
                    className="w-24 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('store.unitCost')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={itemFormData.unitCost}
                onChange={(e) => setItemFormData({ ...itemFormData, unitCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('store.minStockLevel')}
              </label>
              <input
                type="number"
                min="0"
                value={itemFormData.minimumStockLevel}
                onChange={(e) => setItemFormData({ ...itemFormData, minimumStockLevel: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('store.reorderLevel')}
              </label>
              <input
                type="number"
                min="0"
                value={itemFormData.reorderLevel}
                onChange={(e) => setItemFormData({ ...itemFormData, reorderLevel: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Brand / Manufacturer
              </label>
              <input
                type="text"
                value={itemFormData.brand}
                onChange={(e) => setItemFormData({ ...itemFormData, brand: e.target.value })}
                placeholder="e.g. Heidelberg, HP, Sappi"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('store.preferredSupplier')}
              </label>
              <select
                value={itemFormData.preferredSupplier}
                onChange={(e) => setItemFormData({ ...itemFormData, preferredSupplier: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">None / Open Vendor</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.supplierName} ({s.supplierCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Specifications & Material Details
            </label>
            <textarea
              rows={2}
              value={itemFormData.specifications}
              onChange={(e) => setItemFormData({ ...itemFormData, specifications: e.target.value })}
              placeholder="e.g. 70 x 100 cm, 150 GSM, 500 sheets per pack, suitable for 4-color offset press"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Saving...' : t('actions.save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={t('store.createCategory')}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitCategory} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              placeholder="e.g. Printing Paper, Inks & Varnishes, Spare Parts"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Category Type *
            </label>
            <select
              required
              value={categoryFormData.categoryType}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, categoryType: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Parent Category (Optional)
            </label>
            <select
              value={categoryFormData.parentCategory}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, parentCategory: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="">None (Top-Level Category)</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              placeholder="Brief description of materials in this category"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-bold bg-primary-500 hover:bg-primary-600 text-white"
            >
              {submitting ? 'Creating...' : t('actions.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
