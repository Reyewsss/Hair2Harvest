import { useState, useEffect, type FormEvent } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
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
import { makePin } from "./map-pin";
import { geocodeStreet, PRECISION_LABEL, type GeocodeMatch } from "../geocode";

// 👇 Must NOT start with 0 — the +63 prefix already covers the country code.
const PH_LOCAL_DIGITS = /^[1-9]\d{9}$/;
const FIXED_BARANGAY = "Barangay Novaliches Proper";
const FALLBACK_CENTER: [number, number] = [14.7289, 121.0375];

const PHONE_PREFIX = "+63";

function localPart(phone: string | undefined): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function fullPhone(local: string): string {
  const digits = local.replace(/\D/g, "").slice(0, 10);
  return digits.length === 10 ? `${PHONE_PREFIX}${digits}` : "";
}

const pinIcon = makePin({ size: 34 });

// Moves the map to the pin whenever an address lookup (not the user) places it, so a found
// address is never off-screen. MapContainer's own `center` only applies on first render.
function RecenterOnLookup({ position, version }: { position: [number, number]; version: number }) {
  const map = useMap();
  useEffect(() => {
    if (version === 0) return;
    map.flyTo(position, Math.max(map.getZoom(), 17), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  return null;
}

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
  // 👇 Split names
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
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
  // A saved shop already has an exact pin; don't overwrite it with a lookup on open.
  // An approximate (fallback) pin isn't a real location, so look the street up again.
  const [pinMoved, setPinMoved] = useState(
    initial?.lat !== undefined && initial?.lng !== undefined && !initial?.pinApproximate,
  );
  // The map pin is optional: a shop can be saved without any map location.
  const [noPin, setNoPin] = useState(
    isEdit && !(Number.isFinite(initial?.lat) && Number.isFinite(initial?.lng)),
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const [matches, setMatches] = useState<GeocodeMatch[]>([]);
  const [chosen, setChosen] = useState<GeocodeMatch | null>(null);
  const [lookupVersion, setLookupVersion] = useState(0); // bumps → map flies to the pin

  const placeAt = (match: GeocodeMatch) => {
    setPinLat(match.lat);
    setPinLng(match.lng);
    setChosen(match);
    setLookupVersion((v) => v + 1);
  };

  // Look the street up (debounced; Nominatim allows ~1 request/second). Unit/floor isn't
  // part of the lookup, see geocode.ts.
  useEffect(() => {
    if (noPin || pinMoved || street.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const found = await geocodeStreet(street, controller.signal);
        setMatches(found);
        if (found.length) placeAt(found[0]);
        else setChosen(null);
      } catch {
        /* aborted or offline: keep whatever pin we had */
      } finally {
        if (!controller.signal.aborted) setGeoLoading(false);
      }
    }, 800);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [street, pinMoved, noPin]);

  const errors = {
    shopName: shopName.trim() ? "" : "Enter the shop name.",
    // 👇 New validations
    firstName: firstName.trim() ? "" : "Enter the first name.",
    lastName: lastName.trim() ? "" : "Enter the last name.",
    // Optional, but if something is typed it has to look like an email.
    email:
      !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? ""
        : "Enter a valid email address, or leave it blank.",
    phone: PH_LOCAL_DIGITS.test(phoneLocal)
      ? ""
      : "Enter 10 digits after +63, starting with 1–9 (e.g. 917 123 4567).",
    street: street.trim() ? "" : "Enter the street address.",
    consent:
      isEdit || hasConsent
        ? ""
        : "The shop must agree to the consent statement before registering.",
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : "");

  // 👇 Reject a leading 0 outright — the +63 prefix already covers it.
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    if (digits.startsWith("0")) return;
    setPhoneLocal(digits);
  };

  // 👇 Block "0" as the first character (mobile keyboards can bypass onChange).
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "0" &&
      phoneLocal.length === 0 &&
      e.currentTarget.selectionStart === 0 &&
      e.currentTarget.selectionEnd === 0
    ) {
      e.preventDefault();
    }
  };

  // 👇 Normalize pasted values: strip a leading "+63" or "0".
  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;

    let digits = pasted;
    if (digits.startsWith("63")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = digits.slice(1);

    // If it had a prefix, take over the paste and clean it up.
    if (digits !== pasted) {
      e.preventDefault();
      setPhoneLocal(digits.slice(0, 10));
    }
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
    // 👇 Send split names
    formData.append("firstName", firstName.trim());
    formData.append("lastName", lastName.trim());
    formData.append("email", email.trim());
    formData.append("phone", fullPhone(phoneLocal));
    formData.append("street", street.trim());
    if (unit.trim()) formData.append("unit", unit.trim());
    formData.append("pickupFrequency", frequency);
    formData.append("weeklyVolumeKg", "0");
    formData.append(
      "operatingHours",
      JSON.stringify({ days: "Mon-Sat", open: windowStart, close: windowEnd }),
    );

    if (noPin) {
      formData.append("noPin", "true");
    } else {
      formData.append("lat", String(pinLat));
      formData.append("lng", String(pinLng));
      // Send the pin the user saw whenever it's a real location: dragged/clicked, or
      // auto-located from the street. (Sending "false" for auto-located pins made the server
      // re-geocode with a worse query and drop most shops on one fallback point.)
      formData.append("pinManuallySet", String(pinMoved || !!chosen));
    }

    if (!isEdit) {
      formData.append("registrationSource", REGISTRATION_SOURCE.ADMIN);
      // For consent, we can use the combined name
      formData.append(
        "consentAgreedBy",
        `${firstName.trim()} ${lastName.trim()}`,
      );
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

            {/* 👇 Split owner name inputs */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <input
                  className={input(show("firstName"))}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Juan"
                />
                {show("firstName") && (
                  <span className="text-xs font-normal text-destructive">
                    {show("firstName")}
                  </span>
                )}
              </Field>
              <Field label="Last name">
                <input
                  className={input(show("lastName"))}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Dela Cruz"
                />
                {show("lastName") && (
                  <span className="text-xs font-normal text-destructive">
                    {show("lastName")}
                  </span>
                )}
              </Field>
            </div>

            <Field label="Email (optional)">
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
                  onKeyDown={handlePhoneKeyDown}
                  onPaste={handlePhonePaste}
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

          {/* Location (unchanged) */}
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
                // Not used for the map lookup (see geocode.ts), so editing it keeps the pin.
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. 2nd floor, Unit 3B"
              />
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Pin location</p>
                <span className="text-xs text-muted-foreground">
                  {noPin
                    ? "No pin"
                    : geoLoading
                    ? "Finding address..."
                    : pinMoved
                      ? "Custom pin"
                      : chosen
                        ? "Auto-located"
                        : street.trim()
                          ? "Address not found"
                          : "Enter a street"}
                </span>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={noPin}
                  onChange={(e) => setNoPin(e.target.checked)}
                />
                Don't set a map pin (optional)
              </label>
              {noPin ? (
                <p className="text-xs text-muted-foreground">
                  The shop is saved without a map location. You can add a pin later by editing it.
                </p>
              ) : (
              <>
              <p className="text-xs text-muted-foreground">
                Drag the pin or click anywhere on the map to set the exact spot.
                Use this when the auto-pin is off.
              </p>

              {!pinMoved && chosen ? (
                <p
                  className={
                    chosen.precision === "exact"
                      ? "rounded-md bg-success/10 px-2.5 py-1.5 text-xs text-success"
                      : "rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400"
                  }
                >
                  {PRECISION_LABEL[chosen.precision]}
                </p>
              ) : null}

              {!pinMoved && matches.length > 1 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Not the right place? Pick another match:
                  </p>
                  <div className="flex flex-col gap-1">
                    {matches.map((m) => {
                      const selected = chosen?.lat === m.lat && chosen?.lng === m.lng;
                      return (
                        <button
                          key={`${m.lat},${m.lng}`}
                          type="button"
                          onClick={() => placeAt(m)}
                          className={
                            "truncate rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors " +
                            (selected
                              ? "border-primary bg-primary/10 font-medium text-foreground"
                              : "hover:bg-secondary")
                          }
                          title={m.label}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

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
                  <RecenterOnLookup
                    position={[pinLat, pinLng]}
                    version={lookupVersion}
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
              </>
              )}
            </div>
          </fieldset>

          {/* Pickup rules (unchanged) */}
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

          {/* Consent (unchanged) */}
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
