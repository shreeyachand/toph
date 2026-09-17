"use client";

import { useEffect, useState } from "react";
import TabShell from "@/components/TabShell";
import EmployeesTab from "@/components/tabs/EmployeesTab";
import { fetchMeta, type MetaResponse } from "@/lib/data";

export default function EmployeesPage() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => {});
  }, []);

  if (!meta) return <p className="p-6 text-[14px] text-[#808080]">Loading employees…</p>;

  return (
    <TabShell farm={meta.farm} role={meta.role} active="employees">
      <EmployeesTab />
    </TabShell>
  );
}
