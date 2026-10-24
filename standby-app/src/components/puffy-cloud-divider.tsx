export function PuffyCloudDividerTop({
  fill = "#ffffff",
  className = "",
}: {
  fill?: string;
  className?: string;
}) {
  return (
    <div className={`w-full overflow-hidden leading-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-12 md:h-20 lg:h-28 preserve-3d"
        preserveAspectRatio="none"
      >
        <path
          d="M0,120 L0,70 C70,70 110,35 180,35 C250,35 290,65 360,65 C430,65 480,20 570,20 C660,20 710,55 790,55 C870,55 920,15 1010,15 C1100,15 1150,60 1230,60 C1310,60 1360,30 1440,30 L1440,120 Z"
          fill={fill}
        />
        <path
          d="M0,120 L0,85 C90,85 140,55 230,55 C320,55 370,80 460,80 C550,80 610,40 700,40 C790,40 850,75 940,75 C1030,75 1090,45 1180,45 C1270,45 1330,75 1440,75 L1440,120 Z"
          fill={fill}
          opacity="0.6"
        />
      </svg>
    </div>
  );
}

export function PuffyCloudDividerBottom({
  fill = "#ffffff",
  className = "",
}: {
  fill?: string;
  className?: string;
}) {
  return (
    <div className={`w-full overflow-hidden leading-none pointer-events-none rotate-180 ${className}`}>
      <svg
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-12 md:h-20 lg:h-28"
        preserveAspectRatio="none"
      >
        <path
          d="M0,120 L0,70 C70,70 110,35 180,35 C250,35 290,65 360,65 C430,65 480,20 570,20 C660,20 710,55 790,55 C870,55 920,15 1010,15 C1100,15 1150,60 1230,60 C1310,60 1360,30 1440,30 L1440,120 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
