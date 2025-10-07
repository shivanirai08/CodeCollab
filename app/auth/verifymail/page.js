import { Suspense } from "react";
import VerifyMailPage from "./verfiyMailPage";

// This makes the route dynamic removing pre-rendering of the page
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center text-gray-400 p-6">Loading...</div>}>
      <VerifyMailPage />
    </Suspense>
  );
}