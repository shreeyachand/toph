"use client";

import { useEffect, useState } from "react";
import TabShell from "@/components/TabShell";
import AuditTab from "@/components/tabs/AuditTab";
import { fetchMeta, type MetaResponse } from "@/lib/data";

export default function AuditPage() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => {});
  }, []);

  if (!meta) return <p className="p-6 text-[14px] text-[#808080]">Loading audit…</p>;

  return (
    <TabShell farm={meta.farm} role={meta.role} active="audit">
      <AuditTab />
    </TabShell>
  );
}
