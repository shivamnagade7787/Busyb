import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

export interface Business {
  id: string;
  name: string;
  type?: string;
  gst?: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number';
}

export interface CustomFields {
  sales: CustomField[];
  purchases: CustomField[];
  inventory: CustomField[];
  parties: CustomField[];
  expenses: CustomField[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeBusiness: string;
  setActiveBusiness: (biz: string) => void;
  businesses: Business[];
  addBusiness: (biz: Omit<Business, 'id'>) => Promise<void>;
  upiId: string;
  setUpiId: (id: string) => void;
  qrCodeImage: string | null;
  setQrCodeImage: (img: string | null) => void;
  billTemplate: string;
  setBillTemplate: (template: string) => void;
  invoiceFont: string;
  setInvoiceFont: (font: string) => void;
  invoiceColor: string;
  setInvoiceColor: (color: string) => void;
  logoPlacement: string;
  setLogoPlacement: (placement: string) => void;
  customFields: CustomFields;
  updateCustomFields: (feature: keyof CustomFields, fields: CustomField[]) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  activeBusiness: 'Business 1',
  setActiveBusiness: () => {},
  businesses: [],
  addBusiness: async () => {},
  upiId: '',
  setUpiId: () => {},
  qrCodeImage: null,
  setQrCodeImage: () => {},
  billTemplate: 'standard',
  setBillTemplate: () => {},
  invoiceFont: 'helvetica',
  setInvoiceFont: () => {},
  invoiceColor: '#2563eb',
  setInvoiceColor: () => {},
  logoPlacement: 'left',
  setLogoPlacement: () => {},
  customFields: { sales: [], purchases: [], inventory: [], parties: [], expenses: [] },
  updateCustomFields: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBusiness, setActiveBusinessState] = useState('Business 1');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [upiId, setUpiIdState] = useState('');
  const [qrCodeImage, setQrCodeImageState] = useState<string | null>(null);
  const [billTemplate, setBillTemplateState] = useState('standard');
  const [invoiceFont, setInvoiceFontState] = useState('helvetica');
  const [invoiceColor, setInvoiceColorState] = useState('#2563eb');
  const [logoPlacement, setLogoPlacementState] = useState('left');
  const [customFields, setCustomFields] = useState<CustomFields>({
    sales: [], purchases: [], inventory: [], parties: [], expenses: []
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const savedBiz = localStorage.getItem('smartvyapaar_business');
    if (savedBiz) setActiveBusinessState(savedBiz);

    // Fetch businesses from Firestore
    const q = query(collection(db, 'businesses'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bizData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
      if (bizData.length === 0) {
        // Add default business if none exists
        const defaultBiz = { name: 'Business 1', userId: user.uid };
        addDoc(collection(db, 'businesses'), defaultBiz);
      } else {
        setBusinesses(bizData);
        // If active business is not in the list, set to the first one
        if (savedBiz && !bizData.find(b => b.name === savedBiz)) {
          setActiveBusinessState(bizData[0].name);
          localStorage.setItem('smartvyapaar_business', bizData[0].name);
        } else if (!savedBiz) {
          setActiveBusinessState(bizData[0].name);
          localStorage.setItem('smartvyapaar_business', bizData[0].name);
        }
      }
    });

    const savedUpi = localStorage.getItem('smartvyapaar_upi');
    if (savedUpi) setUpiIdState(savedUpi);
    
    const savedQr = localStorage.getItem('smartvyapaar_qr');
    if (savedQr) setQrCodeImageState(savedQr);
    
    const savedTemplate = localStorage.getItem('smartvyapaar_template');
    if (savedTemplate) setBillTemplateState(savedTemplate);

    const savedFont = localStorage.getItem('smartvyapaar_font');
    if (savedFont) setInvoiceFontState(savedFont);

    const savedColor = localStorage.getItem('smartvyapaar_color');
    if (savedColor) setInvoiceColorState(savedColor);

    const savedPlacement = localStorage.getItem('smartvyapaar_placement');
    if (savedPlacement) setLogoPlacementState(savedPlacement);

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user && activeBusiness) {
      const docRef = doc(db, 'businessSettings', `${user.uid}_${activeBusiness}`);
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.customFields) {
            setCustomFields(data.customFields);
          } else {
            setCustomFields({ sales: [], purchases: [], inventory: [], parties: [], expenses: [] });
          }
        } else {
          setCustomFields({ sales: [], purchases: [], inventory: [], parties: [], expenses: [] });
        }
      });
      return () => unsub();
    }
  }, [user, activeBusiness]);

  const setActiveBusiness = (biz: string) => {
    setActiveBusinessState(biz);
    localStorage.setItem('smartvyapaar_business', biz);
  };

  const setUpiId = (id: string) => {
    setUpiIdState(id);
    localStorage.setItem('smartvyapaar_upi', id);
  };

  const setQrCodeImage = (img: string | null) => {
    setQrCodeImageState(img);
    if (img) {
      localStorage.setItem('smartvyapaar_qr', img);
    } else {
      localStorage.removeItem('smartvyapaar_qr');
    }
  };

  const setBillTemplate = (template: string) => {
    setBillTemplateState(template);
    localStorage.setItem('smartvyapaar_template', template);
  };

  const setInvoiceFont = (font: string) => {
    setInvoiceFontState(font);
    localStorage.setItem('smartvyapaar_font', font);
  };

  const setInvoiceColor = (color: string) => {
    setInvoiceColorState(color);
    localStorage.setItem('smartvyapaar_color', color);
  };

  const setLogoPlacement = (placement: string) => {
    setLogoPlacementState(placement);
    localStorage.setItem('smartvyapaar_placement', placement);
  };

  const addBusiness = async (biz: Omit<Business, 'id'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'businesses'), {
        ...biz,
        userId: user.uid
      });
    } catch (error) {
      console.error("Error adding business: ", error);
    }
  };

  const updateCustomFields = async (feature: keyof CustomFields, fields: CustomField[]) => {
    if (!user) return;
    const docRef = doc(db, 'businessSettings', `${user.uid}_${activeBusiness}`);
    await setDoc(docRef, {
      customFields: {
        ...customFields,
        [feature]: fields
      }
    }, { merge: true });
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      activeBusiness, 
      setActiveBusiness,
      businesses,
      addBusiness,
      upiId, 
      setUpiId,
      qrCodeImage,
      setQrCodeImage,
      billTemplate,
      setBillTemplate,
      invoiceFont,
      setInvoiceFont,
      invoiceColor,
      setInvoiceColor,
      logoPlacement,
      setLogoPlacement,
      customFields,
      updateCustomFields,
      logout
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
