const LOGO_URL = `${import.meta.env.BASE_URL}avatar_digitalpress.png`;

export default function DigitalPressBadge({ className = "" }) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 text-gray-400 ${className}`}
      aria-label="Desenvolvido por Digital Press BR"
    >
      <span className="text-[10px] font-medium leading-none whitespace-nowrap">Desenvolvido por Digital Press BR</span>
      <img
        src={LOGO_URL}
        alt="Digital Press BR"
        className="w-[18px] h-[18px] min-w-[18px] shrink-0 object-contain"
      />
    </div>
  );
}
