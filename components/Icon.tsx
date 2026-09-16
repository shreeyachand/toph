import Image from "next/image";

export default function Icon({
  name,
  size = 16,
  className = "",
  alt,
}: {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt={alt ?? name}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
    />
  );
}
