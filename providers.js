"use client";

import { Provider } from "react-redux";
import store from "./store/store";
import TransitionProvider from "@/components/TransitionProvider";
import { Toaster } from "sonner";
import HydrateAuth from "./hydrate-auth";

export default function Providers({ children }) {
  return <Provider store={store}>
          {/* <TransitionProvider> */}
            <HydrateAuth />{children}
            <Toaster richColors position="top-right" />
          {/* </TransitionProvider> */}
        </Provider>;
}
