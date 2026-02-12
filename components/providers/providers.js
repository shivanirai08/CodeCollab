"use client";

import { Provider } from "react-redux";
import store from "@/store/store";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy load heavy components that aren't needed immediately
const ToastProvider = dynamic(() => import("./ToastProvider"), { 
  ssr: false,
  loading: () => null // Toast doesn't need a loading placeholder
});

const GlobalLoader = dynamic(() => import("@/components/ui/GlobalLoader"), { 
  ssr: false,
  loading: () => null
});

// Simple fallback component for provider errors
function ProviderErrorFallback() {
  return <>{children}</>;
}

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <Suspense fallback={null}>
        <GlobalLoader />
      </Suspense>
      {children}
      <Suspense fallback={null}>
        <ToastProvider />
      </Suspense>
    </Provider>
  );
}
