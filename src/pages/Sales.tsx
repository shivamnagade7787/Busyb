import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/utils';
import { Plus, Search, FileText, X, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import ConfirmModal from '../components/ConfirmModal';

export default function Sales() {
  const { user, activeBusiness } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    partyId: '',
    paymentMode: 'cash',
    discount: '0',
    manualTotalAmount: ''
  });
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('userId', '==', user.uid)), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((d: any) => (d.businessId || 'Business 1') === activeBusiness)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    const unsubParties = onSnapshot(query(collection(db, 'parties'), where('userId', '==', user.uid)), (snapshot) => {
      setParties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((d: any) => (d.businessId || 'Business 1') === activeBusiness));
    });

    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('userId', '==', user.uid)), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((d: any) => (d.businessId || 'Business 1') === activeBusiness));
    });

    return () => { unsubSales(); unsubParties(); unsubProducts(); };
  }, [user, activeBusiness]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, price: 0 }]);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      newItems[index] = { ...newItems[index], productId: value, price: product?.sellingPrice || 0, name: product?.name || '' };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.length > 0 
    ? items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    : Number(formData.manualTotalAmount);
  const finalAmount = totalAmount - Number(formData.discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) return;

    if (items.length === 0 && !formData.manualTotalAmount) {
      setError("Please add items or enter a total amount.");
      return;
    }

    if (items.some(item => !item.productId)) {
      setError("Please select a product for all items.");
      return;
    }

    const party = parties.find(p => p.id === formData.partyId);
    
    const saleData = {
      userId: user.uid,
      businessId: activeBusiness,
      partyId: formData.partyId,
      partyName: party?.name || 'Walk-in Customer',
      totalAmount,
      discount: Number(formData.discount),
      finalAmount,
      paymentMode: formData.paymentMode,
      items,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    try {
      const batch = writeBatch(db);
      
      // 1. Create Sale
      const saleRef = doc(collection(db, 'sales'));
      batch.set(saleRef, saleData);

      // 2. Update Inventory
      items.forEach(item => {
        if (item.productId) {
          const productRef = doc(db, 'products', item.productId);
          const product = products.find(p => p.id === item.productId);
          if (product) {
            batch.update(productRef, { stockQuantity: product.stockQuantity - item.quantity });
          }
        }
      });

      // 3. Update Party Balance if Credit
      if (formData.paymentMode === 'credit' && formData.partyId) {
        const partyRef = doc(db, 'parties', formData.partyId);
        if (party) {
          batch.update(partyRef, { balance: party.balance + finalAmount });
        }
      }

      await batch.commit();
      
      setIsModalOpen(false);
      setFormData({ partyId: '', paymentMode: 'cash', discount: '0', manualTotalAmount: '' });
      setItems([]);
    } catch (error) {
      console.error('Error saving sale:', error);
      setError('Failed to save sale. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteDoc(doc(db, 'sales', itemToDelete));
      setItemToDelete(null);
    }
  };

  const generateInvoice = (sale: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Date: ${new Date(sale.date).toLocaleDateString()}`, 20, 40);
    doc.text(`Customer: ${sale.partyName}`, 20, 50);
    doc.text(`Payment Mode: ${sale.paymentMode.toUpperCase()}`, 20, 60);

    const tableData = sale.items.map((item: any) => [
      item.name,
      item.quantity,
      formatCurrency(item.price),
      formatCurrency(item.quantity * item.price)
    ]);

    (doc as any).autoTable({
      startY: 70,
      head: [['Item', 'Qty', 'Price', 'Total']],
      body: tableData,
      foot: [
        ['', '', 'Subtotal', formatCurrency(sale.totalAmount)],
        ['', '', 'Discount', formatCurrency(sale.discount)],
        ['', '', 'Grand Total', formatCurrency(sale.finalAmount)]
      ],
      theme: 'grid'
    });

    doc.save(`Invoice_${sale.id}.pdf`);
  };

  const filteredSales = sales.filter(s => 
    s.partyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sales</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Sale
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Mode</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4 text-gray-600 dark:text-gray-300">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="p-4 text-gray-900 dark:text-white font-medium">{sale.partyName}</td>
                  <td className="p-4 text-gray-900 dark:text-white font-medium">{formatCurrency(sale.finalAmount)}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300 capitalize">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sale.paymentMode === 'credit' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {sale.paymentMode}
                    </span>
                  </td>
                  <td className="p-4 flex items-center justify-end gap-2">
                    <button 
                      onClick={() => generateInvoice(sale)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Download Invoice"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setItemToDelete(sale.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Sale"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No sales found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Sale</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
                  <select value={formData.partyId} onChange={e => setFormData({...formData, partyId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Walk-in Customer</option>
                    {parties.filter(p => p.type === 'customer').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Mode</label>
                  <select value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
                  <button type="button" onClick={handleAddItem} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    + Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <select required value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="">Select Product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQuantity})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input required type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div className="w-32">
                        <input required type="number" min="0" step="0.01" placeholder="Price" value={item.price} onChange={e => handleItemChange(index, 'price', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg mt-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                      <p>No items added. Click "+ Add Item" to start.</p>
                      <p>OR</p>
                      <div className="max-w-xs mx-auto">
                        <label className="block text-left text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Enter Total Amount Manually</label>
                        <input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={formData.manualTotalAmount} 
                          onChange={e => setFormData({...formData, manualTotalAmount: e.target.value})} 
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                  <span>Discount</span>
                  <div className="w-32">
                    <input type="number" min="0" step="0.01" value={formData.discount} onChange={e => setFormData({...formData, discount: e.target.value})} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span>Total</span>
                  <span>{formatCurrency(finalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Complete Sale</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!itemToDelete}
        title="Delete Sale"
        message="Are you sure you want to delete this sale? Inventory and party balances will NOT be automatically reverted."
        onConfirm={handleDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
