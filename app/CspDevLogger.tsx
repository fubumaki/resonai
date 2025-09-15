"use client";
import { useEffect } from "react";

export default function CspDevLogger() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const onCsp = (e: SecurityPolicyViolationEvent) => {
      // eslint-disable-next-line no-console
      console.warn("[CSP]", e.violatedDirective, "blocked", e.blockedURI);
    };
    window.addEventListener("securitypolicyviolation", onCsp as any);
    return () => window.removeEventListener("securitypolicyviolation", onCsp as any);
  }, []);
  return null;
}
