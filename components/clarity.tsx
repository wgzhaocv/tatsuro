"use client";

import Clarity from "@microsoft/clarity";
import { useEffect } from "react";

// Microsoft Clarity project carried over from the old site — same ID, so the
// session history stays in one dashboard. Production only: dev sessions would
// pollute recordings and heatmaps.
const CLARITY_PROJECT_ID = "t1rn9uaxqm";

export function ClarityAnalytics() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") Clarity.init(CLARITY_PROJECT_ID);
  }, []);
  return null;
}
