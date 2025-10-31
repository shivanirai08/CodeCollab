"use client";

import { Provider } from "react-redux";
import store from "@/store/store";
import ToastProvider from "./ToastProvider";
import GlobalLoader from "@/components/GlobalLoader";

export default function Providers({ children }) {
  return <Provider store={store}>
          <GlobalLoader />
            {children}
            <ToastProvider/>
        </Provider>;
}
