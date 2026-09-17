"use client";

import { useEffect, useState } from "react";
import TabShell from "@/components/TabShell";
import SupportTab from "@/components/tabs/SupportTab";
import { fetchMeta, type MetaResponse } from "@/lib/data";

export default function SupportPage() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => {});
  }, []);

  if (!meta) return <p className="p-6 text-[14px] text-[#808080]">Loading support…</p>;

  return (
    <TabShell farm={meta.farm} role={meta.role} active="support">
      <SupportTab />
    </TabShell>
  );
}
