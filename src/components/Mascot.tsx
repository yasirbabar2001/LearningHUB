import mascot from "@/assets/abhi-mascot.png.asset.json";

/** Decorative ABHI Learning Hub mascot shown on every screen. */
export function Mascot() {
  return (
    <img
      src={mascot.url}
      alt=""
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 left-0 z-50 h-[11vh] w-[8vw] min-w-[55px] select-none object-contain object-bottom opacity-30 drop-shadow-lg"
    />
  );
}
