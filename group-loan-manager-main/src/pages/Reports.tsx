import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Printer, Users, FileText, Banknote, AlertCircle, TrendingUp, History, Loader2, Calendar as CalendarIcon, ChevronDown, ChevronUp, Search, Table as TableIcon, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { exportToCSV, exportToPDF, exportBalanceSheetCSV, exportBalanceSheetPDF, exportProfitLossCSV, exportProfitLossPDF } from "@/lib/reportExportUtils";
import { Input } from "@/components/ui/input";

// --- Types ---
interface Member { id: number; name: string; }
interface Group { id: number; groupName: string; }

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("balanceSheet");
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<string>("MONTHLY");
  const [reportData, setReportData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);

  // Filter States
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const getTodayLocal = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const getLastMonthLocal = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const [dateRange, setDateRange] = useState({ 
    start: getLastMonthLocal(), 
    end: getTodayLocal() 
  });
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal());
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [selectedMember, setSelectedMember] = useState<string>("ALL");
  const [selectedLoanId, setSelectedLoanId] = useState<string>("ALL");
  const [selectedInstallmentNo, setSelectedInstallmentNo] = useState<string>("ALL");
  const [availableLoans, setAvailableLoans] = useState<any[]>([]);
  const [availableInsts, setAvailableInsts] = useState<number[]>([]);
  const [status, setStatus] = useState<string>("ALL");
  const [riskLevel, setRiskLevel] = useState<string>("ALL");
  const [agingBucket, setAgingBucket] = useState<string>("ALL");
  const [loanId, setLoanId] = useState<string>("");

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchMembers();
    fetchGroups();
  }, []);

  useEffect(() => {
    // 1. CLEAR DATA IMMEDIATELY on any filter/tab change to prevent stale display
    setReportData(null);
    setTrendData([]);
    setLoading(false);

    // 1.1 DATE RANGE VALIDATION (Max 1 year)
    if (["balanceSheet", "profitLoss", "loans", "ledger", "financials"].includes(activeTab)) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 366) { // ~1 year
            toast.error("Date range cannot exceed 1 year");
            return;
        }
    }

    // 2. Hierarchical reset for the 'due' tab specifically
    if (activeTab === "due" && selectedGroup === "ALL") {
        setAvailableLoans([]);
        setSelectedLoanId("ALL");
        setSelectedInstallmentNo("ALL");
        setAvailableInsts([]);
        return;
    }

    if (activeTab === "due" && selectedLoanId === "ALL") {
        setAvailableInsts([]);
        setSelectedInstallmentNo("ALL");
        return;
    }
    if (activeTab === "due" && !selectedLoanId) {
    setReportData(null);
    return;
}

    // 3. Fetch data ONLY if we have a valid selection for the specific tab
    const controller = new AbortController();
    fetchActiveReport(controller.signal);

    return () => controller.abort();
  }, [activeTab, dateRange, selectedDate, selectedGroup, selectedMember, selectedLoanId, selectedInstallmentNo, status, riskLevel, agingBucket, loanId]);

  // Handle dependent data fetching (Loans, Installments) separately from Report data
  useEffect(() => {
    if (selectedGroup !== "ALL") {
        fetch(`${API_BASE}/api/loans/group/${selectedGroup}/summary`, { headers: { "loggedInUser": user?.username || "" } })
            .then(res => res.json())
            .then(data => setAvailableLoans(data))
            .catch(() => setAvailableLoans([]));
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedLoanId !== "ALL") {
        fetch(`${API_BASE}/api/reports/installment-numbers?loanId=${selectedLoanId}`, { headers: { "loggedInUser": user?.username || "" } })
            .then(res => res.json())
            .then(data => setAvailableInsts(data))
            .catch(() => setAvailableInsts([]));
    }
  }, [selectedLoanId]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/members`, { headers: { "loggedInUser": user?.username || "" } });
      if (res.ok) setMembers(await res.json());
    } catch (e) {}
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/groups?size=50`, {
        headers: { "loggedInUser": user?.username || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.content !== undefined ? data.content : data);
      }
    } catch (e) {}
  };

  const buildQuery = (params: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && v !== "ALL" && v !== "") q.append(k, v);
    }
    return q.toString();
  };

  const fetchActiveReport = async (signal?: AbortSignal) => {
    if (!activeTab) return;
    setLoading(true);

    try {
      let url = "";
      switch (activeTab) {
        case "balanceSheet":
          url = `${API_BASE}/api/reports/balance-sheet?${buildQuery({ startDate: dateRange.start, endDate: dateRange.end, groupId: selectedGroup })}`;
          break;
        case "profitLoss":
          url = `${API_BASE}/api/reports/profit-loss?${buildQuery({ startDate: dateRange.start, endDate: dateRange.end, groupId: selectedGroup, viewType })}`;
          break;
        case "loans":
          url = `${API_BASE}/api/reports/loans?${buildQuery({ startDate: dateRange.start, endDate: dateRange.end, groupId: selectedGroup, status })}`;
          break;
        case "members":
          url = `${API_BASE}/api/reports/members?${buildQuery({ groupId: selectedGroup, status })}`;
          break;
        case "due":
          if (selectedLoanId === "ALL") {
            setReportData(null);
            setLoading(false);
            return;
          }
          url = `${API_BASE}/api/reports/collection-due?${buildQuery({ 
            loanId: selectedLoanId, 
            installmentNo: selectedInstallmentNo, 
            status 
          })}`;
          break;
        case "outstanding":
          url = `${API_BASE}/api/reports/outstanding?${buildQuery({ groupId: selectedGroup, riskLevel, agingBucket })}`;
          break;
        case "ledger":
          url = `${API_BASE}/api/reports/ledger?${buildQuery({ startDate: dateRange.start, endDate: dateRange.end, groupId: selectedGroup, loanId, memberId: selectedMember })}`;
          break;
        case "financials":
          url = `${API_BASE}/api/reports/financials?${buildQuery({ startDate: dateRange.start, endDate: dateRange.end, groupId: selectedGroup })}`;
          break;
      }

      // Add cache buster to prevent stale response showing 0 loans when backend has data
      const fetchUrl = url.includes('?') ? `${url}&_cb=${Date.now()}` : `${url}?_cb=${Date.now()}`;
      
      const res = await fetch(fetchUrl, { headers: { "loggedInUser": user?.username || "" }, signal });
      if (res.ok && !signal?.aborted) {
        const data = await res.json();
        setReportData(data);
        
      // Trends handled inside profitLoss logic now
      }
    } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
            toast.error("Error fetching report");
        }
    } finally {
        setLoading(false);
    }
  };

  // Grand Total Calculation Logic with strict safety checks
  const totals = useMemo(() => {
    if (!reportData || activeTab === 'balanceSheet' || activeTab === 'profitLoss' || activeTab === 'financials') return null;
    
    // Ensure data matches expectation for the tab
    const isArrayExpected = ["groups", "loans", "members", "outstanding", "ledger"].includes(activeTab);
    if (isArrayExpected && !Array.isArray(reportData)) return null;
    if (activeTab === "due" && !reportData.installments) return null;

    let dataList = Array.isArray(reportData) ? reportData : (reportData.installments || []);
    
    return dataList.reduce((acc: any, curr: any) => {
        const fields = ["totalLoan", "total", "collected", "pending", "paid", "dueAmount", "balance", "principal", "interest", "pendingAmount"];
        fields.forEach(f => {
            if (curr[f] !== undefined) acc[f] = (acc[f] || 0) + curr[f];
        });
        if (curr.memberCount !== undefined) acc.memberCount = (acc.memberCount || 0) + curr.memberCount;
        if (curr.activeLoans !== undefined) acc.activeLoans = (acc.activeLoans || 0) + curr.activeLoans;
        if (curr.overdueCount !== undefined) acc.overdueCount = (acc.overdueCount || 0) + curr.overdueCount;
        return acc;
    }, {});
  }, [reportData, activeTab]);

  const handleCSV = () => {
    if (!reportData) return;
    let dataToExport: any[] = [];
    let filename = `${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`;

    switch (activeTab) {
      case "balanceSheet":
        exportBalanceSheetCSV(reportData, dateRange, selectedGroup === 'ALL' ? 'All Groups' : groups.find((g: any) => String(g.id) === selectedGroup)?.groupName || selectedGroup);
        return;
      case "profitLoss":
        exportProfitLossCSV(reportData, dateRange, selectedGroup === 'ALL' ? 'All Groups' : groups.find((g: any) => String(g.id) === selectedGroup)?.groupName || selectedGroup);
        return;
      case "loans": dataToExport = reportData; break;
      case "members": dataToExport = reportData; break;
      case "due": dataToExport = reportData.installments || []; break;
      case "outstanding": dataToExport = reportData; break;
      case "ledger": dataToExport = reportData; break;
      case "financials": dataToExport = reportData.loanProfits || []; break;
    }

    if (!dataToExport || dataToExport.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportToCSV(dataToExport, filename, totals);
  };

  const handlePDF = () => {
    if (!reportData) return;
    let title = `${activeTab.toUpperCase()} REPORT`;
    let subtitle = `Filters: Group [${selectedGroup}] | Start: ${dateRange.start} | End: ${dateRange.end}`;
    let headers: string[] = [];
    let rows: any[][] = [];
    let footerRows: any[] = [];

    const format = (val: any) => (val || 0).toLocaleString();

    switch (activeTab) {
      case "balanceSheet":
        exportBalanceSheetPDF(reportData, dateRange, selectedGroup === 'ALL' ? 'All Groups' : groups.find((g: any) => String(g.id) === selectedGroup)?.groupName || selectedGroup);
        return;
      case "profitLoss":
        exportProfitLossPDF(reportData, dateRange, selectedGroup === 'ALL' ? 'All Groups' : groups.find((g: any) => String(g.id) === selectedGroup)?.groupName || selectedGroup);
        return;
      case "loans":
        headers = ["ID", "Group", "Start Date", "Total (₹)", "Collected (₹)", "Pending (₹)", "Status"];
        rows = reportData.map((l:any) => [l.loanId, l.groupName, l.startDate, format(l.total), format(l.collected), format(l.pending), l.status]);
        footerRows = ["TOTAL", "-", "-", format(totals.total), format(totals.collected), format(totals.pending), "-"];
        break;
      case "members":
        headers = ["Member", "Group", "Loans", "Total (₹)", "Paid (₹)", "Pending (₹)", "Overdue #", "Status"];
        rows = reportData.map((m:any) => [m.memberName, m.groupName, m.activeLoans, format(m.totalLoan), format(m.paid), format(m.pending), m.overdueCount, m.status]);
        footerRows = ["TOTAL", "-", totals.activeLoans, format(totals.totalLoan), format(totals.paid), format(totals.pending), totals.overdueCount, "-"];
        break;
      case "due":
        headers = ["Member", "Loan ID", "Loan Status", "Inst #", "Due Date", "Due Amount (₹)", "Paid (₹)", "Balance (₹)", "Status"];
        rows = reportData.installments.map((i:any) => [i.memberName, i.loanId, i.loanStatus, i.installmentNo, i.dueDate, format(i.dueAmount), format(i.paid), format(i.balance), i.status]);
        footerRows = ["TOTAL", "-", "-", "-", "-", format(totals.dueAmount), format(totals.paid), format(totals.balance), "-"];
        break;
      case "outstanding":
        headers = ["Member", "Group", "Loan", "Pending (₹)", "Overdue #", "Oldest Due", "Risk Level"];
        rows = reportData.map((o:any) => [o.memberName, o.groupName, o.loanId, format(o.pendingAmount), o.overdueCount, o.oldestDueDate, o.riskLevel]);
        footerRows = ["TOTAL", "-", "-", format(totals.pendingAmount), totals.overdueCount, "-", "-"];
        break;
      case "ledger":
        headers = ["Member", "Inst #", "Due Date", "Principal (₹)", "Interest (₹)", "Paid (₹)", "Balance (₹)", "Status"];
        rows = reportData.map((l:any) => [l.memberName, l.installmentNo, l.dueDate, format(l.principal), format(l.interest), format(l.paid), format(l.balance), l.status]);
        footerRows = ["TOTAL", "-", "-", format(totals.principal), format(totals.interest), format(totals.paid), format(totals.balance), "-"];
        break;
      default:
         toast.error("Format limited for this tab. Use CSV.");
         return;
    }

    exportToPDF(title, subtitle, headers, rows, footerRows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Microfinance Professional Reporting</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Production-Grade Analytics Engine</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 font-bold" onClick={handleCSV} disabled={!reportData}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2 font-bold border-primary/20 hover:bg-primary/5" onClick={handlePDF} disabled={!reportData || activeTab === 'dashboard' || activeTab === 'financials'}>
            <Printer className="h-3.5 w-3.5 text-primary" /> Print Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        setReportData(null);
      }} className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full bg-muted/30 p-1 h-auto items-stretch">
          {[
            { id: "balanceSheet", label: "Balance Sheet", icon: TableIcon },
            { id: "profitLoss", label: "Profit & Loss", icon: TrendingUp },
            { id: "loans", label: "Loan Performance", icon: Banknote },
            { id: "members", label: "Member Repayment", icon: Users },
            { id: "due", label: "Collection/Due", icon: CalendarIcon },
            { id: "outstanding", label: "Overdue/Risk", icon: AlertCircle },
            { id: "ledger", label: "Loan Ledger", icon: FileText },
            { id: "financials", label: "Financials", icon: TrendingUp },
          ].map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="text-[9px] uppercase font-black py-2 gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <tab.icon className="h-3 w-3" /> <span className="hidden md:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4 bg-white rounded-xl shadow-lg border border-border/50 overflow-hidden min-h-[500px]">
          {/* SHARED FILTERS PAELLA */}
          <div className="p-4 border-b border-border/50 bg-gray-50/50 flex flex-wrap gap-4 items-end">
            <div className="w-[180px]">
                <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Entity Filter (Group)</label>
                <Select value={selectedGroup} onValueChange={(val) => {
                   setSelectedGroup(val);

    //  CLEAR DEPENDENT FILTERS (CRITICAL FIX)
                   setSelectedLoanId("ALL");
                   setSelectedInstallmentNo("ALL");

                   setAvailableLoans([]);
                   setAvailableInsts([]);

    // Optional (strict reset)
                setStatus("ALL");

    //  CLEAR TABLE DATA
                setReportData(null);
                }}>
                    <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue placeholder="All Groups" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="ALL">All Groups</SelectItem>
                    {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.groupName}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {["balanceSheet", "profitLoss", "loans", "ledger", "financials"].includes(activeTab) && (
                <div className="flex gap-2">
                    <div className="w-[130px]">
                        <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">From Date</label>
                        <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="h-8 text-xs bg-white font-bold" />
                    </div>
                    <div className="w-[130px]">
                        <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">To Date</label>
                        <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="h-8 text-xs bg-white font-bold" />
                    </div>
                </div>
            )}

            {activeTab === "due" && (
                <>
                    <div className="w-[140px]">
                        <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Active Loan</label>
                        <Select value={selectedLoanId} onValueChange={(val) => {
                            setSelectedLoanId(val);
                            setReportData(null);
                        }}>
                            <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue placeholder="Select Loan" /></SelectTrigger>
                            <SelectContent className="text-xs">
                                <SelectItem value="ALL">--</SelectItem>
                                {availableLoans.map(l => (
                                    <SelectItem key={l.id} value={String(l.id)}>#{l.id} ({l.status})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[120px]">
                        <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Installment</label>
                        <Select value={selectedInstallmentNo} onValueChange={(val) => {
                            setSelectedInstallmentNo(val);
                            setReportData(null);
                        }}>
                            <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue placeholder="All" /></SelectTrigger>
                            <SelectContent className="text-xs">
                                <SelectItem value="ALL">Entire Schedule</SelectItem>
                                {availableInsts.map(n => (
                                    <SelectItem key={n} value={String(n)}>Installment #{n}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}

            {["loans", "members", "due"].includes(activeTab) && (
                <div className="w-[140px]">
                    <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Status lens</label>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent className="text-xs">
                        <SelectItem value="ALL">All States</SelectItem>
                        {activeTab === "loans" || activeTab === "dashboard" ? (
                            <><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="CLOSED">Closed</SelectItem></>
                        ) : activeTab === "members" ? (
                            <><SelectItem value="GOOD">Good Performance</SelectItem><SelectItem value="RISK">At Risk</SelectItem><SelectItem value="DEFAULT">Defaulted</SelectItem></>
                        ) : activeTab === "due" ? (
                            <><SelectItem value="PAID">Paid</SelectItem><SelectItem value="PARTIAL">Partial</SelectItem><SelectItem value="UNPAID">Unpaid</SelectItem><SelectItem value="OVERDUE">Overdue</SelectItem></>
                        ) : null}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {["groups", "outstanding"].includes(activeTab) && (
                <div className="w-[140px]">
                    <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Risk Severity</label>
                    <Select value={riskLevel} onValueChange={setRiskLevel}>
                        <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent className="text-xs">
                        <SelectItem value="ALL">Any Risk</SelectItem><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
            
            {activeTab === "outstanding" && (
                <div className="w-[140px]">
                    <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Aging Bucket</label>
                    <Select value={agingBucket} onValueChange={setAgingBucket}>
                        <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent className="text-xs">
                        <SelectItem value="ALL">Any Bucket</SelectItem><SelectItem value="0-30 days">0-30 days</SelectItem><SelectItem value="30-60 days">30-60 days</SelectItem><SelectItem value="60+ days">60+ days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {activeTab === "ledger" && (
                <div className="flex gap-2">
                    <div className="w-[150px]">
                        <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Member</label>
                        <Select value={selectedMember} onValueChange={setSelectedMember}>
                            <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue placeholder="Any" /></SelectTrigger>
                            <SelectContent className="text-xs">
                            <SelectItem value="ALL">Any Member</SelectItem>
                            {members.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[100px]">
                        <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Loan ID</label>
                        <Input placeholder="ID" value={loanId} onChange={(e) => setLoanId(e.target.value)} className="h-8 text-xs bg-white font-bold" />
                    </div>
                </div>
            )}
          </div>

          <div className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Compiling Analytics Data...</p>
              </div>
            ) : !reportData || (Array.isArray(reportData) && reportData.length === 0) ? (
              <div className="text-center py-40 space-y-4 opacity-20">
                <TableIcon className="h-16 w-16 mx-auto" />
                <p className="text-xs font-black uppercase tracking-[0.3em]">No Data Points in Current Filter</p>
              </div>
            ) : (
               <ReportRenderer activeTab={activeTab} data={reportData} loading={loading} totals={totals} dateRange={dateRange} />
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

// --- Dynamic Renderers for Each Report ---

function ReportRenderer({ activeTab, data, trendData, totals, loading, dateRange }: { activeTab: string, data: any, trendData?: any[], totals: any, loading: boolean, dateRange?: { start: string, end: string } }) {
    const format = (v: any) => (v || 0).toLocaleString('en-IN');

    // --- Safety Guard: Prevent crashes if data doesn't match expected structure for the tab ---
    if (!data) return null;
    const isArrayExpected = ["loans", "members", "outstanding", "ledger"].includes(activeTab);
    if (isArrayExpected && !Array.isArray(data)) return null;
    if (activeTab === "balanceSheet" && !data.opening) return null;
    if (activeTab === "profitLoss" && !data.revenue) return null;
    if (activeTab === "due" && !data.installments) return null;
    if (activeTab === "financials" && !data.revenue) return null;
    if (!totals && isArrayExpected) return null; 

    switch(activeTab) {
        case "balanceSheet":
            return (
                <div className="p-8 space-y-12 max-w-4xl mx-auto">
                    <SectionHeader title="Statement of Financial Position" icon={TableIcon} />
                    
                    <div className="space-y-8">
                        <div>
                            <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest bg-muted/30 px-3 py-1 inline-block rounded">A. Opening Balance</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KPICard title="Cash" value={`₹${format(data.opening.cash)}`} icon={Banknote} color="blue" tiny />
                                <KPICard title="Loan Outstanding" value={`₹${format(data.opening.loanOutstanding)}`} icon={AlertCircle} color="amber" tiny />
                                <KPICard title="Charges" value={`₹${format(data.opening.charges)}`} icon={FileText} color="slate" tiny />
                                <KPICard title="Total Assets" value={`₹${format(data.opening.total)}`} icon={TrendingUp} color="blue" tiny />
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest bg-muted/30 px-3 py-1 inline-block rounded">B. Movement (Current Period)</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KPICard title="Capital Added (+)" value={`₹${format(data.movement.infusedCapital || 0)}`} icon={Wallet} color="blue" tiny />
                                <KPICard title="Loan Disbursements (-)" value={`₹${format(data.movement.disbursed)}`} icon={TrendingUp} color="rose" tiny />
                                <KPICard title="Collections/Repayments (+)" value={`₹${format(data.movement.collected)}`} icon={TrendingUp} color="emerald" tiny />
                                <KPICard title="Charges Collected (+)" value={`₹${format(data.movement.chargesCollected)}`} icon={FileText} color="emerald" tiny />
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest bg-primary/10 text-primary px-3 py-1 inline-block rounded">C. Closing Balance</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KPICard title="Cash" value={`₹${format(data.closing.cash)}`} icon={Banknote} color="emerald" tiny />
                                <KPICard title="Total Pending Loans" value={`₹${format(data.closing.loanOutstanding)}`} icon={AlertCircle} color="amber" tiny />
                                <KPICard title="Charges Collected" value={`₹${format(data.closing.charges)}`} icon={FileText} color="slate" tiny />
                                <KPICard title="Total Assets" value={`₹${format(data.closing.total)}`} icon={TrendingUp} color="emerald" tiny />
                            </div>
                        </div>
                    </div>

                    {(() => {
                        // New formula: Total Assets = Cash + Total Pending Loans
                        const expectedClosing = data.closing.cash + data.closing.loanOutstanding;
                        const isStable = Math.abs(expectedClosing - data.closing.total) < 1;
                        
                        return (
                            <div className={`p-4 rounded-xl border flex items-center justify-between ${isStable ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full text-white ${isStable ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                        {isStable ? <TrendingUp className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <p className={`text-[10px] font-black uppercase ${isStable ? 'text-emerald-800' : 'text-rose-800'}`}>Internal Validation</p>
                                        <p className={`text-xs font-bold italic ${isStable ? 'text-emerald-600' : 'text-rose-600'}`}>Asset Balance Consistency Check — Cash + Pending Loans = Total Assets</p>
                                    </div>
                                </div>
                                <p className={`text-sm font-black ${isStable ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {isStable ? 'STABLE' : 'MISMATCH'}
                                </p>
                            </div>
                        );
                    })()}
                </div>
            );

        case "profitLoss":
            if (!data.revenue || !data.trends) {
                return (
                    <div className="flex flex-col items-center justify-center py-40 opacity-20">
                        <AlertCircle className="h-16 w-16 mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-center">Incomplete Financial Data Structure<br/>Please check date filters or backend aggregation</p>
                    </div>
                );
            }
            const latestTrend = data.trends && data.trends.length > 0 ? data.trends[data.trends.length - 1] : null;

            return (
                <div className="p-8 space-y-12 max-w-4xl mx-auto">
                    {/* Structured P&L Statement */}
                    <div className="bg-white border rounded-2xl p-8 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>
                        <h3 className="text-center font-black text-lg mb-1 uppercase tracking-widest text-slate-800">Profit & Loss Statement</h3>
                        <p className="text-center text-[10px] font-bold text-muted-foreground mb-8">REPORTING PERIOD: {data.startDate || dateRange?.start} — {data.endDate || dateRange?.end}</p>
                        
                        <div className="space-y-6 max-w-md mx-auto">
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] border-b border-dashed pb-1">I. Revenue</h4>
                                <div className="flex justify-between text-sm py-1">
                                    <span className="text-slate-600 font-medium">Interest Income</span>
                                    <span className="font-bold text-slate-800">₹{format(data.revenue.interest)}</span>
                                </div>
                                <div className="flex justify-between text-sm py-1">
                                    <span className="text-slate-600 font-medium">Charges Income</span>
                                    <span className="font-bold text-slate-800">₹{format(data.revenue.charges)}</span>
                                </div>
                                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400">Total Revenue</span>
                                    <span className="text-lg font-black text-emerald-700">₹{format(data.revenue.total)}</span>
                                </div>
                            </div>



                            <div className="pt-8 border-t-2 border-slate-900 mt-8">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-[0.3em]">Net Profit</h4>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Bottom Line Result</p>
                                    </div>
                                    <span className="text-3xl font-black text-emerald-800 tracking-tighter">₹{format(data.netProfit)}</span>
                                </div>
                                <div className="h-1 w-full bg-slate-900 mt-2"></div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Trends */}
                    <div>
                        <SectionHeader title="Comparative Performance Trend" icon={TrendingUp} />
                        <div className="mt-6 border rounded-2xl overflow-hidden shadow-sm bg-white">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50">
                                    <tr className="text-[9px] font-black uppercase text-slate-500 border-b">
                                        <th className="p-4 text-left">Period</th>
                                        <th className="p-4 text-right">Interest (₹)</th>
                                        <th className="p-4 text-right">Charges (₹)</th>
                                        <th className="p-4 text-right">Revenue (₹)</th>
                                        <th className="p-4 text-right">Growth %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.trends.map((t: any, i: number) => (
                                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-bold text-slate-700">{t.period}</td>
                                            <td className="p-4 text-right font-mono font-medium text-slate-600">₹{format(t.interest)}</td>
                                            <td className="p-4 text-right font-mono font-medium text-slate-600">₹{format(t.charges)}</td>
                                            <td className="p-4 text-right font-mono font-black text-slate-800">₹{format(t.revenue)}</td>
                                            <td className={`p-4 text-right font-black ${t.growth === null ? 'text-slate-300' : t.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {t.growth === null ? "—" : (t.growth > 0 ? `+${t.growth}%` : `${t.growth}%`)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Loan Breakdown Table */}
                    <div>
                        <SectionHeader title="Loan-Level Profit Breakdown" icon={FileText} />
                        <div className="mt-6 border rounded-2xl overflow-hidden shadow-sm bg-white">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50">
                                    <tr className="text-[9px] font-black uppercase text-slate-500 border-b">
                                        <th className="p-4 text-left">Group</th>
                                        <th className="p-4 text-left">Loan ID</th>
                                        <th className="p-4 text-right">Interest Income (₹)</th>
                                        <th className="p-4 text-right">Charges Income (₹)</th>
                                        <th className="p-4 text-right">Profit/Loss (₹)</th>
                                        <th className="p-4 text-center">Type</th>
                                        <th className="p-4 text-right">% Contribution</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data.loanBreakdowns || []).map((b: any, i: number) => (
                                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-bold text-slate-700">{b.groupName}</td>
                                            <td className="p-4 font-mono font-bold text-primary">#{b.loanId}</td>
                                            <td className="p-4 text-right font-mono font-medium text-emerald-600">₹{format(b.interestIncome)}</td>
                                            <td className="p-4 text-right font-mono font-medium text-blue-600">₹{format(b.chargesIncome)}</td>
                                            <td className="p-4 text-right font-mono font-black text-slate-800">₹{format(b.profit)}</td>
                                            <td className="p-4 text-center font-black">{b.profit >= 0 ? <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">P</span> : <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded">L</span>}</td>
                                            <td className="p-4 text-right font-black text-emerald-700">{b.profitPercentage}%</td>
                                        </tr>
                                    ))}
                                    {(!data.loanBreakdowns || data.loanBreakdowns.length === 0) && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-muted-foreground text-xs uppercase font-bold tracking-widest opacity-50">No Data Available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );

        case "loans":
            return (
                <TableWrapper>
                    <thead>
                        <tr className="border-b text-[9px] uppercase font-black text-muted-foreground bg-muted/20">
                            <th className="p-4 text-left">Loan ID</th><th className="p-4 text-left">Group</th><th className="p-4 text-center">Start Date</th><th className="p-4 text-center">End Date</th>
                            <th className="p-4 text-right">Total (₹)</th><th className="p-4 text-right">Collected (₹)</th><th className="p-4 text-right">Pending (₹)</th>
                            <th className="p-4 text-center">Completion %</th><th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((l: any, i: number) => (
                            <tr key={i} className="border-b hover:bg-muted/5 transition-colors">
                                <td className="p-4 font-mono font-bold tracking-tight text-primary">#{l.loanId}</td><td className="p-4 font-bold">{l.groupName}</td>
                                <td className="p-4 text-center font-mono opacity-60">{l.startDate}</td><td className="p-4 text-center font-mono opacity-60">{l.endDate}</td>
                                <td className="p-4 text-right font-medium">₹{format(l.total)}</td>
                                <td className="p-4 text-right text-emerald-600 font-bold">₹{format(l.collected)}</td>
                                <td className="p-4 text-right text-rose-600 font-bold">₹{format(l.pending)}</td>
                                <td className="p-4 text-center"><span className="px-2 py-1 bg-muted rounded font-black text-[10px]">{l.completionPercentage}%</span></td>
                                <td className="p-4 text-center"><Badge status={l.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                    <TotalFooter columns={[
                        { label: "TOTAL ENTRIES", span: 4 }, { value: totals.total, isMoney: true }, { value: totals.collected, isMoney: true },
                        { value: totals.pending, isMoney: true }, { value: "-" }, { value: "-" }
                    ]} />
                </TableWrapper>
            );

        case "members":
            return (
                <TableWrapper>
                    <thead>
                        <tr className="border-b text-[9px] uppercase font-black text-muted-foreground bg-muted/20">
                            <th className="p-4 text-left">Member</th><th className="p-4 text-left">Group</th><th className="p-4 text-center">Loans</th>
                            <th className="p-4 text-right">Total Loan (₹)</th><th className="p-4 text-right">Paid (₹)</th><th className="p-4 text-right">Pending (₹)</th>
                            <th className="p-4 text-center">Overdue Count</th><th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((m: any, i: number) => (
                            <ExpandableMemberRow key={i} member={m} format={format} />
                        ))}
                    </tbody>
                    <TotalFooter columns={[
                        { label: "TOTAL PORTFOLIO", span: 2 }, { value: totals.activeLoans }, { value: totals.totalLoan, isMoney: true },
                        { value: totals.paid, isMoney: true }, { value: totals.pending, isMoney: true }, { value: totals.overdueCount }, { value: "-" }
                    ]} />
                </TableWrapper>
            );

        case "due":
            if (!data || !data.installments) {
                return (
                    <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-3xl bg-muted/5">
                        <div className="p-4 bg-primary/5 rounded-full mb-4"><Users className="h-10 w-10 text-primary/40" /></div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Selection Required</h3>
                        <p className="text-xs text-muted-foreground font-bold text-center max-w-[200px]">Please select a Group and an Active Loan to view collection details</p>
                    </div>
                );
            }
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KPICard title="Planned Due" value={`₹${format(data.summary.plannedDue)}`} color="slate" icon={FileText} />
                        <KPICard title="Collection Received" value={`₹${format(data.summary.collected)}`} color="emerald" icon={TrendingUp} />
                        <KPICard title="Pending Collection" value={`₹${format(data.summary.pending)}`} color="rose" icon={AlertCircle} />
                    </div>
                    <TableWrapper>
                        <thead>
                            <tr className="border-b text-[9px] uppercase font-black text-muted-foreground bg-muted/20">
                                <th className="p-4 text-left">Member</th><th className="p-4 text-left">Loan ID</th><th className="p-4 text-center">Installment</th>
                                <th className="p-4 text-right">Due Amount (₹)</th><th className="p-4 text-right">Paid (₹)</th><th className="p-4 text-right">Balance (₹)</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.installments.map((inst: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-muted/5">
                                    <td className="p-4 font-bold">{inst.memberName}</td><td className="p-4 font-mono font-black text-primary">#{inst.loanId}</td><td className="p-4 text-center font-bold">INST #{inst.installmentNo}</td>
                                    <td className="p-4 text-right font-mono">₹{format(inst.dueAmount)}</td><td className="p-4 text-right text-emerald-600 font-black">₹{format(inst.paid)}</td>
                                    <td className="p-4 text-right text-rose-600 font-black">₹{format(inst.balance)}</td>
                                    <td className="p-4 text-center"><Badge status={inst.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                        <TotalFooter columns={[
                            { label: "COLLECTION TOTALS", span: 3 }, { value: totals.dueAmount, isMoney: true }, { value: totals.paid, isMoney: true },
                            { value: totals.balance, isMoney: true }, { value: "-" }
                        ]} />
                    </TableWrapper>
                </div>
            );
            
        case "outstanding":
            return (
                <TableWrapper>
                    <thead>
                        <tr className="border-b text-[9px] uppercase font-black text-muted-foreground bg-muted/20">
                            <th className="p-4 text-left">Member</th><th className="p-4 text-left">Group</th><th className="p-4 text-left">Loan ID</th>
                            <th className="p-4 text-right">Pending Amount (₹)</th><th className="p-4 text-center">Overdue Count</th>
                            <th className="p-4 text-center">Oldest Due Date</th><th className="p-4 text-center">Risk Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((o: any, i: number) => (
                            <tr key={i} className="border-b hover:bg-muted/5 transition-colors">
                                <td className="p-4 font-bold">{o.memberName}</td><td className="p-4">{o.groupName}</td><td className="p-4 font-mono">#{o.loanId}</td>
                                <td className="p-4 text-right text-rose-600 font-black text-sm">₹{format(o.pendingAmount)}</td>
                                <td className="p-4 text-center text-rose-600 font-black text-sm">{o.overdueCount} DUEs</td>
                                <td className="p-4 text-center font-mono opacity-60">{o.oldestDueDate}</td>
                                <td className="p-4 text-center"><Badge status={o.riskLevel} /></td>
                            </tr>
                        ))}
                    </tbody>
                    <TotalFooter columns={[
                        { label: "EXPOSURE AT RISK", span: 3 }, { value: totals.pendingAmount, isMoney: true, color: "text-rose-700" }, { value: totals.overdueCount }, { value: "-" }, { value: "-" }
                    ]} />
                </TableWrapper>
            );

        case "ledger":
            return (
                <TableWrapper>
                    <thead>
                        <tr className="border-b text-[9px] uppercase font-black text-muted-foreground bg-muted/20">
                            <th className="p-4 text-left">Group → Member</th><th className="p-4 text-center">Installment No</th><th className="p-4 text-center">Due Date</th>
                            <th className="p-4 text-right">Principal (₹)</th><th className="p-4 text-right">Interest (₹)</th><th className="p-4 text-right">Paid (₹)</th>
                            <th className="p-4 text-right">Balance (₹)</th><th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((l: any, i: number) => (
                            <tr key={i} className="border-b hover:bg-muted/5">
                                <td className="p-4 font-bold">{l.groupName} <span className="opacity-30 mx-1">/</span> {l.memberName} <span className="text-[9px] opacity-40 ml-1">#L{l.loanId}</span></td>
                                <td className="p-4 text-center font-black">#{l.installmentNo}</td><td className="p-4 text-center font-mono opacity-60">{l.dueDate}</td>
                                <td className="p-4 text-right font-mono">₹{format(l.principal)}</td><td className="p-4 text-right font-mono">₹{format(l.interest)}</td>
                                <td className="p-4 text-right text-emerald-600 font-black">₹{format(l.paid)}</td>
                                <td className="p-4 text-right text-rose-600 font-black">₹{format(l.balance)}</td>
                                <td className="p-4 text-center"><Badge status={l.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                    <TotalFooter columns={[
                        { label: "LEDGER BALANCES", span: 3 }, { value: totals.principal, isMoney: true }, { value: totals.interest, isMoney: true },
                        { value: totals.paid, isMoney: true }, { value: totals.balance, isMoney: true }, { value: "-" }
                    ]} />
                </TableWrapper>
            );

        case "financials":
            return (
                <div className="p-8 space-y-12 max-w-5xl mx-auto">
                    {/* SECTION 1: REVENUE */}
                    <div className="space-y-4">
                        <SectionHeader title="Section 1: Revenue Matrix" icon={TrendingUp} />
                        <Card className="border-none shadow-sm overflow-hidden border-l-4 border-emerald-500">
                            <table className="w-full text-xs">
                                <thead className="bg-emerald-50/50">
                                    <tr className="text-[9px] font-black uppercase text-emerald-800 border-b"><th className="p-4 text-left">Revenue Source</th><th className="p-4 text-right">Recognized Amount (₹)</th></tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b"><td className="p-4 font-bold">Interest Yield (Paid Interest)</td><td className="p-4 text-right font-mono font-bold">₹{format(data.revenue.interest)}</td></tr>
                                    <tr className="border-b"><td className="p-4 font-bold">Loan Charges</td><td className="p-4 text-right font-mono font-bold">₹{format(data.revenue.fees)}</td></tr>
                                    <tr className="bg-emerald-50/20"><td className="p-4 font-black">Total Financial Revenue</td><td className="p-4 text-right font-mono font-black text-emerald-700 text-lg">₹{format(data.revenue.total)}</td></tr>
                                </tbody>
                            </table>
                        </Card>
                    </div>

                    {/* SECTION 2: PORTFOLIO */}
                    <div className="space-y-4">
                        <SectionHeader title="Section 2: Portfolio Health" icon={Banknote} />
                        <Card className="border-none shadow-sm overflow-hidden border-l-4 border-blue-500">
                            <table className="w-full text-xs">
                                <thead className="bg-blue-50/50">
                                    <tr className="text-[9px] font-black uppercase text-blue-800 border-b"><th className="p-4 text-left">Metric Overview</th><th className="p-4 text-right">Value (₹)</th></tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b"><td className="p-4 font-bold">Total Capital Disbursed</td><td className="p-4 text-right font-mono font-bold">₹{format(data.portfolio.capitalDisbursed)}</td></tr>
                                    <tr className="border-b"><td className="p-4 font-bold">Total Collections (Principal + Int)</td><td className="p-4 text-right font-mono font-bold text-emerald-600">₹{format(data.portfolio.totalCollection)}</td></tr>
                                    <tr className="bg-blue-50/20"><td className="p-4 font-black text-rose-600 uppercase tracking-tighter">Gross Portfolio Outstanding</td><td className="p-4 text-right font-mono font-black text-rose-700 text-lg">₹{format(data.portfolio.outstanding)}</td></tr>
                                </tbody>
                            </table>
                        </Card>
                    </div>

                    {/* SECTION 3: LOAN-WISE PROFIT */}
                    <div className="space-y-4">
                        <SectionHeader title="Section 3: Loan-Level Profit Analytics" icon={FileText} />
                        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/30">
                                    <tr className="text-[9px] font-black uppercase text-muted-foreground border-b text-left">
                                        <th className="p-4">Loan Account</th>
                                        <th className="p-4 text-right">Principal Repaid (₹)</th>
                                        <th className="p-4 text-right">Interest Earned (₹)</th>
                                        <th className="p-4 text-center">Current Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.loanProfits.map((lp: any, i: number) => (
                                        <tr key={i} className="border-b last:border-0 hover:bg-muted/5">
                                            <td className="p-4 font-bold">Loan Account #{lp.loanId}</td>
                                            <td className="p-4 text-right font-mono font-bold text-blue-700">₹{format(lp.principalRepaid)}</td>
                                            <td className="p-4 text-right font-mono font-black text-emerald-700">₹{format(lp.interestEarned)}</td>
                                            <td className="p-4 text-center"><Badge status={lp.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );

        default: return null;
    }
}

// Helpers

function KPICard({ title, value, color, icon: Icon, tiny }: { title: string, value: string | number, color: string, icon: any, tiny?: boolean }) {
    const theme: Record<string, string> = {
        blue: "text-blue-700 bg-blue-50/50 border-blue-100",
        emerald: "text-emerald-700 bg-emerald-50/50 border-emerald-100",
        rose: "text-rose-700 bg-rose-50/50 border-rose-100",
        amber: "text-amber-700 bg-amber-50/50 border-amber-100",
        slate: "text-slate-700 bg-slate-50/50 border-slate-100"
    };

    return (
        <Card className={`${theme[color] || theme.slate} border shadow-none ${tiny ? 'p-3' : 'p-4'} flex items-start justify-between`}>
            <div>
                <p className="text-[9px] font-black uppercase opacity-60 mb-1">{title}</p>
                <div className={`${tiny ? 'text-lg' : 'text-xl md:text-2xl'} font-black font-mono tracking-tighter`}>{value}</div>
            </div>
            <Icon className="h-4 w-4 opacity-20" />
        </Card>
    );
}

function SectionHeader({ title, icon: Icon }: { title: string, icon: any }) {
    return (
        <div className="flex items-center gap-3 border-b-2 border-primary/10 pb-3">
            <div className="p-2 bg-primary/5 rounded-lg text-primary"><Icon className="h-4 w-4" /></div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{title}</h3>
        </div>
    );
}

function TableWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                {children}
            </table>
        </div>
    );
}

function TotalFooter({ columns }: { columns: { label?: string, value?: any, isMoney?: boolean, color?: string, span?: number }[] }) {
    const format = (v: any) => (v || 0).toLocaleString('en-IN');
    return (
        <tfoot className="bg-muted/40 font-black border-t-2 border-border">
            <tr>
                {columns.map((c, i) => (
                    <td key={i} colSpan={c.span || 1} className={`p-4 ${c.label ? 'text-left' : 'text-right'} ${c.color || 'text-foreground'} uppercase text-[10px]`}>
                        {c.label ? c.label : (c.isMoney ? `₹${format(c.value)}` : format(c.value))}
                    </td>
                ))}
            </tr>
        </tfoot>
    );
}

function Badge({ status }: { status: string }) {
    let color = "bg-gray-100 text-gray-700 border-gray-200";
    if (["ACTIVE", "PAID", "GOOD", "LOW", "COMPLETED"].includes(status)) color = "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-50";
    if (["RISK", "MEDIUM", "PARTIAL", "UNPAID"].includes(status)) color = "bg-amber-100 text-amber-700 border-amber-200 shadow-sm shadow-amber-50";
    if (["DEFAULT", "HIGH", "DEFAULT RISK", "OVERDUE"].includes(status)) color = "bg-rose-100 text-rose-700 border-rose-200 shadow-sm shadow-rose-50";
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${color} uppercase tracking-tight`}>{status}</span>;
}

// Drill downs
function ExpandableGroupRow({ group, format }: { group: any, format: any }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <>
            <tr className={`border-b hover:bg-muted/5 cursor-pointer transition-colors ${expanded ? 'bg-primary/[0.02]' : ''}`} onClick={() => setExpanded(!expanded)}>
                <td className="p-4 font-bold flex items-center gap-2">
                    {expanded ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 opacity-30" />}
                    {group.groupName}
                </td>
                <td className="p-4 text-center font-black">{group.memberCount}</td><td className="p-4 text-center font-black">{group.activeLoans}</td>
                <td className="p-4 text-right font-mono">₹{format(group.totalLoan)}</td><td className="p-4 text-right font-mono text-emerald-700 font-black text-sm">₹{format(group.collected)}</td>
                <td className="p-4 text-right font-mono text-rose-700 font-black text-sm">₹{format(group.pending)}</td>
                <td className="p-4 text-center">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${group.collectionPercentage}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-muted-foreground mt-1 block">{group.collectionPercentage}%</span>
                </td>
                <td className="p-4 text-center"><Badge status={group.riskLevel} /></td>
            </tr>
            {expanded && (
                <tr className="bg-muted/10">
                    <td colSpan={8} className="p-6">
                        <div className="bg-white rounded-xl border border-primary/10 p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                            <h5 className="text-[10px] font-black uppercase text-primary mb-4 tracking-[0.2em] flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Group Portfolio Active Loans
                            </h5>
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="text-muted-foreground font-black uppercase text-[9px] border-b border-dashed"><th className="text-left pb-2">Loan ID</th><th className="text-right pb-2">Total (₹)</th><th className="text-right pb-2">Collected (₹)</th><th className="text-right pb-2">Pending (₹)</th><th className="text-center pb-2">Repayment Status</th></tr>
                                </thead>
                                <tbody>
                                    {group.loans.map((l:any) => <tr key={l.loanId} className="border-b last:border-0 border-dashed border-muted"><td className="py-2.5 font-mono font-black text-primary text-sm">#{l.loanId}</td><td className="py-2.5 text-right font-mono text-sm font-bold">₹{format(l.total)}</td><td className="py-2.5 text-right font-mono text-emerald-600 font-black text-sm">₹{format(l.collected)}</td><td className="py-2.5 text-right font-mono text-rose-600 font-black text-sm">₹{format(l.pending)}</td><td className="py-2.5 text-center"><Badge status={l.status}/></td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

function ExpandableMemberRow({ member, format }: { member: any, format: any }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <>
            <tr className={`border-b hover:bg-muted/5 cursor-pointer transition-colors ${expanded ? 'bg-indigo-[0.02]' : ''}`} onClick={() => setExpanded(!expanded)}>
                <td className="p-4 font-bold flex items-center gap-2">
                    {expanded ? <ChevronUp className="h-3.5 w-3.5 text-indigo-600" /> : <ChevronDown className="h-3.5 w-3.5 opacity-30" />}
                    {member.memberName}
                </td>
                <td className="p-4 opacity-70">{member.groupName}</td><td className="p-4 text-center font-black">{member.activeLoans}</td>
                <td className="p-4 text-right font-mono">₹{format(member.totalLoan)}</td><td className="p-4 text-right font-mono text-emerald-700 font-black">₹{format(member.paid)}</td>
                <td className="p-4 text-right font-mono text-rose-700 font-black">₹{format(member.pending)}</td>
                <td className="p-4 text-center font-black text-rose-600">{member.overdueCount} DUES</td>
                <td className="p-4 text-center"><Badge status={member.status} /></td>
            </tr>
            {expanded && (
                <tr className="bg-indigo-50/20">
                    <td colSpan={8} className="p-6">
                        <div className="bg-white rounded-xl border border-indigo-100 p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
                            <h5 className="text-[10px] font-black uppercase text-indigo-600 mb-4 tracking-[0.2em] flex items-center gap-2">
                                <History className="h-4 w-4" /> Member Borrowing Repayment History
                            </h5>
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="text-muted-foreground font-black uppercase text-[9px] border-b border-dashed"><th className="text-left pb-2">Loan ID</th><th className="text-right pb-2">Total (₹)</th><th className="text-right pb-2">Paid (₹)</th><th className="text-right pb-2">Pending (₹)</th><th className="text-center pb-2">Overdue Installments</th><th className="text-center pb-2">Final Status</th></tr>
                                </thead>
                                <tbody>
                                    {member.loans.map((l:any) => <tr key={l.loanId} className="border-b last:border-0 border-dashed border-indigo-50"><td className="py-2.5 font-mono font-black text-indigo-700 text-sm">#{l.loanId}</td><td className="py-2.5 text-right font-mono text-sm font-bold">₹{format(l.total)}</td><td className="py-2.5 text-right font-mono text-emerald-600 font-black text-sm">₹{format(l.paid)}</td><td className="py-2.5 text-right font-mono text-rose-600 font-black text-sm">₹{format(l.pending)}</td><td className="py-2.5 text-center font-black text-rose-600 text-sm">{l.overdues}</td><td className="py-2.5 text-center"><Badge status={l.status}/></td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}
