import Icon from "./Icon";

export default function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: string;
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ececec] bg-white p-5">
      <p className="flex items-center gap-2 text-[15px] font-medium text-black">
        <Icon name={icon} size={16} />
        {label}
      </p>
      <p className="mt-3 flex items-baseline gap-3 font-display">
        <span className="text-[36px] font-medium leading-none tracking-tight text-black sm:text-[48px]">
          {value}
        </span>
        {suffix && (
          <span className="text-[14px] font-normal text-[#808080]">{suffix}</span>
        )}
      </p>
    </div>
  );
}
