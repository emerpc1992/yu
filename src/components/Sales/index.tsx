import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import SalesList from './SalesList';
import SaleForm from './SaleForm';
import CancelSaleModal from './CancelSaleModal';
import DeleteSaleModal from './DeleteSaleModal';
import { Sale } from '../../types/sale';
import { Product } from '../../types/product';
import { Staff } from '../../types/staff';
import { Client } from '../../types/client';
import { storage } from '../../utils/storage';
import DateRangeSelector from '../Reports/DateRangeSelector';
import { updateProductQuantity } from '../../utils/inventory';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [cancellingSale, setCancellingSale] = useState<Sale | undefined>();
  const [deletingSaleId, setDeletingSaleId] = useState<string | undefined>();
  const [deleteError, setDeleteError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // Default to last month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [filteredSales, setFilteredSales] = useState<Sale[]>(sales);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [salesData, productsData, staffData, clientsData] = await Promise.all([
          storage.sales.load(),
          storage.products.load(),
          storage.staff.load(),
          storage.clients.load()
        ]);
        setSales(salesData);
        setProducts(productsData);
        setStaff(staffData);
        setClients(clientsData);
        setError(null);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Error loading data');
        setSales([]);
        setProducts([]);
        setStaff([]);
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (!isLoading && sales.length > 0) {
      storage.sales.save(sales);
    }
  }, [sales, isLoading]);

  // Filter sales whenever dates or sales change
  useEffect(() => {
    const filtered = sales.filter(sale => {
      const saleDate = new Date(sale.date).setHours(0, 0, 0, 0);
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      return saleDate >= start && saleDate <= end;
    });
    setFilteredSales(filtered);
  }, [sales, startDate, endDate]);
  // Save staff whenever they change
  useEffect(() => {
    storage.staff.save(staff);
  }, [staff]);

  // Save products whenever they change
  useEffect(() => {
    storage.products.save(products);
  }, [products]);

  const handleAddSale = (saleData: Omit<Sale, 'id' | 'date'>) => {
    try {
      const quantityChanges = saleData.products.map(product => ({
        id: product.id,
        quantity: -product.quantity
      }));

      const updatedProducts = updateProductQuantity(products, quantityChanges);
      setProducts(updatedProducts);

      // Get the highest invoice number and increment by 1
      const lastInvoiceNumber = sales.reduce((max, sale) => 
        Math.max(max, sale.invoiceNumber || 0), 0);

      const newSale = {
        ...saleData,
        id: Date.now().toString(),
        invoiceNumber: lastInvoiceNumber + 1,
        date: new Date().toISOString(),
        status: 'active' as const
      };

      // Update staff sales and commission records
      if (newSale.staffId) {
        const updatedStaff = staff.map(s => {
          if (s.id === newSale.staffId) {
            return {
              ...s,
              sales: [...s.sales, {
                id: newSale.id,
                date: newSale.date,
                total: newSale.total,
                commission: newSale.staffCommission || 0,
                commissionPaid: false,
                products: newSale.products.map(p => ({
                  id: p.id,
                  name: p.name,
                  quantity: p.quantity,
                  price: p.finalPrice
                }))
              }]
            };
          }
          return s;
        });
        setStaff(updatedStaff);
      }

      // Update all states atomically
      setSales([...sales, newSale]);
      storage.products.save(updatedProducts);
      setShowSaleForm(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al actualizar el inventario');
      return;
    }
  };

  const handleCancelSale = (reason: string) => {
    if (cancellingSale) {
      // Restore product quantities
      const updatedProducts = products.map(product => {
        const saleProduct = cancellingSale.products.find(p => p.id === product.id);
        if (saleProduct) {
          return {
            ...product,
            quantity: product.quantity + saleProduct.quantity
          };
        }
        return product;
      });
      setProducts(updatedProducts);

      // Update the sale status and staff commission
      const updatedSales = sales.map(sale => {
        if (sale.id === cancellingSale.id) {
          // If there's a staff discount, mark it as cancelled too
          const updatedSale = { ...sale, status: 'cancelled', cancellationReason: reason };
          if (updatedSale.staffDiscount) {
            updatedSale.staffDiscount = {
              ...updatedSale.staffDiscount,
              status: 'cancelled',
              cancellationReason: reason
            };
          }
          return updatedSale;
        }
        return sale;
      });
      setSales(updatedSales);

      // Update staff member's sales record
      if (cancellingSale.staffId) {
        const updatedStaff = staff.map(s => {
          if (s.id === cancellingSale.staffId) {
            // Remove the sale from staff records when cancelled
            return {
              ...s,
              sales: s.sales.filter(sale => sale.id !== cancellingSale.id)
            };
          }
          return s;
        });
        setStaff(updatedStaff);
        storage.staff.save(updatedStaff);
      }

      setCancellingSale(undefined);
    }
  };

  const handleDeleteSale = (password: string) => {
    if (password !== 'admin2019') {
      setDeleteError('Contraseña incorrecta');
      return;
    }
    setSales(sales.filter(s => s.id !== deletingSaleId));
    setDeletingSaleId(undefined);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-800">Ventas</h2>
          <button
            onClick={() => setShowSaleForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Venta
          </button>
        </div>
        <div className="flex-shrink-0">
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onSearch={() => {}} // No need for explicit search since we use useEffect
          />
        </div>
      </div>

      {filteredSales.length > 0 ? (
        <SalesList
          sales={filteredSales}
          onCancel={setCancellingSale}
          onDelete={setDeletingSaleId} />
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          {sales.length > 0 
            ? 'No hay ventas en el rango de fechas seleccionado.'
            : 'No hay ventas registradas. Comienza agregando una nueva.'
          }
        </div>
      )}

      {showSaleForm && (
        <SaleForm
          products={products}
          staff={staff}
          clients={clients}
          onSubmit={handleAddSale}
          onClose={() => setShowSaleForm(false)}
        />
      )}

      {cancellingSale && (
        <CancelSaleModal
          onConfirm={handleCancelSale}
          onClose={() => setCancellingSale(undefined)}
        />
      )}

      {deletingSaleId && (
        <DeleteSaleModal
          onConfirm={handleDeleteSale}
          onClose={() => {
            setDeletingSaleId(undefined);
            setDeleteError('');
          }}
          error={deleteError} />
      )}
    </div>
  );
}