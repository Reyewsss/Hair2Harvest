// Re-locates contributor shops whose map pin is the old fallback point (every shop that the
// previous geocoder couldn't place was saved at the same barangay-centre coordinates).
//
//   npm run fix:pins            dry run: shows what would change, writes nothing
//   npm run fix:pins -- --apply writes the new pins
//
// Shops that still can't be found keep the centre point but are flagged pinApproximate,
// so the app labels them "approximate" and staff can drag the pin in Edit Details.
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Supplier from "../modules/suppliers/supplierModel.js";
import { geocodeAddress, isFallbackPin } from "../modules/suppliers/utils/geocode.js";

const apply = process.argv.includes("--apply");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await connectDB();
  const all = await Supplier.find({}).select("code shopName street unit lat lng pinApproximate");
  const stuck = all.filter((s) => s.lat == null || s.lng == null || isFallbackPin(s.lat, s.lng));
  console.log(`${all.length} shops, ${stuck.length} on the fallback point or without a pin.${apply ? "" : " (dry run)"}\n`);

  let found = 0;
  for (const s of stuck) {
    const geo = await geocodeAddress({ street: s.street });
    const label = `${s.code} ${s.shopName} — "${s.street ?? ""}"`;
    if (geo.approximate) {
      console.log(`  ✗ ${label}: not found, flagged approximate`);
    } else {
      found += 1;
      console.log(`  ✓ ${label}: ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`);
    }
    if (apply) {
      await Supplier.updateOne(
        { _id: s._id },
        { $set: { lat: geo.lat, lng: geo.lng, pinApproximate: Boolean(geo.approximate) } },
      );
    }
    await sleep(1100); // Nominatim allows ~1 request per second
  }

  console.log(`\n${found} re-located, ${stuck.length - found} still approximate.`);
  if (!apply && stuck.length) console.log("Nothing was written. Run with --apply to save these pins.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
