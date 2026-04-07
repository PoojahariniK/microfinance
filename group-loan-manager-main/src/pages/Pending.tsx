import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, Calendar, Users, Info, RotateCcw, Filter, Search } from "lucide-react";
import { PaginationControls } from "@/components/PaginationControls";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PendingPaymentDto } from "@/types/loanTypes";

interface GroupData { id: number; groupName: string; }

export default function Pending() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [pendingList, setPendingList] = useState<PendingPaymentDto[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("ALL");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>("ALL");

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/groups?size=50`, {
        headers: { "loggedInUser": user.username }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.content !== undefined ? data.content : data);
      }
    } catch (e) {}
  }, [user, API_BASE]);

  const fetchPending = useCallback(async (p = page, s = pageSize) => {
    if (!user) return;
    setLoading(true);
    setError("");
    
    try {
      const gId = selectedGroupId !== "ALL" ? selectedGroupId : "";
      const tFilter = selectedTimeFilter !== "ALL" ? selectedTimeFilter : "";
      
      const res = await fetch(`${API_BASE}/api/payments/pending?groupId=${gId}&timeFilter=${tFilter}&page=${p}&size=${s}&search=${encodeURIComponent(search)}`, {
        headers: { "loggedInUser": user.username },
      });
      if (!res.ok) throw new Error("Failed to load pending payments");
      
      const data = await res.json();
      setPendingList(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err: any) {
      setError(err.message);
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  }, [user, API_BASE, page, pageSize, search, selectedGroupId, selectedTimeFilter]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Debounced search for Pending List
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleGroupChange = (val: string) => {
    setSelectedGroupId(val);
    setPage(0);
  };

  const handleTimeChange = (val: string) => {
    setSelectedTimeFilter(val);
    setPage(0);
  };

  const handleReset = () => {
    setSelectedGroupId("ALL");
    setSelectedTimeFilter("ALL");
    setSearch("");
    setPage(0);
  };

  const fetchAllForExport = async () => {
    if (!user) return [];
    try {
      const gId = selectedGroupId !== "ALL" ? selectedGroupId : "";
      const tFilter = selectedTimeFilter !== "ALL" ? selectedTimeFilter : "";
      const res = await fetch(`${API_BASE}/api/payments/pending/export?groupId=${gId}&timeFilter=${tFilter}&search=${encodeURIComponent(search)}`, {
        headers: { "loggedInUser": user.username }
      });
      if (!res.ok) throw new Error("Failed to fetch full list");
      return await res.json();
    } catch (e) {
      toast.error("Error fetching full dataset");
      return [];
    }
  };

  const handleExportCSV = async () => {
    toast.info("Preparing full CSV export...");
    const fullData = await fetchAllForExport();
    if (fullData.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const headers = ["Group Name", "Loan ID", "Installment No", "Due Date", "Total Members", "Paid Members", "Pending Members", "Status"];
    const rows = fullData.map((item: any) => [
      item.groupName,
      item.loanId,
      item.installmentNo,
      item.dueDate,
      item.totalMembers,
      item.paidMembers,
      item.pendingMembers,
      item.isOverdue ? "OVERDUE" : item.status
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "pending_list_complete.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Complete CSV export successful");
  };

  const handlePrint = async () => {
    toast.info("Preparing print preview...");
    const fullData = await fetchAllForExport();
    if (fullData.length === 0) {
      toast.error("No data available to print");
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please enable popups for printing");
      return;
    }
    
    const tableRows = fullData.map((item: any, idx: number) => `
      <tr>
        <td style="padding: 6px; text-align: center; border: 1px solid #000;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #000; font-weight: bold;">${item.groupName}</td>
        <td style="padding: 6px; border: 1px solid #000; text-align: center;">${item.loanId}</td>
        <td style="padding: 6px; border: 1px solid #000; text-align: center;">${item.installmentNo}</td>
        <td style="padding: 6px; border: 1px solid #000; text-align: center;">${item.dueDate}</td>
        <td style="padding: 6px; border: 1px solid #000; text-align: center;">${item.totalMembers}/${item.paidMembers}</td>
        <td style="padding: 6px; border: 1px solid #000; text-align: center; font-weight: bold;">${item.pendingMembers}</td>
        <td style="padding: 6px; border: 1px solid #000; text-align: center;">${item.isOverdue ? "OVERDUE" : item.status}</td>
      </tr>
    `).join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Pending Collection List (Complete)</title>
          <style>
            @media print { .no-print { display: none; } }
            body { font-family: sans-serif; font-size: 11px; color: #000; background: #fff; margin: 0; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { border: 1px solid #000; padding: 8px; background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; }
            h2 { text-align: center; margin-top: 0; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <h2>Pending Collection List (Filtered)</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Group</th>
                <th>Loan</th>
                <th>Installment</th>
                <th>Due Date</th>
                <th>Members (T/P)</th>
                <th>Pending</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCollect = (item: PendingPaymentDto) => {
    navigate(`/collection?groupId=${item.groupId}&loanId=${item.loanId}&installmentNo=${item.installmentNo}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Pending List
          </h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
            Global Installment Demand Matrix
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1 border-primary/20 hover:bg-primary/5 h-9 font-bold" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5 text-primary" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1 border-primary/20 hover:bg-primary/5 h-9 font-bold" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 text-primary" /> Print List
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white border border-border/50">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-wider">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by loan ID or group..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-9 h-10 bg-muted/20 border-none font-bold" 
              />
            </div>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-wider">Filter by Group</label>
            <Select value={selectedGroupId} onValueChange={handleGroupChange}>
              <SelectTrigger className="h-10 bg-muted/20 border-none font-bold">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-bold">All Groups</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={String(g.id)} className="font-medium">{g.groupName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-wider">Time Horizon</label>
            <Select value={selectedTimeFilter} onValueChange={handleTimeChange}>
              <SelectTrigger className="h-10 bg-muted/20 border-none font-bold">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-bold uppercase text-[10px]">All Time</SelectItem>
                <SelectItem value="OVERDUE" className="font-bold uppercase text-[10px] text-destructive">Overdue</SelectItem>
                <SelectItem value="THIS_WEEK" className="font-bold uppercase text-[10px]">This Week</SelectItem>
                <SelectItem value="THIS_MONTH" className="font-bold uppercase text-[10px]">This Month</SelectItem>
                <SelectItem value="UPCOMING" className="font-bold uppercase text-[10px]">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="ghost" 
            className="h-10 gap-2 font-bold uppercase text-[11px] text-muted-foreground hover:text-foreground"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </CardContent>
      </Card>

      <div className="bg-white rounded-xl shadow-md border border-border/50 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest animate-pulse">Loading Records...</p>
          </div>
        ) : pendingList.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground space-y-3">
             <Filter className="h-16 w-16 mx-auto opacity-5" />
             <p className="text-lg font-black uppercase text-foreground/40 tracking-tight">No pending collections found</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-border uppercase text-[10px] tracking-wider text-muted-foreground font-black">
                <th className="text-left p-4 w-12">#</th>
                <th className="text-left p-4">Group Name</th>
                <th className="text-center p-4">Loan ID</th>
                <th className="text-center p-4">Due #</th>
                <th className="text-left p-4">Due Date</th>
                <th className="text-center p-4">Members (T/P)</th>
                <th className="text-center p-4">Pending</th>
                <th className="text-center p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {pendingList.map((item, idx) => (
                <tr key={`${item.loanId}-${item.installmentNo}`} 
                    onClick={() => handleCollect(item)}
                    className={`transition-colors hover:bg-muted/10 cursor-pointer ${item.isOverdue ? 'bg-rose-50/40' : ''}`}>
                  <td className="p-4 text-muted-foreground font-mono">{(page * pageSize + idx + 1).toString().padStart(2, '0')}</td>
                  <td className="p-4 font-bold text-sm text-foreground uppercase tracking-tight">
                    {item.groupName}
                  </td>
                  <td className="p-4 text-center">
                     <Badge variant="outline" className="bg-muted/50 font-mono text-[10px] border-none shadow-none">#{item.loanId}</Badge>
                  </td>
                  <td className="p-4 text-center font-bold">
                     #{item.installmentNo}
                  </td>
                  <td className="p-4">
                     <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={`font-black ${item.isOverdue ? 'text-destructive' : 'text-foreground/70'}`}>
                           {item.dueDate}
                        </span>
                     </div>
                  </td>
                  <td className="p-4 text-center font-bold text-muted-foreground whitespace-nowrap">
                     <div className="flex items-center justify-center gap-1.5 bg-muted/20 py-1 px-2 rounded-full w-fit mx-auto">
                        <Users className="h-3 w-3" />
                        <span>{item.totalMembers}</span>
                        <span className="opacity-20">/</span>
                        <span className="text-emerald-600">{item.paidMembers}</span>
                     </div>
                  </td>
                  <td className="p-4 text-center">
                     <span className="text-xl font-black text-foreground tracking-tighter">{item.pendingMembers}</span>
                  </td>
                  <td className="p-4 text-center">
                     <Badge className={`uppercase text-[9px] font-black border-none px-2 py-0.5 shadow-sm ${
                        item.status === 'UNPAID' 
                          ? 'bg-rose-600 text-white' 
                          : 'bg-amber-400 text-black'
                     }`}>
                        {item.isOverdue ? 'OVERDUE' : item.status}
                     </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
         <Info className="h-5 w-5 text-primary mt-0.5" />
         <p className="text-[11px] text-primary/80 font-bold uppercase leading-relaxed">
            Note: This is a read-only operational overview. Rows highlighted in light red have exceeded their due date and require immediate physical verification. Click "Collect" to launch the settlement gateway for a specific installment.
         </p>
      </div>

      <PaginationControls
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={(p) => {
           setPage(p);
        }}
        onPageSizeChange={(s) => {
           setPageSize(s);
           setPage(0);
        }}
      />
    </div>
  );
}
