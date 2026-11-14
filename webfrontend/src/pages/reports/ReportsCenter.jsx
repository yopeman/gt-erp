import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';

// Module Reports Subcomponents for Tab-style reporting
import HrReports from '../hr/HrReports';
import StoreReports from '../store/StoreReports';
import PurchaseReports from '../purchasing/PurchaseReports';
import CrmReports from '../crm/CrmReports';
import ProductionReports from '../production/ProductionReports';
import FinanceReports from '../finance/FinanceReports';

import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowRight,
  Package,
  Factory,
  Landmark
} from 'lucide-react';

const REPORT_MODULE_TABS = [
  { id: 'hr', title: 'HR Workforce', icon: Users, desc: 'Attendance & Payroll' },
  { id: 'store', title: 'Store & Inventory', icon: Package, desc: 'Stock & Movements' },
  { id: 'purchasing', title: 'Procurement', icon: ShoppingCart, desc: 'Spend & Orders' },
  { id: 'crm', title: 'CRM & Sales', icon: TrendingUp, desc: 'Orders & Receivables' },
  { id: 'production', title: 'Production Floor', icon: Factory, desc: 'Jobs & Spoilage' },
  { id: 'finance', title: 'Finance Ledger', icon: Landmark, desc: 'P&L, AP & Taxes' }
];

export default function ReportsCenter() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active module tab ('hr' | 'store' | 'purchasing' | 'crm' | 'production' | 'finance')
  const tabParam = searchParams.get('tab');
  const [activeModuleTab, setActiveModuleTab] = useState(tabParam || 'hr');

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'hr';
    if (tabFromUrl !== activeModuleTab) {
      setActiveModuleTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleSelectTab = (tabId) => {
    setActiveModuleTab(tabId);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tabId);
    setSearchParams(newParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Central Hub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-500" />
            <span>{t('Enterprise Reports Center')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Centralized multi-domain analytics, cross-departmental auditing, and modular reporting')}
          </p>
        </div>
      </div>

      {/* Module Reporting Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {REPORT_MODULE_TABS.map((mod) => {
          const ModIcon = mod.icon;
          const isCurrent = activeModuleTab === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => handleSelectTab(mod.id)}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between items-center group cursor-pointer ${isCurrent
                  ? 'bg-primary-500 text-white border-primary-500 shadow-md ring-2 ring-primary-500/30'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-500/60 hover:shadow-xs text-slate-800 dark:text-slate-100'
                }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`p-1.5 rounded-lg ${isCurrent ? 'bg-white/20 text-white' : 'bg-primary-50 dark:bg-primary-950/60 text-primary-500'
                    }`}
                >
                  <ModIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-xs font-bold leading-tight">{t(mod.title)}</div>
                <div
                  className={`text-[10px] truncate mt-0.5 ${isCurrent ? 'text-primary-100 font-medium' : 'text-slate-400'
                    }`}
                >
                  {t(mod.desc)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab-Style Modular Report Content */}
      {activeModuleTab === 'hr' && <HrReports />}
      {activeModuleTab === 'store' && <StoreReports />}
      {activeModuleTab === 'purchasing' && <PurchaseReports />}
      {activeModuleTab === 'crm' && <CrmReports />}
      {activeModuleTab === 'production' && <ProductionReports />}
      {activeModuleTab === 'finance' && <FinanceReports />}
    </div>
  );
}

