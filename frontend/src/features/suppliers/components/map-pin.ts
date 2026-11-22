import L from "leaflet";

/* One pin design for every map (contributors map, registration form, profile page).
 *
 * Accuracy: the SVG's tip is the very bottom-centre pixel of the icon, and iconAnchor is
 * exactly [width / 2, height], so the point of the pin sits on the coordinate at every
 * zoom level. (The old pin's tip sat ~3px above its anchor.) A soft ground shadow and,
 * for the focused pin, a pulse ring are drawn around that same point.
 */

export const PIN_COLORS = {
  enrolled: "#41431b", // dashboard olive (--primary)
  candidate: "#8a8d6c", // muted sage
} as const;

type PinOptions = {
  color?: string;
  /** Larger pin with a pulsing ring, for the selected shop. */
  focused?: boolean;
  /** Width in px; height follows the 40:52 shape. */
  size?: number;
  /** Location not confirmed: outlined pin with a "?" instead of a solid one. */
  approximate?: boolean;
};

export function makePin({ color = PIN_COLORS.enrolled, focused = false, size, approximate = false }: PinOptions = {}) {
  const w = size ?? (focused ? 38 : 30);
  const h = Math.round((w * 52) / 40);
  return L.divIcon({
    className: "h2h-pin",
    html: `
      <div style="position:relative;width:${w}px;height:${h}px">
        <span class="h2h-pin-shadow"></span>
        ${focused ? `<span class="h2h-pin-pulse" style="--pin-color:${color}"></span>` : ""}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="${w}" height="${h}"
          style="position:relative;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))">
          ${
            approximate
              ? `<path d="M20 2C10 2 2 10 2 20c0 14 18 30.5 18 30.5S38 34 38 20C38 10 30 2 20 2z"
                   fill="#fff" stroke="${color}" stroke-width="3" stroke-dasharray="5 3.5" stroke-linejoin="round"/>
                 <text x="20" y="26" text-anchor="middle" font-family="Poppins, sans-serif" font-size="17"
                   font-weight="700" fill="${color}">?</text>`
              : `<path d="M20 0C8.95 0 0 8.95 0 20c0 14.5 20 32 20 32s20-17.5 20-32C40 8.95 31.05 0 20 0z"
                   fill="${color}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
                 <circle cx="20" cy="19.5" r="7.5" fill="#fff"/>
                 <circle cx="20" cy="19.5" r="3.5" fill="${color}"/>`
          }
        </svg>
      </div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h], // the tip
    popupAnchor: [0, -h + 6],
    tooltipAnchor: [w / 2, -h / 2],
  });
}
