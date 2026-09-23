"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Store } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";

interface StoreContextType {
  stores: Store[];
  activeStore: Store | null;
  isLoadingStores: boolean;
  setActiveStore: (store: Store) => void;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);
  const [isLoadingStores, setIsLoadingStores] = useState<boolean>(true);

  const refreshStores = useCallback(async () => {
    if (!token) {
      setStores([]);
      setActiveStoreState(null);
      setIsLoadingStores(false);
      return;
    }

    setIsLoadingStores(true);
    try {
      const data = await api.stores.list();
      const storeList = Array.isArray(data) ? data : [];
      setStores(storeList);

      const savedStoreId = localStorage.getItem("artha_active_store_id");
      if (savedStoreId && storeList.length > 0) {
        const found = storeList.find((s) => s.id === Number(savedStoreId));
        if (found) {
          setActiveStoreState(found);
        } else {
          setActiveStoreState(storeList[0]);
          localStorage.setItem("artha_active_store_id", storeList[0].id.toString());
        }
      } else if (storeList.length > 0) {
        setActiveStoreState(storeList[0]);
        localStorage.setItem("artha_active_store_id", storeList[0].id.toString());
      } else {
        setActiveStoreState(null);
      }
    } catch {
      setStores([]);
      setActiveStoreState(null);
    } finally {
      setIsLoadingStores(false);
    }
  }, [token]);

  useEffect(() => {
    let mounted = true;
    refreshStores().then(() => {
      if (!mounted) return;
    });
    return () => {
      mounted = false;
    };
  }, [refreshStores]);

  const setActiveStore = (store: Store) => {
    setActiveStoreState(store);
    localStorage.setItem("artha_active_store_id", store.id.toString());
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStore,
        isLoadingStores,
        setActiveStore,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
