"use client";

import { useEffect, useState } from "react";
import TabShell from "@/components/TabShell";
import SettingsTab from "@/components/tabs/SettingsTab";
import { fetchMeta, type MetaResponse } from "@/lib/data";

export default function SettingsPage() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => {});
  }, []);

  if (!meta) return <p className="p-6 text-[14px] text-[#808080]">Loading settings…</p>;

  return (
    <TabShell farm={meta.farm} role={meta.role} active="settings">
      <SettingsTab />
    </TabShell>
  );
}
