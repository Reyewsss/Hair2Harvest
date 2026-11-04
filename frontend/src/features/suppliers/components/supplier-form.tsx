import { useState, type FormEvent } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/shared/ui/button.tsx";
import { TODAY } from "@/features/inventory/data/inventory-data";
import {
  frequencyOptions,
  statusFromConsent,
  type PickupFrequency,
  type Supplier,
  type SupplierInput,
} from "../data/suppliers-data";
import { Field, StatusBadge, fieldClass } from "./supplier-shared.tsx";

// The on-site "2-minute form", also used for Edit Details.
// There are intentionally no username or password fields: shops never log in.
const PHONE_RE = /^[+\d][\d\s()-]{6,}$/;

export function SupplierForm({
  initial,
  barangays,
  onSubmit,
  onCancel,
}: {
  initial?: Supplier;
  barangays: string[];
  onSubmit: (values: SupplierInput) => void;
  onCancel: () => void;
}) {
  const [shopName, setShopName] = useState(initial?.shopName ?? "");
  const [ownerName, setOwnerName] = useState(initial?.ownerName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [barangay, setBarangay] = useState(initial?.barangay ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [lat, setLat] = useState(initial?.lat !== undefined ? String(initial.lat) : "");
  const [lng, setLng] = useState(initial?.lng !== undefined ? String(initial.lng) : "");
  const [frequency, setFrequency] = useState<PickupFrequency>(initial?.frequency ?? "weekly");
  const [windowStart, setWindowStart] = useState(initial?.windowStart ?? "20:00");
  const [windowEnd, setWindowEnd] = useState(initial?.windowEnd ?? "22:00");
  const [accessNotes, setAccessNotes] = useState(initial?.accessNotes ?? "");
  const [consentParticipate, setConsentParticipate] = useState(initial?.consentParticipate ?? false);
  const [consentPhotos, setConsentPhotos] = useState(initial?.consentPhotos ?? false);
  const [consentDate, setConsentDate] = useState(initial?.consentDate || TODAY);
  const [submitted, setSubmitted] = useState(false);
  const [pinMessage, setPinMessage] = useState("");

  const latNum = lat.trim() === "" ? undefined : Number(lat);
  const lngNum = lng.trim() === "" ? undefined : Number(lng);

  const errors = {
    shopName: shopName.trim() ? "" : "Enter the shop name.",
    ownerName: ownerName.trim() ? "" : "Enter the owner's name.",
    phone: PHONE_RE.test(phone.trim()) ? "" : "Enter a valid phone number.",
    barangay: barangay.trim() ? "" : "Enter the barangay.",
    address: address.trim() ? "" : "Enter the street address.",
    pin:
      (latNum === undefined) !== (lngNum === undefined)
        ? "Enter both latitude and longitude, or leave both empty."
        : (latNum !== undefined && (Number.isNaN(latNum) || latNum < -90 || latNum > 90)) ||
            (lngNum !== undefined && (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180))
          ? "Coordinates are out of range."
          : "",
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : "");

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setPinMessage("This device can't share its location. Type the coordinates instead.");
      return;
    }
    setPinMessage("Finding location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(5));
        setLng(position.coords.longitude.toFixed(5));
        setPinMessage("Pin set to your current location.");
      },
      () => setPinMessage("Couldn't get the location. Allow access or type the coordinates."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    onSubmit({
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      barangay: barangay.trim(),
      address: address.trim(),
      lat: latNum,
      lng: lngNum,
      frequency,
      windowStart,
      windowEnd,
      accessNotes: accessNotes.trim(),
      consentParticipate,
      consentPhotos,
      consentDate,
    });
  };

  const input = (bad: string) => `${fieldClass} ${bad ? "ring-2 ring-destructive/60" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-8 overflow-y-auto px-5 py-5">
        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-semibold">Basic info</legend>
          <Field label="Shop name">
            <input autoFocus className={input(show("shopName"))} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Studio Cut Barbers" />
            {show("shopName") ? <span className="text-xs font-normal text-destructive">{show("shopName")}</span> : null}
          </Field>
          <Field label="Owner name">
            <input className={input(show("ownerName"))} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            {show("ownerName") ? <span className="text-xs font-normal text-destructive">{show("ownerName")}</span> : null}
          </Field>
          <Field label="Phone number">
            <input type="tel" inputMode="tel" className={input(show("phone"))} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XX XXX XXXX" />
            {show("phone") ? <span className="text-xs font-normal text-destructive">{show("phone")}</span> : null}
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-semibold">Location</legend>
          <Field label="Barangay">
            <input list="barangay-options" className={input(show("barangay"))} value={barangay} onChange={(e) => setBarangay(e.target.value)} />
            <datalist id="barangay-options">
              {barangays.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            {show("barangay") ? <span className="text-xs font-normal text-destructive">{show("barangay")}</span> : null}
          </Field>
          <Field label="Address">
            <input className={input(show("address"))} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, building, unit" />
            {show("address") ? <span className="text-xs font-normal text-destructive">{show("address")}</span> : null}
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Map pin <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="any" aria-label="Latitude" placeholder="Latitude" className={input(show("pin"))} value={lat} onChange={(e) => setLat(e.target.value)} />
              <input type="number" step="any" aria-label="Longitude" placeholder="Longitude" className={input(show("pin"))} value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" className="h-9 gap-1.5" onClick={useMyLocation}>
                <LocateFixed className="size-4" />
                Use my location
              </Button>
              {lat || lng ? (
                <Button type="button" variant="ghost" className="h-9" onClick={() => { setLat(""); setLng(""); setPinMessage(""); }}>
                  Clear pin
                </Button>
              ) : null}
            </div>
            {show("pin") ? <p className="text-xs text-destructive">{show("pin")}</p> : pinMessage ? <p className="text-xs text-muted-foreground">{pinMessage}</p> : null}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-semibold">Pickup rules</legend>
          <Field label="Frequency">
            <select className={fieldClass} value={frequency} onChange={(e) => setFrequency(e.target.value as PickupFrequency)}>
              {frequencyOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Window starts">
              <input type="time" required className={fieldClass} value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
            </Field>
            <Field label="Window ends">
              <input type="time" required className={fieldClass} value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
            </Field>
          </div>
          <Field label="Access notes">
            <textarea rows={3} className="w-full rounded-lg border-none bg-secondary px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30" value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} placeholder='e.g. "Ask the guard for the key"' />
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-semibold">Consent and compliance</legend>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={consentParticipate} onChange={(e) => setConsentParticipate(e.target.checked)} />
            <span>
              Shop consents to participate.
              <span className="block text-xs text-muted-foreground">Without this the shop is saved as a Candidate.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={consentPhotos} onChange={(e) => setConsentPhotos(e.target.checked)} />
            <span>Shop consents to photos being taken.</span>
          </label>
          <Field label="Consent date">
            <input type="date" className={fieldClass} value={consentDate} onChange={(e) => setConsentDate(e.target.value)} />
          </Field>
        </fieldset>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Saves as <StatusBadge status={statusFromConsent(consentParticipate)} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-10" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="h-10">{initial ? "Save changes" : "Register shop"}</Button>
        </div>
      </footer>
    </form>
  );
}