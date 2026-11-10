import { useState, useEffect, type FormEvent } from "react";
import { FileText, Loader2, MapPin, Upload } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button.tsx";
import {
  frequencyOptions,
  statusFromConsent,
  type PickupFrequency,
  type Supplier,
} from "../data/suppliers-data";
import { REGISTRATION_SOURCE, CONSENT_VERSION } from "../registration-source";
import { Field, StatusBadge, fieldClass } from "./supplier-shared.tsx";

// 👇 PH phone: 10 digits after the +63 prefix (e.g. 917 123 4567)
const PH_LOCAL_DIGITS = /^\d{10}$/;

const FIXED_BARANGAY = "Barangay Novaliches Proper";
const FALLBACK_CENTER: [number, number] = [14.7289, 121.0375];

/* --------------------------------------------------------------
   Phone helpers
   - Internally we store the full value: "+639171234567"
   - For display in the input, we strip the "+63" and show "9171234567"
   - On submit, we prepend "+63" back
   -------------------------------------------------------------- */

const PHONE_PREFIX = "+63";

/** Extract the 10-digit local part from any stored format */
function localPart(phone: string | undefined): string {
  if (!phone) return "";
  // Strip everything except digits
  let digits = phone.replace(/\D/g, "");
  // If it already starts with 63 (from a prior save), drop the 63
  if (digits.startsWith("63")) digits = digits.slice(2);
  // If it starts with a leading 0 (legacy format), drop the 0
  if (digits.startsWith("0")) digits = digits.slice(1);
  // Keep at most 10 digits
  return digits.slice(0, 10);
}

/** Combine "+63" with the 10-digit local part → "+639171234567" */
function fullPhone(local: string): string {
  const digits = local.replace(/\D/g, "").slice(0, 10);
  return digits.length === 10 ? `${PHONE_PREFIX}${digits}` : "";
}

/* --------------------------------------------------------------
   Custom pin icon
   -------------------------------------------------------------- */

const pinIcon = L.divIcon({
  className: "",
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      width="32" height="32" fill="currentColor"
      style="color:var(--primary, #2563eb);
             filter: drop-shadow(0 1px 2px rgba(0,0,0,.35));">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>
    </svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function ClickableMarker({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return (
    <Marker
      position={position}
      icon={pinIcon}
      draggable
      eventHandlers={{
        dragend(event) {
          const { lat, lng } = event.target.getLatLng();
          onChange(lat, lng);
        },
      }}
    />
  );
}

export function SupplierForm({
  initial,
  onSubmit,
  onCancel,
  busy = false,
}: {
  initial?: Supplier;
  onSubmit: (formData: FormData) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}) {
  const isEdit = !!initial;
  const [shopName, setShopName] = useState(initial?.shopName ?? "");
  const [ownerName, setOwnerName] = useState(initial?.ownerName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  // 👇 store only the 10-digit local part in state
  const [phoneLocal, setPhoneLocal] = useState(localPart(initial?.phone));
  const [street, setStreet] = useState(initial?.street ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [frequency, setFrequency] = useState<PickupFrequency>(
    initial?.frequency ?? "weekly",
  );
  const [windowStart, setWindowStart] = useState(
    initial?.windowStart ?? "20:00",
  );
  const [windowEnd, setWindowEnd] = useState(initial?.windowEnd ?? "22:00");
  const [accessNotes, setAccessNotes] = useState(initial?.accessNotes ?? "");

  const [submitted, setSubmitted] = useState(false);
  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [hasConsent, setHasConsent] = useState(
    initial?.consentParticipate ?? false,
  );

  const [pinLat, setPinLat] = useState<number>(
    initial?.lat ?? FALLBACK_CENTER[0],
  );
  const [pinLng, setPinLng] = useState<number>(
    initial?.lng ?? FALLBACK_CENTER[1],
  );
  const [pinMoved, setPinMoved] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (!street.trim()) return;
    if (pinMoved) return;

    const timer = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const q = [unit, street, FIXED_BARANGAY, "Quezon City", "Philippines"]
          .filter(Boolean)
          .join(", ");
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=ph`,
          { headers: { "User-Agent": "Hair2Harvest/1.0" } },
        );
        const data = await res.json();
        if (data.length) {
          setPinLat(parseFloat(data[0].lat));
          setPinLng(parseFloat(data[0].lon));
        }
      } catch {
        /* keep whatever pin we had */
      } finally {
        setGeoLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [street, unit, pinMoved]);

  const errors = {
    shopName: shopName.trim() ? "" : "Enter the shop name.",
    ownerName: ownerName.trim() ? "" : "Enter the owner's name.",
    email: email.trim() ? "" : "Enter an email address.",
    phone: PH_LOCAL_DIGITS.test(phoneLocal)
      ? ""
      : "Enter 10 digits after +63 (e.g. 917 123 4567).",
    street: street.trim() ? "" : "Enter the street address.",
    consent:
      isEdit || hasConsent
        ? ""
        : "The shop must agree to the consent statement before registering.",
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : "");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only digits, max 10 characters
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhoneLocal(digits);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file.");
        return;
      }
      setConsentFile(file);
      setHasConsent(true);
    }
  };

  const handlePinChange = (lat: number, lng: number) => {
    setPinLat(lat);
    setPinLng(lng);
    setPinMoved(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;

    const formData = new FormData();
    formData.append("shopName", shopName.trim());
    formData.append("owner", ownerName.trim());
    formData.append("email", email.trim());
    formData.append("phone", fullPhone(phoneLocal)); // 👈 "+639171234567"
    formData.append("street", street.trim());
    if (unit.trim()) formData.append("unit", unit.trim());
    formData.append("pickupFrequency", frequency);
    formData.append("weeklyVolumeKg", "0");
    formData.append(
      "operatingHours",
      JSON.stringify({ days: "Mon-Sat", open: windowStart, close: windowEnd }),
    );

    formData.append("lat", String(pinLat));
    formData.append("lng", String(pinLng));
    formData.append("pinManuallySet", String(pinMoved));

    if (!isEdit) {
      formData.append("registrationSource", REGISTRATION_SOURCE.ADMIN);
      formData.append("consentAgreedBy", ownerName.trim());
      formData.append("consentVersion", CONSENT_VERSION);
    }
    if (consentFile) formData.append("consentDocument", consentFile);

    await onSubmit(formData);
  };

  const input = (bad: string) =>
    `${fieldClass} ${bad ? "ring-2 ring-destructive/60" : ""}`;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      aria-busy={busy}
    >
      <fieldset disabled={busy} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto px-5 py-5">
          {/* Basic info */}
          <fieldset className="space-y-4">
            <legend className="mb-1 text-sm font-semibold">Basic info</legend>
            <Field label="Shop name">
              <input
                autoFocus
                className={input(show("shopName"))}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Studio Cut Barbers"
              />
              {show("shopName") && (
                <span className="text-xs font-normal text-destructive">
                  {show("shopName")}
                </span>
              )}
            </Field>
            <Field label="Owner name">
              <input
                className={input(show("ownerName"))}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
              {show("ownerName") && (
                <span className="text-xs font-normal text-destructive">
                  {show("ownerName")}
                </span>
              )}
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={input(show("email"))}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shop@example.com"
              />
              {show("email") && (
                <span className="text-xs font-normal text-destructive">
                  {show("email")}
                </span>
              )}
            </Field>

            {/* 👇 Phone input with locked +63 prefix */}
            <Field label="Phone number">
              <div
                className={`${input(show("phone"))} flex items-center gap-2 px-0`}
              >
                <span className="shrink-0 select-none border-r border-border/60 pl-3 pr-2 text-sm font-medium tabular-nums text-muted-foreground">
                  +63
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="h-full w-full bg-transparent py-2 pr-3 text-sm outline-none placeholder:text-muted-foreground"
                  value={phoneLocal}
                  onChange={handlePhoneChange}
                  placeholder="917 123 4567"
                  maxLength={10}
                />
              </div>
              {show("phone") && (
                <span className="text-xs font-normal text-destructive">
                  {show("phone")}
                </span>
              )}
              <p className="text-xs text-muted-foreground">
                Enter 10 digits without the leading 0 (e.g. 917 123 4567).
              </p>
            </Field>
          </fieldset>

          {/* Location + interactive map */}
          <fieldset className="space-y-4">
            <legend className="mb-1 text-sm font-semibold">Location</legend>

            <Field label="Barangay">
              <input
                value={FIXED_BARANGAY}
                readOnly
                className={`${fieldClass} cursor-not-allowed bg-muted/50`}
              />
              <p className="text-xs text-muted-foreground">
                Fixed — all shops must be in this barangay.
              </p>
            </Field>

            <Field label="Street">
              <input
                className={input(show("street"))}
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  setPinMoved(false);
                }}
                placeholder="e.g. 12 Aurora Blvd"
              />
              {show("street") && (
                <span className="text-xs font-normal text-destructive">
                  {show("street")}
                </span>
              )}
            </Field>

            <Field label="Unit / Floor (optional)">
              <input
                className={fieldClass}
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setPinMoved(false);
                }}
                placeholder="e.g. 2nd floor, Unit 3B"
              />
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Pin location</p>
                <span className="text-xs text-muted-foreground">
                  {geoLoading
                    ? "Finding address..."
                    : pinMoved
                      ? "Custom pin"
                      : "Auto-located"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Drag the pin or click anywhere on the map to set the exact spot.
                Use this when the auto-pin is off.
              </p>

              <div className="h-64 overflow-hidden rounded-lg border">
                <MapContainer
                  center={[pinLat, pinLng]}
                  zoom={pinMoved ? 18 : 16}
                  scrollWheelZoom
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <ClickableMarker
                    position={[pinLat, pinLng]}
                    onChange={handlePinChange}
                  />
                </MapContainer>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {pinLat.toFixed(5)}, {pinLng.toFixed(5)}
                </span>
                {pinMoved && (
                  <button
                    type="button"
                    onClick={() => setPinMoved(false)}
                    className="text-primary hover:underline"
                  >
                    Reset to auto-pin
                  </button>
                )}
              </div>
            </div>
          </fieldset>

          {/* Pickup rules */}
          <fieldset className="space-y-4">
            <legend className="mb-1 text-sm font-semibold">Pickup rules</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Frequency">
                <select
                  className={fieldClass}
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as PickupFrequency)
                  }
                >
                  {frequencyOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Starts">
                  <input
                    type="time"
                    required
                    className={fieldClass}
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                  />
                </Field>
                <Field label="Ends">
                  <input
                    type="time"
                    required
                    className={fieldClass}
                    value={windowEnd}
                    onChange={(e) => setWindowEnd(e.target.value)}
                  />
                </Field>
              </div>
            </div>
            <Field label="Access notes">
              <textarea
                rows={3}
                className="w-full rounded-lg border-none bg-secondary px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
                placeholder='e.g. "Ask the guard for the key"'
              />
            </Field>
          </fieldset>

          {/* Consent (only on create) */}
          {!isEdit && (
            <fieldset className="space-y-4">
              <legend className="mb-1 text-sm font-semibold">
                Consent and compliance
              </legend>
              <div className="rounded-lg bg-secondary/50 p-4 text-sm">
                <p className="font-medium">
                  Consent statement (v{CONSENT_VERSION})
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  The shop owner agrees to contribute hair and fur waste to
                  Hair2Harvest for composting research, subject to pickup
                  scheduling and material verification.
                </p>
              </div>
              <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
                <Upload className="mx-auto mb-2 size-6 text-muted-foreground" />
                <p className="mb-1 text-sm font-medium">
                  Upload the signed consent PDF
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Required for admin registration. Without it, the record cannot
                  be saved.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  id="consent-upload"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {consentFile ? (
                  <div className="flex items-center justify-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                    <FileText className="size-4" />
                    <span className="truncate max-w-[200px]">
                      {consentFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setConsentFile(null);
                        setHasConsent(false);
                      }}
                      className="ml-2 text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      document.getElementById("consent-upload")?.click()
                    }
                  >
                    Choose PDF File
                  </Button>
                )}
              </div>
              {show("consent") && (
                <p className="text-xs text-destructive">{show("consent")}</p>
              )}
            </fieldset>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isEdit ? (
              "Edit mode"
            ) : (
              <>
                Saves as <StatusBadge status={statusFromConsent(hasConsent)} />
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 min-w-[120px]"
              disabled={busy}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {initial
                ? busy
                  ? "Saving..."
                  : "Save changes"
                : busy
                  ? "Registering..."
                  : "Register shop"}
            </Button>
          </div>
        </footer>
      </fieldset>
    </form>
  );
}
