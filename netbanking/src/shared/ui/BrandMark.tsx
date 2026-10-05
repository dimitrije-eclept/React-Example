/** "N" tile plus the product name, on dark surfaces (sidebar, sign-in aside). */
export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 text-[17px] font-bold whitespace-nowrap text-white">
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-mint text-[15px] font-bold text-night"
      >
        N
      </span>
      Netbanking
    </div>
  );
}
