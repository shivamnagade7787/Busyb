import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/utils';
import { FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function Reports() {
  const { user, activeBusiness } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('thisMonth');
  
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, count: 0 });

  useEffect(() => {
    fetchData();
  }, [reportType, dateRange, user, activeBusiness]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    let startDate = new Date();
    let endDate = new Date();
    
    if (dateRange === 'thisMonth') {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    } else if (dateRange === 'lastMonth') {
      startDate = startOfMonth(new Date(new Date().setMonth(new Date().getMonth() - 1)));
      endDate = endOfMonth(new Date(new Date().setMonth(new Date().getMonth() - 1)));
    } else if (dateRange === 'today') {
      startDate.setHours(0,0,0,0);
      endDate.setHours(23,59,59,999);
    }

    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    try {
      const q = query(
        collection(db, reportType), 
        where('userId', '==', user.uid),
        where('date', '>=', startStr),
        where('date', '<=', endStr)
      );
      
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((d: any) => (d.businessId || 'Business 1') === activeBusiness);
      
      setData(docs);
      
      if (reportType === 'sales') {
        setSummary({
          total: docs.reduce((sum, d: any) => sum + d.finalAmount, 0),
          count: docs.length
        });
      } else if (reportType === 'expenses') {
        setSummary({
          total: docs.reduce((sum, d: any) => sum + d.amount, 0),
          count: docs.length
        });
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`${reportType.toUpperCase()} REPORT`, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Period: ${dateRange}`, 20, 30);
    doc.text(`Total ${reportType === 'sales' ? 'Sales' : 'Expenses'}: ${formatCurrency(summary.total)}`, 20, 40);
    doc.text(`Total Transactions: ${summary.count}`, 20, 50);

    let head = [];
    let body = [];

    if (reportType === 'sales') {
      head = [['Date', 'Customer', 'Mode', 'Amount']];
      body = data.map(d => [
        format(new Date(d.date), 'dd MMM yyyy'),
        d.partyName,
        d.paymentMode,
        formatCurrency(d.finalAmount)
      ]);
    } else {
      head = [['Date', 'Category', 'Mode', 'Amount']];
      body = data.map(d => [
        format(new Date(d.date), 'dd MMM yyyy'),
        d.category,
        d.paymentMode,
        formatCurrency(d.amount)
      ]);
    }

    autoTable(doc, {
      startY: 60,
      head,
      body,
      theme: 'grid'
    });

    doc.save(`${reportType}_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h2>
        <button 
          onClick={downloadPDF}
          disabled={data.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          Download PDF
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="sales">Sales Report</option>
              <option value="expenses">Expense Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="today">Today</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.total)}</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Transactions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{summary.count}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm">
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">{reportType === 'sales' ? 'Customer' : 'Category'}</th>
                  <th className="p-4 font-medium">Mode</th>
                  <th className="p-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4 text-gray-600 dark:text-gray-300">{format(new Date(item.date), 'dd MMM yyyy')}</td>
                    <td className="p-4 text-gray-900 dark:text-white font-medium">{reportType === 'sales' ? item.partyName : item.category}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300 capitalize">{item.paymentMode}</td>
                    <td className="p-4 text-gray-900 dark:text-white font-medium text-right">
                      {formatCurrency(reportType === 'sales' ? item.finalAmount : item.amount)}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No data found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
