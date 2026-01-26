import { useMemo } from "react";
import { Badge } from "@/components/aura/Badge";
import { AlertCircle, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import type { OfferPayment } from "@/features/booking/advancedBookingApi";

interface OfferWithPayments {
  id: string;
  artist_name: string;
  venue_name?: string;
  performance_date?: string;
  booking_status: string;
  fee_amount?: number;
  fee_currency?: string;
  payments: OfferPayment[];
}

interface PaymentNotificationsProps {
  offers: OfferWithPayments[];
}

interface PaymentAlert {
  id: string;
  offerId: string;
  artistName: string;
  paymentLabel: string;
  dueDate: string;
  amount: number;
  currency: string;
  daysUntilDue: number;
  status: 'overdue' | 'due_soon' | 'upcoming' | 'paid';
}

function getDaysUntilDue(dueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function PaymentNotifications({ offers }: PaymentNotificationsProps) {
  const alerts = useMemo<PaymentAlert[]>(() => {
    const result: PaymentAlert[] = [];
    
    offers.forEach((offer) => {
      offer.payments.forEach((payment) => {
        if (payment.status === 'paid' || !payment.due_date) return;
        
        const daysUntilDue = getDaysUntilDue(payment.due_date);
        
        let status: 'overdue' | 'due_soon' | 'upcoming' | 'paid';
        if (daysUntilDue < 0) {
          status = 'overdue';
        } else if (daysUntilDue <= 7) {
          status = 'due_soon';
        } else if (daysUntilDue <= 30) {
          status = 'upcoming';
        } else {
          return; // Ignorer les paiements à plus de 30 jours
        }
        
        result.push({
          id: payment.id,
          offerId: offer.id,
          artistName: offer.artist_name,
          paymentLabel: payment.label,
          dueDate: payment.due_date,
          amount: payment.amount || 0,
          currency: payment.currency || offer.fee_currency || 'EUR',
          daysUntilDue,
          status,
        });
      });
    });
    
    // Trier par urgence
    return result.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      if (a.status === 'due_soon' && b.status === 'upcoming') return -1;
      if (a.status === 'upcoming' && b.status === 'due_soon') return 1;
      return a.daysUntilDue - b.daysUntilDue;
    });
  }, [offers]);
  
  const overdueCount = alerts.filter(a => a.status === 'overdue').length;
  const dueSoonCount = alerts.filter(a => a.status === 'due_soon').length;
  
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  const getAlertStyles = (status: PaymentAlert['status']) => {
    switch (status) {
      case 'overdue':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-200',
          icon: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
          badge: 'red',
        };
      case 'due_soon':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />,
          badge: 'yellow',
        };
      case 'upcoming':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-200',
          icon: <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          badge: 'blue',
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          icon: <CheckCircle2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
          badge: 'gray',
        };
    }
  };
  
  if (alerts.length === 0) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            Aucun paiement en attente dans les 30 prochains jours
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="flex items-center gap-3">
        {overdueCount > 0 && (
          <Badge color="red" className="text-sm font-semibold">
            {overdueCount} en retard
          </Badge>
        )}
        {dueSoonCount > 0 && (
          <Badge color="yellow" className="text-sm font-semibold">
            {dueSoonCount} à venir (7 jours)
          </Badge>
        )}
        <Badge color="blue" className="text-sm">
          {alerts.length} paiements à suivre
        </Badge>
      </div>
      
      {/* Liste des alertes */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.status);
          
          return (
            <div
              key={alert.id}
              className={`p-3 border rounded-lg ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {styles.icon}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${styles.text}`}>
                        {alert.artistName}
                      </p>
                      <Badge color={styles.badge as any} className="text-xs">
                        {alert.paymentLabel}
                      </Badge>
                    </div>
                    
                    <p className={`text-sm ${styles.text} mt-1`}>
                      Échéance : {formatDate(alert.dueDate)}
                      {alert.status === 'overdue' && (
                        <span className="font-semibold ml-2">
                          (Retard de {Math.abs(alert.daysUntilDue)} jours)
                        </span>
                      )}
                      {alert.status === 'due_soon' && (
                        <span className="font-semibold ml-2">
                          (Dans {alert.daysUntilDue} jours)
                        </span>
                      )}
                      {alert.status === 'upcoming' && (
                        <span className="ml-2">
                          (Dans {alert.daysUntilDue} jours)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className={`text-right ${styles.text}`}>
                  <p className="font-bold text-lg">
                    {formatCurrency(alert.amount, alert.currency)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


