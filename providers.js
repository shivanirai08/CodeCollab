"use client";

import { Provider } from "react-redux";
import store from "./store/store";
import { Toaster } from "sonner";

export default function Providers({ children }) {
  return <Provider store={store}>
            {children}
            <Toaster richColors position="top-right" />
        </Provider>;
}
