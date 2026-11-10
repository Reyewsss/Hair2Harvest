import { useState, useEffect } from "react";
import { CheckCircle2, Camera, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { pickupsApi } from "../suppliers-api";
import { SupplierLink } from "../components/supplier-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

export function PickupTrackingView() {
  const [activePickups, setActivePickups] = useState<any[]>([]);
  const [deliveredPickups, setDeliveredPickups] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadTracking = () => {
    const today = new Date().toISOString().slice(0,10);
    
    pickupsApi.getOldSchedule(today, "active").then(res => {
      setActivePickups(res.pickups);
    });

    pickupsApi.getOldSchedule(today, "past").then(res => {
      setDeliveredPickups(res.pickups);
    });
  };

  useEffect(() => {
    loadTracking();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    setProcessingId(id);
    try {
      let payload = {};
      if (status === "collected") {
        payload = { photoUrl: "https://example.com/mock.jpg", weightKg: 5, sacks: 2 }; 
      }

      await pickupsApi.updateStatus(id, status, payload);
      toast.success(`Marked as ${status}`);
      loadTracking(); 
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex w-full flex-col gap-8 p-6">
      <div className="space-y-2">
        <SupplierLink href="/suppliers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> All suppliers
        </SupplierLink>
        <h1 className="text-2xl font-semibold">Pickup Tracking</h1>
        <p className="text-muted-foreground">Update statuses as drivers collect and deliver.</p>
      </div>

      {/* Active Tracking Table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="font-semibold">Active Pickups</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead> {/* 👈 NEW */}
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activePickups.map((p) => (
              <TableRow key={p._id}>
                <TableCell className="font-medium">
                  {p.supplierId?.shopName || "Unknown"}
                </TableCell>
                <TableCell className="text-muted-foreground">{p.assignedTo?.name || "—"}</TableCell> {/* 👈 NEW */}
                <TableCell className="text-muted-foreground">
                  {p.supplierId?.street}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${p.status === 'scheduled' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>
                    {p.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {p.status === "scheduled" && (
                    <Button 
                      size="sm"
                      onClick={() => handleStatusUpdate(p._id, "collected")} 
                      disabled={processingId === p._id}
                    >
                      {processingId === p._id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Camera className="mr-2 size-4" />}
                      Collect
                    </Button>
                  )}
                  {p.status === "collected" && (
                    <Button 
                      size="sm"
                      onClick={() => handleStatusUpdate(p._id, "delivered")} 
                      disabled={processingId === p._id}
                      className="bg-success hover:bg-success/90 text-success-foreground"
                    >
                      {processingId === p._id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                      Deliver
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {activePickups.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No active pickups for today.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delivered History Table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="font-semibold">Delivered History</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead> {/* 👈 NEW */}
              <TableHead>Collected By</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveredPickups.map((p) => (
              <TableRow key={p._id}>
                <TableCell className="tabular-nums">{p.scheduledDate}</TableCell>
                <TableCell>{p.supplierId?.shopName || "Unknown"}</TableCell>
                <TableCell className="text-muted-foreground">{p.assignedTo?.name || "—"}</TableCell> {/* 👈 NEW */}
                <TableCell className="text-muted-foreground">{p.collectedBy?.name || "—"}</TableCell>
                <TableCell>
                  <span className="inline-flex rounded-full bg-success/20 text-success px-2 py-0.5 text-xs font-medium capitalize">
                    Delivered
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {deliveredPickups.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No delivered history yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}