import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDj0dnSq3hN2O6aDBcxcZETMOeS2aNXo4A",
  authDomain: "terrabyte-auth.firebaseapp.com",
  projectId: "terrabyte-auth",
  storageBucket: "terrabyte-auth.firebasestorage.app",
  messagingSenderId: "800612470562",
  appId: "1:800612470562:web:0c0f4ef261431d2df85f7b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'farmer' | 'expert' | 'agri_vendor' | 'hardware_vendor';
  phone?: string;
  isApproved?: boolean;
  aadhar?: string;
  landSize?: number;
  qualifications?: string;
  companyName?: string;
  address?: string;
}


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<{success: boolean, error?: string}>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            
            // Check if user is approved (except farmers who are auto-approved)
            if (userData.role !== 'farmer' && !userData.isApproved) {
              await auth.signOut();
              setUser(null);
              setIsAuthenticated(false);
              return;
            }
            
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            await auth.signOut();
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          await auth.signOut();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Set persistence based on rememberMe
      await setPersistence(
        auth, 
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        
        // Check if user is approved (except farmers who are auto-approved)
        if (userData.role !== 'farmer' && !userData.isApproved) {
          await auth.signOut();
          throw new Error('Your account is pending approval');
        }
        
        setUser(userData);
        setIsAuthenticated(true);
        return true;
      }
      
      await auth.signOut();
      throw new Error('User data not found');
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any): Promise<{success: boolean, error?: string}> => {
    try {
      setIsLoading(true);
      
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      // Create user document in Firestore
      const newUser: User = {
        id: userCredential.user.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        isApproved: userData.role === 'farmer', // Auto-approve farmers
        address: userData.address,
        ...(userData.role === 'farmer' && {
          aadhar: userData.aadhar,
          landSize: userData.landSize
        }),
        ...(userData.role === 'expert' && {
          qualifications: userData.qualifications
        }),
        ...((userData.role === 'agri_vendor' || userData.role === 'hardware_vendor') && {
          companyName: userData.companyName
        })
      };
      
      await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
      
      // Set user in state (but don't set as authenticated if not approved)
      setUser(newUser);
      setIsAuthenticated(newUser.isApproved || newUser.role === 'farmer');
      
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use. Please use a different email.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading,
      login, 
      logout, 
      register 
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 