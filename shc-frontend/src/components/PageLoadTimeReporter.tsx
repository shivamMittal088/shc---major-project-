"use client";

import { useEffect } from "react";

const PAGE_LOAD_TIME_STORAGE_KEY = "shc-page-load-times";

type PageLoadTimeReporterProps = {
  pathname: string;
  label: string;
};

export default function PageLoadTimeReporter({
  pathname,
  label,
}: PageLoadTimeReporterProps) {
  useEffect(() => {
    try {
      const currentValue = window.localStorage.getItem(PAGE_LOAD_TIME_STORAGE_KEY);
      const parsedValue = currentValue ? JSON.parse(currentValue) : {};
      const nextValue = {
        ...parsedValue,
        [pathname]: label,
      };

      window.localStorage.setItem(
        PAGE_LOAD_TIME_STORAGE_KEY,
        JSON.stringify(nextValue)
      );

      window.dispatchEvent(new CustomEvent("shc:page-load-time-updated"));
    } catch {
      // Ignore storage failures; timing is best-effort only.
    }
  }, [label, pathname]);

  return null;
}