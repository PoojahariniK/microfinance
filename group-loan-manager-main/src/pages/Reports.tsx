import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Printer, Users, FileText, Banknote, AlertCircle, TrendingUp, History, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { exportToCSV, exportToPDF } from "@/lib/reportExportUtils";
import { Input } from "@/components/ui/input";

// --- Types ---
interface Member { id: number; name: string; }
interface Group { id: number; groupName: string; }

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("member");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Filter States
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  // Initial Data
  useEffect(() => {
    fetchMembers();
    fetchGroups();
  }, []);

  // Fetch Report when Tab or Filter changes
  useEffect(() => {
    setReportData(null); // Clear data when switching tabs or filters to avoid rendering stale data
    fetchActiveReport();
  }, [activeTab, selectedMember, selectedGroup, selectedDate]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/members`, {
        headers: { "loggedInUser": user?.username || "" }
      });
      if (res.ok) setMembers(await res.json());
    } catch (e) {}
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/groups`, {
        headers: { "loggedInUser": user?.username || "" }
      });
      if (res.ok) setGroups(await res.json());
    } catch (e) {}
  };

  const fetchActiveReport = async () => {
    if (!activeTab) return;
    
    // Validate required filters per tab
    if (activeTab === "member" && !selectedMember) return;
    if ((activeTab === "group" || activeTab === "pending" || activeTab === "loan-history") && !selectedGroup) return;

    setLoading(true);
    try {
      let url = "";
      switch (activeTab) {
        case "member":
          url = `${API_BASE}/api/reports/member/${selectedMember}`;
          break;
        case "group":
          url = selectedGroup === "ALL" 
            ? `${API_BASE}/api/reports/groups`
            : `${API_BASE}/api/reports/group/${selectedGroup}`;
          break;
        case "due":
          url = `${API_BASE}/api/reports/due-wise?date=${selectedDate}`;
          break;
        case "interest":
          url = `${API_BASE}/api/reports/interest`;
          break;
        case "pending":
          url = `${API_BASE}/api/reports/pending?groupId=${selectedGroup}`;
          break;
        case "loan-history":
          url = `${API_BASE}/api/reports/loan-history?groupId=${selectedGroup}`;
          break;
        case "pnl":
          url = `${API_BASE}/api/reports/pnl`;
          break;
      }

      if (url) {
        const res = await fetch(url, {
          headers: { "loggedInUser": user?.username || "" }
        });
        if (res.ok) {
          const data = await res.json();
          setReportData(data);
        }
      }
    } catch (error) {
      toast.error("Error fetching report");
    } finally {
      setLoading(false);
    }
  };

  // --- Export Handlers ---

  const handleCSV = () => {
    if (!reportData) return;
    let dataToExport: any[] = [];
    let filename = `${activeTab}_report.csv`;

    switch (activeTab) {
      case "member":
        dataToExport = reportData.loans || [];
        break;
      case "due":
        dataToExport = reportData.members || [];
        break;
      case "interest":
      case "pnl":
        dataToExport = [reportData];
        break;
      case "group":
        dataToExport = Array.isArray(reportData) ? reportData : [reportData];
        break;
      case "pending":
      case "loan-history":
        dataToExport = reportData;
        break;
    }

    if (dataToExport.length === 0) {
      toast.error("No data available to export");
      return;
    }
    exportToCSV(dataToExport, filename);
  };

  const handlePDF = () => {
    if (!reportData) return;
    let title = `${activeTab.replace("-", " ").toUpperCase()} REPORT`;
    let subtitle = "";
    let headers: string[] = [];
    let rows: any[][] = [];

    const format = (val: any) => (val || 0).toLocaleString();

    switch (activeTab) {
      case "member":
        subtitle = `Member: ${reportData.memberName || "N/A"} | Total Loan: ₹${format(reportData.totalLoan)} | Paid: ₹${format(reportData.paid)} | Pending: ₹${format(reportData.pending)}`;
        headers = ["Loan ID", "Paid (₹)", "Pending (₹)"];
        rows = (reportData.loans || []).map((l: any) => [l.loanId, format(l.paid), format(l.pending)]);
        break;
      case "group":
        if (Array.isArray(reportData)) {
          subtitle = "Consolidated Groups Report";
          headers = ["Group", "Members", "Loan (₹)", "Collected (₹)", "Pending (₹)"];
          rows = reportData.map(g => [g.groupName, g.memberCount, format(g.totalLoan), format(g.collection), format(g.pending)]);
        } else {
          subtitle = `Group: ${reportData.groupName || "N/A"} | Members: ${reportData.memberCount || 0}`;
          headers = ["Field", "Value"];
          rows = [
            ["Total Loan", `₹${format(reportData.totalLoan)}`],
            ["Collection", `₹${format(reportData.collection)}`],
            ["Pending", `₹${format(reportData.pending)}`],
          ];
        }
        break;
      case "due":
        subtitle = `Date: ${selectedDate} | Total Due: ₹${format(reportData.totalDue)} | Collected: ₹${format(reportData.totalCollected)} | Pending: ₹${format(reportData.pending)}`;
        headers = ["Member", "Due #", "Paid (₹)", "Status"];
        rows = (reportData.members || []).map((m: any) => [m.memberName, m.dueNumber, format(m.paidAmount), m.status]);
        break;
      case "pending":
        subtitle = `Group: ${selectedGroup === 'ALL' ? 'All Groups' : selectedGroup}`;
        headers = ["Member", "Pending Dues", "Total Pending (₹)"];
        rows = (reportData || []).map((p: any) => [p.memberName, p.overdueCount, format(p.pendingAmount)]);
        break;
      case "loan-history":
        subtitle = `Group: ${selectedGroup === 'ALL' ? 'All Groups' : selectedGroup}`;
        headers = ["Loan ID", "Status", "Start", "End", "Total (₹)", "Collected (₹)", "Pending (₹)"];
        rows = (reportData || []).map((l: any) => [l.loanId, l.status, l.startDate, l.endDate, format(l.totalLoan), format(l.collected), format(l.pending)]);
        break;
      case "interest":
// ... lines continue ...
// No changes needed for interest/pnl so skipping
        subtitle = "Global Interest Summary";
        headers = ["Description", "Amount"];
        rows = [["Total Interest Collected", `₹${format(reportData.totalInterestCollected)}`]];
        break;
      case "pnl":
        subtitle = "P&L Statement";
        headers = ["Category", "Amount"];
        rows = [
          ["Interest Income", `₹${format(reportData.interestIncome)}`],
          ["Fine Collection", `₹${format(reportData.fineCollection)}`],
          ["Insurance Fees", `₹${format(reportData.insuranceFees)}`],
          ["Total Revenue", `₹${format(reportData.totalRevenue)}`],
          ["Total Loan Disbursed", `₹${format(reportData.totalLoanDisbursed)}`],
          ["Total Collection", `₹${format(reportData.totalCollection)}`],
          ["Pending Amount", `₹${format(reportData.pendingAmount)}`],
        ];
        break;
    }

    exportToPDF(title, subtitle, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Financial Reports</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Audit-Ready Ledger Systems</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 font-bold" onClick={handleCSV} disabled={!reportData}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2 font-bold border-primary/20 hover:bg-primary/5" onClick={handlePDF} disabled={!reportData}>
            <Printer className="h-3.5 w-3.5 text-primary" /> Print Report
          </Button>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(val) => {
          setActiveTab(val);
          setReportData(null); // Reset data immediately to prevent rendering incompatible state
        }} 
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full bg-muted/30 p-1 h-auto items-stretch">
          {[
            { id: "member", label: "Member", icon: Users },
            { id: "group", label: "Group", icon: FileText },
            { id: "due", label: "Due-wise", icon: Banknote },
            { id: "interest", label: "Interest", icon: TrendingUp },
            { id: "pending", label: "Pending", icon: AlertCircle },
            { id: "loan-history", label: "History", icon: History },
            { id: "pnl", label: "P&L", icon: FileText },
          ].map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="text-[10px] uppercase font-black py-2 gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <tab.icon className="h-3 w-3" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Dynamic Content Rendering */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden min-h-[400px]">
          
          {/* TAB FILTERS */}
          <div className="p-4 border-b border-border/50 bg-gray-50/50 flex flex-wrap gap-4 items-end">
            {activeTab === "member" && (
              <div className="w-[300px]">
                <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block">Select Member</label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="h-9 bg-white font-bold"><SelectValue placeholder="Choose Member" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(activeTab === "group" || activeTab === "pending" || activeTab === "loan-history") && (
              <div className="w-[300px]">
                <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block">Select Group</label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="h-9 bg-white font-bold"><SelectValue placeholder="Choose Group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Groups (Consolidated)</SelectItem>
                    {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.groupName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeTab === "due" && (
              <div className="w-[200px]">
                <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block">Report Date</label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9 bg-white font-bold" />
              </div>
            )}
          </div>

          {/* DATA TABLE */}
          <div className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Compiling Data...</p>
              </div>
            ) : !reportData ? (
              <div className="text-center py-24 space-y-3 opacity-30">
                <FileText className="h-16 w-16 mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest">No data available for selected filters</p>
              </div>
            ) : (
              <RenderReportData activeTab={activeTab} data={reportData} />
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function RenderReportData({ activeTab, data }: { activeTab: string; data: any }) {
  const format = (val: any) => (val || 0).toLocaleString();

  // Defensive check: If data and activeTab are out of sync, return null
  // This happens briefly during tab switching
  // Note: 'group' tab can be an array (All Groups) or an object (Single Group)
  const isArrayTab = ["pending", "loan-history"].includes(activeTab) || (activeTab === "group" && Array.isArray(data));
  
  if (["pending", "loan-history"].includes(activeTab) && !Array.isArray(data)) return null;
  if (["interest", "pnl", "member", "due"].includes(activeTab) && Array.isArray(data)) return null;
  if (activeTab === "group" && !data) return null; // Group can be either, just check for null

  switch (activeTab) {
    case "member":
      if (!data || !data.loans) return null;
      return (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-none shadow-none"><CardContent className="p-4"><p className="text-[10px] font-bold text-primary uppercase mb-1">Total Loan</p><span className="text-2xl font-black">₹{format(data.totalLoan)}</span></CardContent></Card>
            <Card className="bg-emerald-50 border-none shadow-none"><CardContent className="p-4"><p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Amount Paid</p><span className="text-2xl font-black">₹{format(data.paid)}</span></CardContent></Card>
            <Card className="bg-rose-50 border-none shadow-none"><CardContent className="p-4"><p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Balance Due</p><span className="text-2xl font-black">₹{format(data.pending)}</span></CardContent></Card>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-[10px] uppercase font-black text-muted-foreground bg-muted/20">
                <th className="text-left p-4">Loan ID</th>
                <th className="text-right p-4">Paid (₹)</th>
                <th className="text-right p-4">Pending (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.loans.map((l: any) => (
                <tr key={l.loanId} className="border-b transition-colors hover:bg-muted/10">
                  <td className="p-4 font-bold">#{l.loanId}</td>
                  <td className="p-4 text-right">₹{format(l.paid)}</td>
                  <td className="p-4 text-right text-destructive font-bold">₹{format(l.pending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "group":
      if (Array.isArray(data)) {
        return (
          <div className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-[10px] uppercase font-black text-muted-foreground bg-muted/10">
                  <th className="text-left p-4">Group Name</th>
                  <th className="text-center p-4">Members</th>
                  <th className="text-right p-4">Total Loan (₹)</th>
                  <th className="text-right p-4">Collected (₹)</th>
                  <th className="text-right p-4">Pending (₹)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((g: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-muted/5 transition-colors">
                    <td className="p-4 font-bold">{g.groupName}</td>
                    <td className="p-4 text-center">{g.memberCount}</td>
                    <td className="p-4 text-right">₹{format(g.totalLoan)}</td>
                    <td className="p-4 text-right text-emerald-600 font-bold">₹{format(g.collection)}</td>
                    <td className="p-4 text-right text-rose-600 font-bold">₹{format(g.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return (
        <div className="p-6">
          <table className="w-full text-xs border border-border">
            <tbody>
              <tr className="border-b"><td className="p-4 font-black uppercase text-muted-foreground bg-muted/10 w-1/3">Group Name</td><td className="p-4 font-bold">{data.groupName || "N/A"}</td></tr>
              <tr className="border-b"><td className="p-4 font-black uppercase text-muted-foreground bg-muted/10">Member Count</td><td className="p-4 font-bold">{data.memberCount || 0}</td></tr>
              <tr className="border-b"><td className="p-4 font-black uppercase text-muted-foreground bg-muted/20">Total Principal Disbursed</td><td className="p-4 text-lg font-black tracking-tight">₹{format(data.totalLoan)}</td></tr>
              <tr className="border-b"><td className="p-4 font-black uppercase text-emerald-600 bg-emerald-50/50">Total Collection Received</td><td className="p-4 text-lg font-black text-emerald-700 tracking-tight">₹{format(data.collection)}</td></tr>
              <tr><td className="p-4 font-black uppercase text-rose-600 bg-rose-50/50">Total Pending Demand</td><td className="p-4 text-lg font-black text-rose-700 tracking-tight">₹{format(data.pending)}</td></tr>
            </tbody>
          </table>
        </div>
      );

    case "due":
      if (!data || !data.members) return null;
      return (
        <div className="p-6 space-y-6">
           <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-xs font-bold uppercase">Demand Matrix for {data.date || "Selected Date"}</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gray-50 border border-border"><p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Planned Due</p><span className="text-xl font-black">₹{format(data.totalDue)}</span></div>
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100"><p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Actual Collection</p><span className="text-xl font-black text-emerald-700">₹{format(data.totalCollected)}</span></div>
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-100"><p className="text-[10px] font-bold uppercase text-rose-600 mb-1">Variance (Pending)</p><span className="text-xl font-black text-rose-700">₹{format(data.pending)}</span></div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-[10px] uppercase font-black text-muted-foreground bg-muted/20">
                <th className="text-left p-4">Member</th>
                <th className="text-center p-4">Due #</th>
                <th className="text-right p-4">Paid (₹)</th>
                <th className="text-center p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="p-4 font-bold">{m.memberName}</td>
                  <td className="p-4 text-center">#{m.dueNumber}</td>
                  <td className="p-4 text-right">₹{format(m.paidAmount)}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${m.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "pending":
      return (
        <div className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-[10px] uppercase font-black text-muted-foreground bg-muted/10">
                <th className="text-left p-4">Member</th>
                <th className="text-center p-4">Pending Dues (Counts)</th>
                <th className="text-right p-4">Total Overdue (Principal + Interest)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p: any, i: number) => (
                <tr key={i} className="border-b hover:bg-muted/5 transition-colors">
                  <td className="p-4 font-bold text-sm tracking-tight">{p.memberName}</td>
                  <td className="p-4 text-center font-mono">{(p.overdueCount || 0).toString().padStart(2, '0')} Dues</td>
                  <td className="p-4 text-right text-rose-600 font-black text-sm">₹{format(p.pendingAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "interest":
      return (
        <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <TrendingUp className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-2">Aggregate Interest Yield</p>
            <h1 className="text-5xl font-black text-foreground tracking-tighter">₹{format(data.totalInterestCollected)}</h1>
          </div>
          <p className="text-xs max-w-sm text-muted-foreground italic font-medium">This figure represents the total realized interest earnings from all processed installments across the entire system portfolio.</p>
        </div>
      );

    case "loan-history":
      return (
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b text-[10px] uppercase font-black text-muted-foreground bg-muted/10">
                <th className="text-left p-4">Loan ID</th>
                <th className="text-center p-4">Status</th>
                <th className="text-left p-4">Timeline</th>
                <th className="text-right p-4">Disbursed</th>
                <th className="text-right p-4">Collected</th>
                <th className="text-right p-4">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.map((l: any, i: number) => (
                <tr key={i} className="border-b hover:bg-muted/5">
                  <td className="p-4 font-mono">#{l.loanId}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full font-black ${l.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                  </td>
                  <td className="p-4 font-bold text-muted-foreground">{l.startDate} → {l.endDate}</td>
                  <td className="p-4 text-right font-medium">₹{format(l.totalLoan)}</td>
                  <td className="p-4 text-right text-emerald-600 font-bold">₹{format(l.collected)}</td>
                  <td className="p-4 text-right text-rose-600 font-bold">₹{format(l.pending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "pnl":
      return (
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground border-b pb-2 tracking-widest flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" />Revenue Components</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-medium"><span>Interest Revenue</span><span className="font-bold">₹{format(data.interestIncome)}</span></div>
                <div className="flex justify-between items-center text-sm font-medium"><span>Operational Fines</span><span className="font-bold">₹{format(data.fineCollection)}</span></div>
                <div className="flex justify-between items-center text-sm font-medium"><span>Insurance Fees</span><span className="font-bold">₹{format(data.insuranceFees)}</span></div>
                <div className="flex justify-between items-center pt-2 border-t font-black text-emerald-600 text-lg tracking-tight"><span>Total Gross Revenue</span><span>₹{format(data.totalRevenue)}</span></div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground border-b pb-2 tracking-widest flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5" />Portfolio Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-medium"><span>Capital Disbursed</span><span className="font-bold">₹{format(data.totalLoanDisbursed)}</span></div>
                <div className="flex justify-between items-center text-sm font-medium"><span>Capital Realized</span><span className="font-bold">₹{format(data.totalCollection)}</span></div>
                <div className="flex justify-between items-center pt-2 border-t font-black text-rose-600 text-lg tracking-tight"><span>Total Outstanding Loan</span><span>₹{format(data.pendingAmount)}</span></div>
              </div>
            </div>
          </div>
          <div className="p-4 bg-muted/10 rounded-lg border border-dashed border-border/50 text-center">
             <p className="text-[10px] text-muted-foreground font-bold uppercase">Audit Note: Figures are subject to finalized settlement batches and may vary by ±0.01% due to rounding.</p>
          </div>
        </div>
      );
    default:
      return null;
  }
}
