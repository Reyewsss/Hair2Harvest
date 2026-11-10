import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarPlus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Field, fieldClass } from "@/features/inventory/components/inventory-shared";
import { useSuppliers } from "../store/suppliers-store";
import { pickupsApi, staffApi } from "../suppliers-api"; // 👈 Import staffApi
import { SupplierLink } from "../components/supplier-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

export function PickupScheduleView() {
  const { suppliers } = useSuppliers();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activePickups, setActivePickups] = useState<any[]>([]);
  const [pastPickups, setPastPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 👇 NEW: Staff list state
  const [staffList, setStaffList] = useState<any[]>([]);

  const [selectedShop, setSelectedShop] = useState("");
  const [assignedTo, setAssignedTo] = useState(""); // 👈 NEW
  const [time, setTime] = useState("20:00");
  const [frequency, setFrequency] = useState("weekly");

  // 👇 NEW: Fetch staff list on mount
  useEffect(() => {
    staffApi.list()
      .then(setStaffList)
      .catch((err) => toast.error("Failed to load staff list"));
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const activeData = await pickupsApi.getOldSchedule(date, "active");
      setActivePickups(activeData.pickups);
      
      const pastData = await pickupsApi.getOldSchedule("", "past");
      setPastPickups(pastData.pickups);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedule();
  }, [date]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return toast.error("Select a shop");
    
    try {
      await pickupsApi.schedule({ 
        supplierId: selectedShop, 
        date, 
        time, 
        frequency,
        assignedTo: assignedTo || undefined // 👈 Pass staff ID
      });
      toast.success("Pickup scheduled & SMS sent");
      setSelectedShop("");
      setAssignedTo("");
      void loadSchedule();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const enrolledShops = suppliers.filter((s) => s.status === "enrolled");

  return (
    <div className="flex flex-col w-full gap-8 p-6">
      <div className="space-y-2">
        <SupplierLink href="/suppliers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> All suppliers
        </SupplierLink>
        <h1 className="text-2xl font-semibold">Collection Scheduling</h1>
        <p className="text-muted-foreground">Plan routes, assign staff, and notify shops via SMS.</p>
      </div>

      <form onSubmit={handleSchedule} className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-5">
        <div className="flex-1 min-w-[200px]">
          <Field label="Select Shop">
            <select className={fieldClass} value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)} required>
              <option value="">-- Choose --</option>
              {enrolledShops.map((s) => (
                <option key={s.id} value={s.id}>{s.shopName} ({s.street})</option>
              ))}
            </select>
          </Field>
        </div>
        
        {/* 👇 NEW: Staff Selector */}
        <div className="w-48">
          <Field label="Assign Staff">
            <select className={fieldClass} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">-- Unassigned --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="w-40">
          <Field label="Date">
            <input type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
        </div>
        <div className="w-32">
          <Field label="Time">
            <input type="time" className={fieldClass} value={time} onChange={(e) => setTime(e.target.value)} required />
          </Field>
        </div>
        <div className="w-40">
          <Field label="Frequency">
            <select className={fieldClass} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="none">Manual</option>
              <option value="daily">Daily</option>
              <option value="twice-weekly">Twice Weekly</option>
              <option value="weekly">Weekly</option>
            </select>
          </Field>
        </div>
        <Button type="submit" className="h-10 gap-2"><CalendarPlus className="size-4" /> Schedule & Notify</Button>
      </form>

      {/* Active Route */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="font-semibold">Route for {date}</h2>
          <p className="text-sm text-muted-foreground">{activePickups.length} scheduled</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead> 
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-6">Loading...</TableCell></TableRow>
            ) : activePickups.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No pickups scheduled for this day.</TableCell></TableRow>
            ) : (
              activePickups.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium tabular-nums">{p.scheduledTime}</TableCell>
                  <TableCell>{p.supplierId?.shopName || "Unknown"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.assignedTo?.name || "—"}</TableCell> 
                  <TableCell className="text-muted-foreground">{p.supplierId?.phone}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize">
                      {p.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Past Records */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="font-semibold">Old Records</h2>
          <p className="text-sm text-muted-foreground">Past pickups</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead> 
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pastPickups.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No old records found.</TableCell></TableRow>
            ) : (
              pastPickups.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="tabular-nums">{p.scheduledDate}</TableCell>
                  <TableCell>{p.supplierId?.shopName || "Unknown"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.assignedTo?.name || "—"}</TableCell> 
                  <TableCell className="tabular-nums">{p.scheduledTime}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${p.status === 'delivered' ? 'bg-success/20 text-success' : 'bg-secondary'}`}>
                      {p.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}