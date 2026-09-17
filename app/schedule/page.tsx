"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TabShell from "@/components/TabShell";
import ScheduleTab from "@/components/tabs/ScheduleTab";
import { fetchMeta, type MetaResponse } from "@/lib/data";

function ScheduleContent() {
  const searchParams = useSearchParams();
  const person = searchParams.get("person");
  const [meta, setMeta] = useState<MetaResponse | null>(null);

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => {});
  }, []);

  if (!meta) return <p className="p-6 text-[14px] text-[#808080]">Loading schedule…</p>;

  return (
    <TabShell farm={meta.farm} role={meta.role} active="schedule">
      <ScheduleTab key={person ?? "all"} initialPerson={person} />
    </TabShell>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<p className="p-6 text-[14px] text-[#808080]">Loading schedule…</p>}>
      <ScheduleContent />
    </Suspense>
  );
}
