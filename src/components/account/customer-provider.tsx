'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  CustomerApiError,
  customerError,
  customerFetch,
  customerUserSchema,
  type CustomerUser,
} from '@/lib/customer-client';

type CustomerState = {
  user: CustomerUser | null;
  status: 'loading' | 'anonymous' | 'authenticated' | 'error';
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<CustomerState | null>(null);
export function useCustomer() {
  const value = useContext(Context);
  if (!value) throw new Error('CustomerProvider manquant');
  return value;
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [status, setStatus] = useState<CustomerState['status']>('loading');
  const [error, setError] = useState('');
  const revision = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const clear = useCallback(() => {
    revision.current += 1;
    setUser(null);
    setStatus('anonymous');
    setError('');
    window.dispatchEvent(new Event('gainde-customer-private-cleared'));
  }, []);
  const refresh = useCallback(async () => {
    const request = ++revision.current;
    setError('');
    try {
      const response = await customerFetch<{ user: CustomerUser }>('auth/me');
      const next = customerUserSchema.parse(response.user);
      if (request !== revision.current) return;
      setUser(next);
      setStatus('authenticated');
    } catch (error) {
      if (request !== revision.current) return;
      setUser(null);
      window.dispatchEvent(new Event('gainde-customer-private-cleared'));
      if (error instanceof CustomerApiError && error.status === 401) setStatus('anonymous');
      else {
        setStatus('error');
        setError(customerError(error));
      }
    }
  }, []);
  const logout = useCallback(async () => {
    await customerFetch('auth/logout', { method: 'POST', body: '{}' });
    clear();
    channel.current?.postMessage('changed');
  }, [clear]);
  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    function expired() {
      clear();
    }
    function changed() {
      clear();
      void refresh();
      channel.current?.postMessage('changed');
    }
    function visible() {
      if (document.visibilityState === 'visible') void refresh();
    }
    window.addEventListener('gainde-customer-expired', expired);
    window.addEventListener('gainde-customer-changed', changed);
    document.addEventListener('visibilitychange', visible);
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('gainde-customer-session');
      channel.current.onmessage = () => {
        clear();
        void refresh();
      };
    }
    return () => {
      revision.current += 1;
      window.clearTimeout(initial);
      window.removeEventListener('gainde-customer-expired', expired);
      window.removeEventListener('gainde-customer-changed', changed);
      document.removeEventListener('visibilitychange', visible);
      channel.current?.close();
      channel.current = null;
    };
  }, [clear, refresh]);
  return (
    <Context.Provider value={{ user, status, error, refresh, logout }}>{children}</Context.Provider>
  );
}
