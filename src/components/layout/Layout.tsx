import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, ShoppingCart, Users, Package, FileText, LogOut, Wallet, Store, ChevronDown } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export default function Layout() {
  const navigate = useNavigate();
  const { activeBusiness, setActiveBusiness } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: ShoppingCart, label: 'Sales', path: '/sales' },
    { icon: Wallet, label: 'Expenses', path: '/expenses' },
    { icon: Package, label: 'Items', path: '/inventory' },
    { icon: Users, label: 'Parties', path: '/parties' },
    { icon: FileText, label: 'Reports', path: '/reports' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex flex-col w-[10vw] min-w-[48px] md:w-16 hover:w-[60vw] md:hover:w-64 group transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 h-full overflow-hidden shrink-0">
        <div className="p-2 md:p-4 border-b border-gray-200 dark:border-gray-700 relative group/biz cursor-pointer flex items-center justify-center md:justify-start">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0 mx-auto md:mx-0">
              <Store className="w-4 h-4 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity flex-1 flex items-center justify-between w-0 group-hover:w-auto">
              <div>
                <h1 className="text-sm font-bold text-gray-900 dark:text-white">{activeBusiness}</h1>
                <p className="text-[10px] text-gray-500">Switch Business</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          {/* Business Dropdown */}
          <div className="absolute left-full top-4 ml-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover/biz:opacity-100 group-hover/biz:visible transition-all z-50">
            <div className="p-2">
              <button 
                onClick={() => setActiveBusiness('Business 1')} 
                className={cn("w-full text-left px-4 py-2 rounded-lg text-sm transition-colors", activeBusiness === 'Business 1' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700')}
              >
                Business 1
              </button>
              <button 
                onClick={() => setActiveBusiness('Business 2')} 
                className={cn("w-full text-left px-4 py-2 rounded-lg text-sm transition-colors mt-1", activeBusiness === 'Business 2' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700')}
              >
                Business 2
              </button>
            </div>
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
            onClick={handleLogout}
            className="flex items-center gap-3 p-2 md:p-3 w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors whitespace-nowrap overflow-hidden"
          >
            <div className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 shrink-0 mx-auto md:mx-0">
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">SmartVyapaar</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
