import React, { useState, useEffect } from 'react';
import FinancialSummary from './FinancialSummary';
import { storage } from '../../utils/storage';
import { Sale } from '../../types/sale';
import { Product } from '../../types/product';
import { Expense } from '../../types/expense';
import { Credit } from '../../types/credit';
import DateRangeSelector from './DateRangeSelector';
import { generateFinancialReport } from '../../utils/report';
import { Download } from 'lucide-react';
import VendorReports from './VendorReports';

interface ReportsProps {
  userRole?: string;
}

export default function Reports({ userRole = 'admin' }: ReportsProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // Default to last month
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [salesData, productsData, expensesData, creditsData] = await Promise.all([
          storage.sales.load(),
          storage.products.load(),
          storage.expenses.load(),
          storage.credits.load()
        ]);
        setSales(Array.isArray(salesData) ? salesData : []);
        setProducts(productsData);
        setExpenses(expensesData);
        setCredits(creditsData);
        setError(null);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error loading data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Helper functions
  const isDateInRange = (date: string) => {
    // Convert all dates to start of day for consistent comparison
    const checkDate = new Date(date).setHours(0, 0, 0, 0);
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    return checkDate >= start && checkDate <= end;
  };

  const calculateFinancialMetrics = () => {
    // Calculate credit metrics
    const creditMetrics = credits.filter(credit => {
      return isDateInRange(credit.createdAt);
    }).reduce((metrics, credit) => {
      // Skip cancelled credits
      if (credit.status === 'cancelled') {
        return metrics;
      }

      // Add to total credit amount
      metrics.total += credit.finalPrice;
      
      // Calculate total potential profit for this credit
      const totalPotentialProfit = credit.finalPrice - credit.originalPrice;
      
      // Calculate paid amount and payment ratio
      const totalPaid = credit.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const paymentRatio = totalPaid / credit.finalPrice;
      
      // Calculate realized profit based on payment ratio
      const realizedProfit = totalPotentialProfit * paymentRatio;
      
      // Update metrics
      metrics.profit += realizedProfit;
      metrics.paid += totalPaid;
      metrics.pending += credit.finalPrice - totalPaid;

      return metrics;
    }, { total: 0, paid: 0, pending: 0, profit: 0 });

    // Calculate inventory cost
    const inventoryCost = products.reduce((total, product) => 
      total + (product.costPrice * product.quantity), 0);

    // Calculate sales metrics
    const activeSales = sales.filter(sale => {
      if (sale.status !== 'active') return false;
      return isDateInRange(sale.date);
    });

    const totalSales = activeSales.reduce((total, sale) => total + sale.total, 0);
    
    // Calculate cost of sales
    const costOfSales = activeSales.reduce((total, sale) => {
      return total + sale.products.reduce((cost, product) => 
        cost + (product.originalPrice * product.quantity), 0);
    }, 0);

    // Calculate expenses
    const activeExpenses = expenses.filter(expense => {
      if (expense.status !== 'active') return false;
      return isDateInRange(expense.date);
    });

    const totalExpenses = activeExpenses.reduce((total, expense) => 
      total + expense.amount, 0);

    // Calculate net profit
    const netProfit = totalSales - costOfSales - totalExpenses;

    // Calculate cash balance
    const cashBalance = totalSales - totalExpenses;

    // Calculate payment methods totals
    const paymentTotals = activeSales.reduce((totals, sale) => {
      switch (sale.paymentMethod) {
        case 'cash':
          totals.cash += sale.total;
          break;
        case 'card':
          totals.card += sale.total;
          break;
        case 'transfer':
          totals.transfer += sale.total;
          break;
      }
      return totals;
    }, { cash: 0, card: 0, transfer: 0 });

    // Calculate total profit including credits
    const totalProfit = netProfit + creditMetrics.profit;

    return {
      inventoryCost,
      totalSales,
      totalExpenses,
      costOfSales,
      netProfit,
      cashBalance,
      totalProfit,
      cashPayments: paymentTotals.cash,
      cardPayments: paymentTotals.card,
      transferPayments: paymentTotals.transfer,
      creditTotal: creditMetrics.total,
      creditPaid: creditMetrics.paid,
      creditPending: creditMetrics.pending,
      creditProfit: creditMetrics.profit
    };
  };

  // Initialize metrics state using the calculation function
  const [metrics, setMetrics] = useState(calculateFinancialMetrics);

  // Update metrics when data changes
  useEffect(() => {
    if (!isLoading) {
      setMetrics(calculateFinancialMetrics());
    }
  }, [sales, products, expenses, credits, startDate, endDate, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">Error: {error}</div>
    );
  }

  const handleSearch = () => {
    // No need to do anything here since metrics update automatically
  };

  const handleDownloadReport = () => {
    const doc = generateFinancialReport(metrics, startDate, endDate);
    doc.save(`reporte-financiero-${startDate}-${endDate}.pdf`);
  };

  // If user is a vendor, show simplified view
  if (userRole !== 'admin' && userRole !== 'super') {
    return (
      <VendorReports
        metrics={{
          totalSales: metrics.totalSales,
          creditTotal: metrics.creditTotal,
          totalExpenses: metrics.totalExpenses,
          cashPayments: metrics.cashPayments,
          cardPayments: metrics.cardPayments,
          transferPayments: metrics.transferPayments
        }}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onSearch={handleSearch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-800">Reportes Financieros</h2>
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            title="Descargar reporte PDF"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </button>
        </div>
        <div className="flex-shrink-0">
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onSearch={handleSearch}
          />
        </div>
      </div>

      <FinancialSummary {...metrics} />
    </div>
  );
}