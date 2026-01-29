/**
 * Composant KPIs Finances
 * Affiche les indicateurs clés : payées, à payer, en retard, totaux par devise
 */

import { useMemo } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Wallet,
  FileQuestion,
} from 'lucide-react';
import { Card, CardBody } from '@/components/aura/Card';
import { Badge } from '@/components/aura/Badge';
import type { FinanceKpis as FinanceKpisType, CurrencyCode } from '../financeTypes';
import { formatMultiCurrency } from '../currencyUtils';

interface FinanceKpisProps {
  kpis: FinanceKpisType | null;
  loading?: boolean;
  className?: string;
}

/**
 * Carte KPI individuelle
 */
function KpiCard({
  title,
  count,
  icon: Icon,
  iconColor,
  totals,
  variant = 'default',
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  iconColor: string;
  totals: Partial<Record<CurrencyCode, number>>;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: {
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/20',
      text: 'text-gray-400',
    },
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      text: 'text-green-400',
    },
    warning: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      text: 'text-orange-400',
    },
    danger: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
    },
  };

  const style = variantStyles[variant];
  const formattedTotals = formatMultiCurrency(totals, ' | ');

  return (
    <Card className="flex-1 min-w-[200px]">
      <CardBody className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{count}</p>
            {formattedTotals !== '-' && (
              <p className={`text-sm mt-1 ${style.text}`}>
                {formattedTotals}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${style.bg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Skeleton pour le chargement
 */
function KpiSkeleton() {
  return (
    <Card className="flex-1 min-w-[200px] animate-pulse">
      <CardBody className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-20 bg-gray-700 rounded mb-2" />
            <div className="h-8 w-12 bg-gray-700 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-700 rounded" />
          </div>
          <div className="w-9 h-9 bg-gray-700 rounded-lg" />
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Composant principal KPIs
 */
export function FinanceKpis({ kpis, loading = false, className = '' }: FinanceKpisProps) {
  // Calculer le total global
  const globalTotal = useMemo(() => {
    if (!kpis) return {};
    return kpis.totalsByCurrency;
  }, [kpis]);

  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
        <KpiCard
          title="A recevoir"
          count={0}
          icon={FileQuestion}
          iconColor="text-blue-400"
          totals={{}}
          variant="default"
        />
        <KpiCard
          title="Payees"
          count={0}
          icon={CheckCircle}
          iconColor="text-green-400"
          totals={{}}
          variant="success"
        />
        <KpiCard
          title="A payer"
          count={0}
          icon={Clock}
          iconColor="text-orange-400"
          totals={{}}
          variant="warning"
        />
        <KpiCard
          title="En retard"
          count={0}
          icon={AlertTriangle}
          iconColor="text-red-400"
          totals={{}}
          variant="danger"
        />
        <KpiCard
          title="Total"
          count={0}
          icon={Wallet}
          iconColor="text-violet-400"
          totals={{}}
          variant="default"
        />
      </div>
    );
  }

  const totalCount = kpis.toReceiveCount + kpis.paidCount + kpis.toPayCount + kpis.partialCount;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Cartes KPI principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="A recevoir"
          count={kpis.toReceiveCount}
          icon={FileQuestion}
          iconColor="text-blue-400"
          totals={kpis.toReceiveTotalsByCurrency}
          variant="default"
        />
        <KpiCard
          title="Payees"
          count={kpis.paidCount}
          icon={CheckCircle}
          iconColor="text-green-400"
          totals={kpis.paidTotalsByCurrency}
          variant="success"
        />
        <KpiCard
          title="A payer"
          count={kpis.toPayCount + kpis.partialCount}
          icon={Clock}
          iconColor="text-orange-400"
          totals={kpis.toPayTotalsByCurrency}
          variant="warning"
        />
        <KpiCard
          title="En retard"
          count={kpis.overdueCount}
          icon={AlertTriangle}
          iconColor="text-red-400"
          totals={kpis.overdueTotalsByCurrency}
          variant="danger"
        />
        <KpiCard
          title="Total factures"
          count={totalCount}
          icon={Wallet}
          iconColor="text-violet-400"
          totals={globalTotal}
          variant="default"
        />
      </div>

      {/* Barre de progression */}
      {totalCount > 0 && (
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Progression des paiements</span>
              <span className="text-sm font-medium text-white">
                {kpis.paidCount} / {totalCount} factures payées
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{
                  width: `${totalCount > 0 ? (kpis.paidCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{Math.round((kpis.paidCount / totalCount) * 100)}% payé</span>
              {kpis.partialCount > 0 && (
                <Badge color="violet">{kpis.partialCount} partielles</Badge>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default FinanceKpis;
