import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, AlertCircle, PlayCircle, Loader2, Calendar, Users, Info, RotateCcw, Filter } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PendingPaymentDto } from "@/types/loanTypes";

interface GroupData { id: number; groupName: string; }

export default function Pending() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [pendingList, setPendingList] = useState<PendingPaymentDto[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  // Filters
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    fetchPendingList();
  }, [selectedGroup, selectedTimeFilter]);

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/groups`, {
        headers: { "loggedInUser": user?.username || "" }
      });
      if (res.ok) {
        setGroups(await res.json());
      }
    } catch (e) {}
  };

  const fetchPendingList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedGroup !== "ALL") params.append("groupId", selectedGroup);
      if (selectedTimeFilter !== "ALL") params.append("timeFilter", selectedTimeFilter);

      const res = await fetch(`${API_BASE}/api/payments/pending?${params.toString()}`, {
        headers: { "loggedInUser": user?.username || "" }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingList(data);
      } else {
        toast.error("Failed to load pending payments");
      }
    } catch (error) {
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedGroup("ALL");
    setSelectedTimeFilter("ALL");
  };

  const handleExportCSV = () => {
    if (pendingList.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const headers = ["Group Name", "Loan ID", "Installment No", "Due Date", "Total Members", "Paid Members", "Pending Members", "Status"];
    const rows = pendingList.map(item => [
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
    link.setAttribute("download", "pending_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export successful");
  };

  const handlePrint = () => {
    if (pendingList.length === 0) {
      toast.error("No data available to print");
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please enable popups for printing");
      return;
    }
    
    const tableRows = pendingList.map((item, idx) => `
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
          <title>Pending Collection List</title>
          <style>
            @media print { .no-print { display: none; } }
            body { font-family: sans-serif; font-size: 11px; color: #000; background: #fff; margin: 0; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { border: 1px solid #000; padding: 8px; background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; }
            h2 { text-align: center; margin-top: 0; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <h2>Pending Collection List</h2>
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
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
<h2 className="text-xl font-bold tracking-tight flex items-center gap-2">            <Calendar className="h-5 w-5 text-primary" />
            Pending List
          </h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
            Global Installment Demand Matrix
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1 border-primary/20 hover:bg-primary/5 h-9 font-bold" onClick={handleExportCSV} disabled={pendingList.length === 0}>
            <Download className="h-3.5 w-3.5 text-primary" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1 border-primary/20 hover:bg-primary/5 h-9 font-bold" onClick={handlePrint} disabled={pendingList.length === 0}>
            <Printer className="h-3.5 w-3.5 text-primary" /> Print List
          </Button>
        </div>
      </div>

      {/* FILTER UI */}
      <Card className="border-none shadow-sm bg-white border border-border/50">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-wider">Filter by Group</label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
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
            <Select value={selectedTimeFilter} onValueChange={setSelectedTimeFilter}>
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

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl shadow-md border border-border/50 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest animate-pulse">Filtering Records...</p>
          </div>
        ) : pendingList.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground space-y-3">
             <Filter className="h-16 w-16 mx-auto opacity-5" />
             <p className="text-lg font-black uppercase text-foreground/40 tracking-tight">No pending collections for selected filters</p>
             <p className="text-xs max-w-xs mx-auto font-medium">Try adjusting your filters or time horizon to expand the search results.</p>
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
                  <td className="p-4 text-muted-foreground font-mono">{(idx + 1).toString().padStart(2, '0')}</td>
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
    </div>
  );
}
