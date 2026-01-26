import { useMemo } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardBody } from "@/components/aura/Card";
import { Badge } from "@/components/aura/Badge";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface OfferPayment {
  id: string;
  offer_id: string;
  label: string;
  amount: number;
  currency: string;
  due_date: string;
  is_paid: boolean;
  paid_at?: string;
  percentage?: number;
}

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

interface PaymentTrackingChartProps {
  offers: OfferWithPayments[];
}

export function PaymentTrackingChart({ offers }: PaymentTrackingChartProps) {
  const stats = useMemo(() => {
    let totalExpected = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    
    const now = new Date();
    
    offers.forEach((offer) => {
      offer.payments.forEach((payment) => {
        const amount = payment.amount || 0;
        totalExpected += amount;
        
        if (payment.is_paid) {
          totalPaid += amount;
        } else {
          totalPending += amount;
          const dueDate = new Date(payment.due_date);
          if (dueDate < now) {
            totalOverdue += amount;
          }
        }
      });
    });
    
    return {
      totalExpected,
      totalPaid,
      totalPending,
      totalOverdue,
      paidPercentage: totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0,
    };
  }, [offers]);
  
  const pieData = useMemo(() => {
    return [
      { name: "Payé", value: stats.totalPaid, color: "#10b981" },
      { name: "En attente", value: stats.totalPending - stats.totalOverdue, color: "#fbbf24" },
      { name: "En retard", value: stats.totalOverdue, color: "#ef4444" },
    ].filter((item) => item.value > 0);
  }, [stats]);
  
  const barData = useMemo(() => {
    // Grouper les paiements par mois
    const monthlyData: Record<string, { expected: number; paid: number }> = {};
    
    offers.forEach((offer) => {
      offer.payments.forEach((payment) => {
        const date = new Date(payment.due_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { expected: 0, paid: 0 };
        }
        
        monthlyData[monthKey].expected += payment.amount || 0;
        if (payment.is_paid) {
          monthlyData[monthKey].paid += payment.amount || 0;
        }
      });
    });
    
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // 6 derniers mois
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        expected: data.expected,
        paid: data.paid,
      }));
  }, [offers]);
  
  const currency = offers[0]?.payments[0]?.currency || 'EUR';
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className="space-y-6">
      {/* Cartes statistiques */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total attendu</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(stats.totalExpected)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-violet-400" />
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Payé</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.totalPaid)}
                </p>
                <Badge color="green" className="mt-1 text-xs">
                  {stats.paidPercentage}%
                </Badge>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(stats.totalPending)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">En retard</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(stats.totalOverdue)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-400" />
            </div>
          </CardBody>
        </Card>
      </div>
      
      {/* Graphiques */}
      <div className="grid grid-cols-2 gap-6">
        {/* Graphique en barres */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Évolution des paiements (6 derniers mois)
            </h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                    border: '1px solid #4b5563',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                <Bar dataKey="expected" name="Attendu" fill="#8b5cf6" />
                <Bar dataKey="paid" name="Payé" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        
        {/* Graphique circulaire */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Répartition des paiements
            </h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                    border: '1px solid #4b5563',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}


