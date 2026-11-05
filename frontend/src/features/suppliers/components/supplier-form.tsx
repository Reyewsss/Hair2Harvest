import { useState, type FormEvent } from "react";
import { FileText, LocateFixed, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button.tsx";
import {
  frequencyOptions,
  statusFromConsent,
  type PickupFrequency,
  type Supplier,
} from "../data/suppliers-data";
import { Field, StatusBadge, fieldClass } from "./supplier-shared.tsx";

const PHONE_RE = /^\d{11}$/;

export function SupplierForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Supplier;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [shopName, setShopName] = useState(initial?.shopName ?? "");
  const [ownerName, setOwnerName] = useState(initial?.ownerName ?? "");
  const [email, setEmail] = useState(initial?.email ?? ""); // 👈 Added
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [lat, setLat] = useState(
    initial?.lat !== undefined ? String(initial.lat) : "",
  );
  const [lng, setLng] = useState(
    initial?.lng !== undefined ? String(initial.lng) : "",
  );
  const [frequency, setFrequency] = useState<PickupFrequency>(
    initial?.frequency ?? "weekly",
  );
  const [windowStart, setWindowStart] = useState(
    initial?.windowStart ?? "20:00",
  );
  const [windowEnd, setWindowEnd] = useState(initial?.windowEnd ?? "22:00");
  const [accessNotes, setAccessNotes] = useState(initial?.accessNotes ?? "");

  const [submitted, setSubmitted] = useState(false);
  const [pinMessage, setPinMessage] = useState("");

  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [hasConsent, setHasConsent] = useState(
    initial?.consentParticipate ?? false,
  );

  const errors = {
    shopName: shopName.trim() ? "" : "Enter the shop name.",
    ownerName: ownerName.trim() ? "" : "Enter the owner's name.",
    email: email.trim() ? "" : "Enter an email address.", // 👈 Added
    phone: PHONE_RE.test(phone.trim())
      ? ""
      : "Phone number must be exactly 11 digits.",
    address: address.trim() ? "" : "Enter the street address.",
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : "");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPhone(digits);
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

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setPinMessage(
        "This device can't share its location. Type the coordinates instead.",
      );
      return;
    }
    setPinMessage("Finding location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(5));
        setLng(position.coords.longitude.toFixed(5));
        setPinMessage("Pin set to your current location.");
      },
      () =>
        setPinMessage(
          "Couldn't get the location. Allow access or type the coordinates.",
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);

    if (Object.values(errors).some(Boolean)) return;

    const formData = new FormData();
    // 👇 Aligned with backend expected fields
    formData.append("shopName", shopName.trim());
    formData.append("owner", ownerName.trim()); // Backend expects 'owner'
    formData.append("email", email.trim()); // Backend expects 'email'
    formData.append("phone", phone.trim());
    formData.append("address", address.trim());
    formData.append("pickupFrequency", frequency); // Backend expects 'pickupFrequency'
    formData.append("weeklyVolumeKg", "0"); // Backend expects this
    formData.append(
      "operatingHours",
      JSON.stringify({ days: "Mon-Sat", open: windowStart, close: windowEnd }),
    );

    if (consentFile) {
      formData.append("consentDocument", consentFile);
    }

    onSubmit(formData);
  };

  const input = (bad: string) =>
    `${fieldClass} ${bad ? "ring-2 ring-destructive/60" : ""}`;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 space-y-8 overflow-y-auto px-5 py-5">
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
            {show("shopName") ? (
              <span className="text-xs font-normal text-destructive">
                {show("shopName")}
              </span>
            ) : null}
          </Field>
          <Field label="Owner name">
            <input
              className={input(show("ownerName"))}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
            {show("ownerName") ? (
              <span className="text-xs font-normal text-destructive">
                {show("ownerName")}
              </span>
            ) : null}
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={input(show("email"))}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="shop@example.com"
            />
            {show("email") ? (
              <span className="text-xs font-normal text-destructive">
                {show("email")}
              </span>
            ) : null}
          </Field>
          <Field label="Phone number">
            <input
              type="tel"
              inputMode="numeric"
              className={input(show("phone"))}
              value={phone}
              onChange={handlePhoneChange}
              placeholder="09XX XXX XXXX"
              maxLength={11}
            />
            {show("phone") ? (
              <span className="text-xs font-normal text-destructive">
                {show("phone")}
              </span>
            ) : null}
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-semibold">Location</legend>
          <Field label="Address">
            <input
              className={input(show("address"))}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, building, unit"
            />
            {show("address") ? (
              <span className="text-xs font-normal text-destructive">
                {show("address")}
              </span>
            ) : null}
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Map pin{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                aria-label="Latitude"
                placeholder="Latitude"
                className={input("")}
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
              <input
                type="number"
                step="any"
                aria-label="Longitude"
                placeholder="Longitude"
                className={input("")}
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-9 gap-1.5"
                onClick={useMyLocation}
              >
                <LocateFixed className="size-4" />
                Use my location
              </Button>
              {lat || lng ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9"
                  onClick={() => {
                    setLat("");
                    setLng("");
                    setPinMessage("");
                  }}
                >
                  Clear pin
                </Button>
              ) : null}
            </div>
            {pinMessage ? (
              <p className="text-xs text-muted-foreground">{pinMessage}</p>
            ) : null}
          </div>
        </fieldset>

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

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-semibold">
            Consent and compliance
          </legend>
          <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
            <Upload className="mx-auto mb-2 size-6 text-muted-foreground" />
            <p className="mb-2 text-sm font-medium">
              Upload Signed Terms & Conditions (Optional)
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Upload the signed PDF to enroll the shop. Without it, the shop is
              saved as a Candidate.
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
        </fieldset>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Saves as{" "}
          <StatusBadge status={hasConsent ? "enrolled" : "candidate"} />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" className="h-10">
            {initial ? "Save changes" : "Register shop"}
          </Button>
        </div>
      </footer>
    </form>
  );
}
