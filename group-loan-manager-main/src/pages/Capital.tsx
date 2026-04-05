import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, PlusCircle, Edit, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface CapitalLedger {
  id: number;
  amount: number;
  notes: string;
  entryDate: string;
  createdBy: string;
}

export default function Capital() {
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  
  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const [ledgers, setLedgers] = useState<CapitalLedger[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Add Form
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [entryDate, setEntryDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editEntryDate, setEditEntryDate] = useState("");

  const fetchLedgers = async () => {
    setFetching(true);
    try {
      const loggedInUser = user?.username || "admin";
      let url = `${API_BASE}/api/capital`;
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const res = await fetch(url, { headers: { "loggedInUser": loggedInUser } });
      if (!res.ok) throw new Error("Failed to fetch capital ledger.");
      
      const data = await res.json();
      setLedgers(data);
    } catch (err: any) {
      toast.error(err.message || "Error fetching records");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user?.role?.toUpperCase() === 'ADMIN') {
      fetchLedgers();
    }
  }, [user, startDate, endDate]);

  const handleAddSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = user?.username || "admin";
      const res = await fetch(`${API_BASE}/api/capital/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "loggedInUser": loggedInUser },
        body: JSON.stringify({
          amount: Number(amount),
          notes: notes,
          entryDate: new Date(entryDate).toISOString()
        })
      });

      if (!res.ok) throw new Error(await res.text() || "Failed to add capital");

      toast.success("Capital successfully infused!");
      setAmount("");
      setNotes("");
      setEntryDate(format(new Date(), 'yyyy-MM-dd'));
      fetchLedgers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = (item: CapitalLedger) => {
    setEditId(item.id);
    setEditAmount(item.amount.toString());
    setEditNotes(item.notes || "");
    setEditEntryDate(item.entryDate.substring(0, 10)); // YYYY-MM-DD
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editAmount || Number(editAmount) <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = user?.username || "admin";
      const res = await fetch(`${API_BASE}/api/capital/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "loggedInUser": loggedInUser },
        body: JSON.stringify({
          amount: Number(editAmount),
          notes: editNotes,
          entryDate: new Date(editEntryDate).toISOString()
        })
      });

      if (!res.ok) throw new Error(await res.text() || "Failed to update capital");

      toast.success("Capital record updated!");
      setEditOpen(false);
      fetchLedgers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role?.toUpperCase() !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-4">
          <Wallet className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access the Capital Vault.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-green-600" />
            Capital Vault
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage administrative platform funds and organizational liquidity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ADD CAPITAL FORM */}
        <div className="lg:col-span-1 border rounded-xl overflow-hidden bg-white shadow-sm h-fit">
          <div className="p-4 border-b bg-green-50/50">
            <h3 className="font-bold text-green-800 flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Vault Funds
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="font-bold text-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Entry Date</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Reference Note</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Angel round capital" className="text-sm resize-none" rows={3} />
            </div>
            <Button onClick={handleAddSubmit} disabled={loading} className="w-full font-bold bg-green-600 hover:bg-green-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Inject Capital
            </Button>
          </div>
        </div>

        {/* LEDGER LOG / TABLE */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border shadow-sm rounded-xl">
            <h3 className="font-bold text-slate-800">Ledger History</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-100 rounded-md p-1 px-3 border">
                <CalendarIcon className="w-4 h-4 text-slate-500" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="bg-transparent border-none text-sm w-[110px] focus:outline-none font-medium"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="bg-transparent border-none text-sm w-[110px] focus:outline-none font-medium"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              {fetching ? (
                <div className="p-10 flex justify-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : ledgers.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  No capital logs found for this date range.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold tracking-wider text-xs">ENTRY DATE</TableHead>
                      <TableHead className="font-bold tracking-wider text-xs text-right">AMOUNT (₹)</TableHead>
                      <TableHead className="font-bold tracking-wider text-xs">NOTES</TableHead>
                      <TableHead className="font-bold tracking-wider text-xs">AGENT</TableHead>
                      <TableHead className="font-bold tracking-wider text-xs text-right">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgers.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium">{format(new Date(item.entryDate), 'dd-MM-yyyy')}</TableCell>
                        <TableCell className="text-right font-bold text-green-700">₹{item.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-[200px] truncate" title={item.notes}>{item.notes || "-"}</TableCell>
                        <TableCell className="text-xs text-slate-500 uppercase">{item.createdBy}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditOpen(item)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL (Admin action inline overlay) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Capital Record</DialogTitle>
            <DialogDescription>Modifiers will securely impact dynamic balance sheet limits globally.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Adjust Amount (₹)</Label>
              <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Entry Date</Label>
              <Input type="date" value={editEntryDate} onChange={(e) => setEditEntryDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Update Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
