import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, ShoppingCart, Users, Package, FileText, Wallet, Store, ChevronDown, Settings, X, Upload, Trash2, Receipt, Plus, Sun, Moon, Settings2, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth, CustomFields } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import CustomizeFieldsModal from '../CustomizeFieldsModal';
import ReminderService from '../ReminderService';

export default function Layout() {
  const { 
    user, activeBusiness, setActiveBusiness, businesses, addBusiness,
    upiId, setUpiId, 
    qrCodeImage, setQrCodeImage, 
    billTemplate, setBillTemplate,
    invoiceFont, setInvoiceFont,
    invoiceColor, setInvoiceColor,
    logoPlacement, setLogoPlacement
  } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddBusinessOpen, setIsAddBusinessOpen] = useState(false);
  const [newBizData, setNewBizData] = useState({ name: '', type: '', gst: '' });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  const [tempUpi, setTempUpi] = useState(upiId);
  const [tempQr, setTempQr] = useState(qrCodeImage);
  const [tempTemplate, setTempTemplate] = useState(billTemplate || 'standard');
  const [tempFont, setTempFont] = useState(invoiceFont || 'helvetica');
  const [tempColor, setTempColor] = useState(invoiceColor || '#2563eb');
  const [tempPlacement, setTempPlacement] = useState(logoPlacement || 'left');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<number>(1);
  const [tempNextInvoiceNumber, setTempNextInvoiceNumber] = useState<number>(1);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [customizeFeature, setCustomizeFeature] = useState<keyof CustomFields>('sales');

  useEffect(() => {
    if (isSettingsOpen) {
      setTempUpi(upiId);
      setTempQr(qrCodeImage);
      setTempTemplate(billTemplate || 'standard');
      setTempFont(invoiceFont || 'helvetica');
      setTempColor(invoiceColor || '#2563eb');
      setTempPlacement(logoPlacement || 'left');
      setTempNextInvoiceNumber(nextInvoiceNumber);
    }
  }, [isSettingsOpen, upiId, qrCodeImage, billTemplate, invoiceFont, invoiceColor, logoPlacement, nextInvoiceNumber]);

  useEffect(() => {
    if (user && activeBusiness) {
      const fetchSettings = async () => {
        const docRef = doc(db, 'businessSettings', `${user.uid}_${activeBusiness}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNextInvoiceNumber(docSnap.data().nextInvoiceNumber || 1);
        } else {
          setNextInvoiceNumber(1);
        }
      };
      fetchSettings();
    }
  }, [user, activeBusiness, isSettingsOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setTempQr(canvas.toDataURL('image/jpeg', 0.8));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    setUpiId(tempUpi);
    setQrCodeImage(tempQr);
    setBillTemplate(tempTemplate);
    setInvoiceFont(tempFont);
    setInvoiceColor(tempColor);
    setLogoPlacement(tempPlacement);
    
    if (user && activeBusiness) {
      const docRef = doc(db, 'businessSettings', `${user.uid}_${activeBusiness}`);
      await setDoc(docRef, { nextInvoiceNumber: Number(tempNextInvoiceNumber) }, { merge: true });
      setNextInvoiceNumber(Number(tempNextInvoiceNumber));
    }
    
    setIsSettingsOpen(false);
  };

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizData.name.trim()) return;
    
    await addBusiness({
      name: newBizData.name.trim(),
      type: newBizData.type.trim(),
      gst: newBizData.gst.trim()
    });
    
    setActiveBusiness(newBizData.name.trim());
    setIsAddBusinessOpen(false);
    setNewBizData({ name: '', type: '', gst: '' });
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: ShoppingCart, label: 'Sales', path: '/sales' },
    { icon: Receipt, label: 'Purchases', path: '/purchases' },
    { icon: Wallet, label: 'Expenses', path: '/expenses' },
    { icon: Package, label: 'Items', path: '/inventory' },
    { icon: Users, label: 'Parties', path: '/parties' },
    { icon: BookOpen, label: 'Udhar (Credit)', path: '/credit' },
    { icon: FileText, label: 'Reports', path: '/reports' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex flex-col w-[10vw] min-w-[48px] md:w-16 hover:w-[60vw] md:hover:w-64 group transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 h-full overflow-hidden shrink-0">
        <div className="p-2 md:p-4 border-b border-gray-200 dark:border-gray-700 relative flex items-center justify-center md:justify-start">
          <div className="flex items-center gap-3 w-full relative">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0 mx-auto md:mx-0">
              <Store className="w-4 h-4 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity flex-1 flex items-center justify-between w-0 group-hover:w-auto">
              <div>
                <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px]">{activeBusiness}</h1>
                <p className="text-[10px] text-gray-500">Switch Business</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </div>
            {/* Native Select for Business Switching */}
            <select
              value={activeBusiness}
              onChange={(e) => {
                if (e.target.value === 'ADD_NEW') {
                  setIsAddBusinessOpen(true);
                } else {
                  setActiveBusiness(e.target.value);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Switch Business"
            >
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.name}>{biz.name}</option>
              ))}
              <option value="ADD_NEW">+ Add New Business</option>
            </select>
          </div>
        </div>
        <nav className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 p-2 md:p-3 rounded-lg transition-colors whitespace-nowrap overflow-hidden',
                  isActive 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )
              }
            >
              <div className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 shrink-0 mx-auto md:mx-0">
                <item.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-2 md:p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setTempUpi(upiId);
              setIsSettingsOpen(true);
            }}
            className="flex items-center gap-3 p-2 md:p-3 w-full text-left text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap overflow-hidden"
          >
            <div className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 shrink-0 mx-auto md:mx-0">
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between md:justify-end px-4 md:px-8 shrink-0">
          <h1 className="md:hidden text-xl font-bold text-blue-600 dark:text-blue-400">SmartVyapaar</h1>
          <div className="relative group/profile">
            <button className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              {user?.displayName?.charAt(0) || 'U'}
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all z-50">
              <div className="p-2">
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)} 
                  className="w-full text-left px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                <button 
                  onClick={useAuth().logout} 
                  className="w-full text-left px-4 py-2 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 text-red-600 dark:text-red-400"
                >
                  <Store className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-6">
          <Outlet />
        </div>
      </main>

      {/* Add Business Modal */}
      {isAddBusinessOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Business</h2>
              <button onClick={() => setIsAddBusinessOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddBusiness} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={newBizData.name}
                  onChange={(e) => setNewBizData({ ...newBizData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Type (Optional)
                </label>
                <input
                  type="text"
                  value={newBizData.type}
                  onChange={(e) => setNewBizData({ ...newBizData, type: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Retail, Wholesale, Services"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GST Number (Optional)
                </label>
                <input
                  type="text"
                  value={newBizData.gst}
                  onChange={(e) => setNewBizData({ ...newBizData, gst: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter GSTIN"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddBusinessOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Starting Invoice Number
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-mono">INV-</span>
                  <input
                    type="number"
                    min="1"
                    value={tempNextInvoiceNumber}
                    onChange={(e) => setTempNextInvoiceNumber(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">The next invoice created will use this number.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bill Template
                </label>
                <select
                  value={tempTemplate}
                  onChange={(e) => setTempTemplate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="standard">Standard (A4 Classic)</option>
                  <option value="modern">Modern (A4 Colored Header)</option>
                  <option value="minimalist">Minimalist (A4 Clean)</option>
                  <option value="professional">Professional (A4 Bordered)</option>
                  <option value="bold">Bold (A4 Dark Header)</option>
                  <option value="elegant">Elegant (A4 Centered)</option>
                  <option value="corporate">Corporate (A4 Detailed)</option>
                  <option value="compact">Compact (A5 Size)</option>
                  <option value="thermal80">Thermal Receipt (80mm)</option>
                  <option value="thermal58">Thermal Receipt (58mm)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Invoice Font
                  </label>
                  <select
                    value={tempFont}
                    onChange={(e) => setTempFont(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="helvetica">Helvetica (Modern)</option>
                    <option value="times">Times New Roman (Classic)</option>
                    <option value="courier">Courier (Monospace)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Logo Placement
                  </label>
                  <select
                    value={tempPlacement}
                    onChange={(e) => setTempPlacement(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="left">Left Aligned</option>
                    <option value="center">Center Aligned</option>
                    <option value="right">Right Aligned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Theme Color (For Modern/Bold templates)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={tempColor}
                    onChange={(e) => setTempColor(e.target.value)}
                    className="h-10 w-20 rounded cursor-pointer border border-gray-200 dark:border-gray-700"
                  />
                  <span className="text-sm text-gray-500 font-mono">{tempColor.toUpperCase()}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  UPI ID (For generating QR)
                </label>
                <input
                  type="text"
                  value={tempUpi}
                  onChange={(e) => setTempUpi(e.target.value)}
                  placeholder="e.g. yourname@upi"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Or Upload Custom QR Code Image
                </label>
                {tempQr ? (
                  <div className="relative inline-block mt-2">
                    <img src={tempQr} alt="Custom QR" className="w-32 h-32 object-contain border border-gray-200 dark:border-gray-700 rounded-lg" />
                    <button
                      onClick={() => setTempQr(null)}
                      className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span></p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">If uploaded, this image will be used instead of generating one from the UPI ID.</p>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Custom Fields Configuration
                </label>
                <div className="space-y-2">
                  {(['sales', 'purchases', 'inventory', 'parties', 'expenses'] as const).map(feature => (
                    <button
                      key={feature}
                      onClick={() => {
                        setCustomizeFeature(feature);
                        setIsCustomizeModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                    >
                      <span className="capitalize text-sm font-medium text-gray-700 dark:text-gray-300">{feature} Fields</span>
                      <Settings2 className="w-4 h-4 text-gray-500" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomizeFieldsModal
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        feature={customizeFeature}
      />
      <ReminderService />
    </div>
  );
}
