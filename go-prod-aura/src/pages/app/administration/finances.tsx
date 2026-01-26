import { useState, useEffect, useCallback } from "react";
import { Wallet, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/aura/Card";
import { Button } from "@/components/aura/Button";
import { Badge } from "@/components/aura/Badge";
import { useToast } from "@/components/aura/ToastProvider";
import { PaymentTrackingChart } from "@/features/booking/components/PaymentTrackingChart";
import { PaymentNotifications } from "@/features/booking/components/PaymentNotifications";
import { listOffers } from "@/features/booking/bookingApi";
import { listOfferPayments } from "@/features/booking/advancedBookingApi";
import { getCurrentCompanyId } from "@/lib/tenant";
import { supabase } from "@/lib/supabaseClient";
import type { Offer } from "@/features/booking/bookingTypes";

export default function FinancesPage() {
  const { error: toastError } = useToast();
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersWithPayments, setOffersWithPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  
  const eventId = localStorage.getItem("selected_event_id") || localStorage.getItem("current_event_id") || "";
  
  // Récupération du company_id
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCompanyId(cid);
      } catch (e) {
        console.error('❌ Erreur récupération company_id:', e);
        toastError("Impossible de récupérer l'ID de l'entreprise");
      }
    })();
  }, [toastError]);
  
  // Chargement des offres et paiements
  const loadFinancialData = useCallback(async () => {
    if (!eventId || !companyId) return;
    
    setLoading(true);
    try {
      // Charger les offres
      const offersData = await listOffers({
        eventId,
        filters: {},
        sort: { field: "created_at", direction: "desc" },
        limit: 300,
        offset: 0,
      });
      
      setOffers(offersData || []);
      
      // Charger les paiements pour chaque offre
      const offersWithPaymentsData = await Promise.all(
        (offersData || []).map(async (offer) => {
          try {
            const payments = await listOfferPayments(offer.id);
            return {
              ...offer,
              payments,
            };
          } catch (e) {
            console.error(`Erreur chargement paiements pour offre ${offer.id}:`, e);
            return {
              ...offer,
              payments: [],
            };
          }
        })
      );
      
      setOffersWithPayments(offersWithPaymentsData);
      
    } catch (e: any) {
      console.error("Erreur chargement données financières:", e);
      toastError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [eventId, companyId, toastError]);
  
  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);
  
  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">FINANCES</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="violet">{offers.length} offres</Badge>
        </div>
      </header>

      {loading ? (
        <div className="text-gray-600 dark:text-gray-300">Chargement...</div>
      ) : !eventId ? (
        <Card>
          <CardBody>
            <p className="text-gray-500 dark:text-gray-400">
              Veuillez sélectionner un événement pour accéder aux données financières.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Section Notifications de paiement */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-400" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">Alertes de paiement</span>
              </div>
            </CardHeader>
            <CardBody>
              <PaymentNotifications offers={offersWithPayments} />
            </CardBody>
          </Card>

          {/* Section Graphiques (collapsible) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowCharts(!showCharts)}>
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-violet-400" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Suivi des paiements</span>
                  <Badge color="violet">{offers.length} offres</Badge>
                </div>
                <Button variant="ghost" className="text-sm">
                  {showCharts ? "Masquer" : "Afficher"}
                </Button>
              </div>
            </CardHeader>
            {showCharts && (
              <CardBody>
                <PaymentTrackingChart offers={offersWithPayments} />
              </CardBody>
            )}
          </Card>
          
          {/* TODO: Ajouter plus de fonctionnalités financières */}
          {/* - Factures */}
          {/* - Budgets */}
          {/* - Rapports financiers */}
        </>
      )}
    </div>
  );
}
