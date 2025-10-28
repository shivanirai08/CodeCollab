"use client";

import { Provider } from "react-redux";
import store from "@/store/store";
import ToastProvider from "./ToastProvider";

export default function Providers({ children }) {
  return <Provider store={store}>
            {children}
            <ToastProvider/>
        </Provider>;
}
