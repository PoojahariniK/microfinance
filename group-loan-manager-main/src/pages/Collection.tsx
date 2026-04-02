import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Printer, Download, Save, Users, History, ShieldAlert, ReceiptText, Pencil, X, Check, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  CollectionResponse, CollectionMemberDto, CollectPaymentRequest, PaymentEntryDto, 
  EditPaymentRequest, PaymentHistoryDto, ChargePaymentMemberDto, ChargeStatusResponse, 
  ChargePaymentRequest, LoanSummaryResponse, LoanScheduleGroupResponse 
} from "@/types/loanTypes";

interface GroupData { id: number; groupName: string; collectionStaff: string; }

export default function Collection() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // State: Groups & Loans selection dependencies
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [activeLoans, setActiveLoans] = useState<LoanSummaryResponse[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [availableSchedules, setAvailableSchedules] = useState<LoanScheduleGroupResponse[]>([]);
  const [selectedDueNumber, setSelectedDueNumber] = useState<string>("");

  // Grid Data
  const [collectionData, setCollectionData] = useState<CollectionResponse | null>(null);
  const [editedEntries, setEditedEntries] = useState<Record<number, number>>({});
  
  // Admin & Locks
  const isAdmin = user?.role === "ADMIN";
  const isStaff = user?.role === "STAFF";
  
  const selectedGroupData = groups.find(g => String(g.id) === selectedGroup);
  const isAuthorized = isAdmin || (selectedGroupData?.collectionStaff === user?.username);

  const canPostCharges = isAuthorized; // Updated to use isAuthorized
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // UI States
  const [isReceiptView, setIsReceiptView] = useState(false);

  // Modals
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<PaymentHistoryDto[]>([]);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);

  // Loan Charges
  const [chargeStatus, setChargeStatus] = useState<ChargeStatusResponse | null>(null);
  const [paidChargesMembers, setPaidChargesMembers] = useState<ChargePaymentMemberDto[]>([]);
const API_BASE = import.meta.env.VITE_API_BASE_URL;
  // 1. Fetch Groups
  useEffect(() => {
    fetch(`${API_BASE}/api/groups`, {
      headers: { "loggedInUser": user?.username || "" }
    })
    .then(res => res.ok ? res.json() : [])
    .then((data: GroupData[]) => setGroups(data))
    .catch(() => toast.error("Failed to fetch groups"));
  }, [user]);

  // Deep Link Handling
  useEffect(() => {
    const gid = searchParams.get("groupId");
    const lid = searchParams.get("loanId");
    const ino = searchParams.get("installmentNo");

    if (gid && lid && ino) {
      handleGroupChange(gid).then(() => {
        handleLoanChange(lid, gid).then(() => {
          handleDueChange(ino, gid, lid);
        });
      });
    }
  }, [searchParams]);

  // 2. Cascading selections
  const handleGroupChange = async (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedLoanId("");
    setSelectedDueNumber("");
    setCollectionData(null);
    setChargeStatus(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/loans/group/${groupId}/summary`, {
        headers: { "loggedInUser": user?.username || "" }
      });
      if (res.ok) {
        const loans: LoanSummaryResponse[] = await res.json();
        setActiveLoans(loans?.filter(l => l.status === "ACTIVE") || []);
      }
    } catch (e) { toast.error("Failed to fetch active loans"); }
  };

  const handleLoanChange = async (loanId: string, groupIdOverride?: string) => {
    const gid = groupIdOverride || selectedGroup;
    setSelectedLoanId(loanId);
    setSelectedDueNumber("");
    setCollectionData(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/loans/group/${gid}/loan/${loanId}/schedules`, {
        headers: { "loggedInUser": user?.username || "" }
      });
      if (res.ok) {
        const schedules: LoanScheduleGroupResponse[] = await res.json();
        setAvailableSchedules(schedules);
      }
      fetchLoanCharges(loanId);
    } catch (e) {}
  };

  const fetchLoanCharges = async (loanId: string) => {
      try {
        const [statusRes, payRes] = await Promise.all([
          fetch(`${API_BASE}/api/loans/${loanId}/charges/status`, { headers: { "loggedInUser": user?.username || "" } }),
          fetch(`${API_BASE}/api/loans/${loanId}/charges/payments`, { headers: { "loggedInUser": user?.username || "" } })
        ]);
        if (statusRes.ok) setChargeStatus(await statusRes.json());
        if (payRes.ok) setPaidChargesMembers(await payRes.json());
      } catch (e) {}
  };

  const handleDueChange = async (dueNum: string, gidOverride?: string, lidOverride?: string) => {
    const gid = gidOverride || selectedGroup;
    const lid = lidOverride || selectedLoanId;
    setSelectedDueNumber(dueNum);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/collection?groupId=${gid}&loanId=${lid}&installmentNo=${dueNum}`, {
        headers: { "loggedInUser": user?.username || "" }
      });
      if (!res.ok) throw new Error("Failed to load collection demand sheet");
      const collData: CollectionResponse = await res.json();
      setCollectionData(collData);
      const overrides: Record<number, number> = {};
      collData?.members?.forEach(m => {
        overrides[m.loanScheduleId] = m.status === 'UNPAID' ? m.totalDue : m.paidAmount;
      });
      setEditedEntries(overrides);
    } catch (e: any) {
      toast.error(e.message);
      setCollectionData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (schedId: number, val: number) => {
    setEditedEntries(prev => ({ ...prev, [schedId]: isNaN(val) ? 0 : val }));
  };

  const isRowDisabled = (status: string) => {
    if (status === "PAID") return true;
    if (!isAuthorized) return true; 
    return false;
  };

  const handleSaveCollection = async () => {
    if (!collectionData) return;
    let activePayload: PaymentEntryDto[] = [];
    collectionData?.members?.forEach(m => {
       const userVal = editedEntries[m.loanScheduleId];
       if (!adminEditMode && m.status === "PAID") return;
       if (userVal <= 0) return;
       activePayload.push({ loanScheduleId: m.loanScheduleId, amount: userVal });
    });
    if (activePayload.length === 0) {
       toast.warning("No payment entered! Skipping empty sync request.");
       return;
    }
    setLoading(true);
    try {
       const payloadObj = {
          loanId: Number(selectedLoanId),
          installmentNo: Number(selectedDueNumber),
          paymentDate: new Date().toISOString().split('T')[0],
          payments: activePayload
       };
       const res = await fetch(`${API_BASE}/api/payments/collect`, {
         method: "POST",
         headers: { "Content-Type": "application/json", "loggedInUser": user?.username || "" },
         body: JSON.stringify(payloadObj)
       });
       if (!res.ok) throw new Error(await res.text());
       toast.success("Collection successfully recorded!");
       setAdminEditMode(false);
       await handleDueChange(selectedDueNumber);
    } catch (e: any) {
       toast.error(e.message || "Failed to commit payments");
    } finally {
       setLoading(false);
    }
  };

  const openHistory = async (schedId: number) => {
     try {
       const res = await fetch(`${API_BASE}/api/payments/history?loanScheduleId=${schedId}`);
       if (res.ok) {
          setHistoryData(await res.json());
          setHistoryOpen(true);
          setEditingPaymentId(null);
       }
     } catch (e) { toast.error("Unable to load history log"); }
  };

  const submitPaymentEdit = async (paymentId: number, newAmount: number) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/payments/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "loggedInUser": user?.username || "" },
        body: JSON.stringify({ paymentId, newAmount, paymentDate: new Date().toISOString().split('T')[0] })
      });
      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.message || "Edit Failure");
      }
      toast.success("Payment trace updated.");
      setEditingPaymentId(null);
      await handleDueChange(selectedDueNumber); 
      setHistoryData(prev => prev.map(h => h.paymentId === paymentId ? { ...h, amount: newAmount } : h));
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const postChargePayment = async (memberId: number, loanTotalMemberBindingValue: number ) => {
     try {
       const payload: ChargePaymentRequest = { memberId, amountPaid: loanTotalMemberBindingValue };
       const res = await fetch(`${API_BASE}/api/loans/${selectedLoanId}/charges/pay`, {
         method: "POST",
         headers: { "Content-Type": "application/json", "loggedInUser": user?.username || "" },
         body: JSON.stringify(payload)
       });
       if (!res.ok) throw new Error(await res.text());
       toast.success("Charge Payment Successful");
       await fetchLoanCharges(selectedLoanId);
     } catch (e: any) { toast.error(e.message); }
  };
  const handlePrint = () => {
  const content = document.querySelector(".receipt-page")?.innerHTML;

  const win = window.open("", "", "width=900,height=700");
  if (!win || !content) return;

  win.document.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 6px; }
          th { background: #eee; }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `);

  win.document.close();
  win.print();
};

  const handleDownloadRecord = () => {
     if (!collectionData) return;
     let csv = "COLLECTION DEMAND RECORDS\n\n";
     csv += `Group,${targetGroupRef?.groupName}\n`;
     csv += `Loan ID,#${selectedLoanId}\n`;
     csv += `Installment Due,${collectionData.installmentNo} (${collectionData.dueDate})\n\n`;
     csv += `ID,Member Name,Principal,Interest,Total Due,Amount Paid,Status\n`;
     collectionData.members.forEach((m, idx) => {
        csv += `${idx+1},"${m.memberName}",${m.principal},${m.interest},${m.totalDue},${editedEntries[m.loanScheduleId] || 0},${m.status}\n`;
     });
     csv += `\nACTIVATION CHARGES\n`;
csv += `Member ID,Name,Processing Fee,Document Fee,Insurance,Savings,Total,Status\n`;

availableSchedules[0]?.members?.forEach((m) => {
  const ch = targetLoanRef?.charges;

  const total =
    (ch?.processingFee || 0) +
    (ch?.documentFee || 0) +
    (ch?.insuranceFee || 0) +
    (ch?.savingAmount || 0);

  const paid = paidChargesMembers.find(p => p.memberId === m.memberId);

  const status =
    total === 0
      ? "NIL"
      : paid
        ? "PAID"
        : "PENDING";

  csv += `${m.memberId},"${m.memberName}",${ch?.processingFee || 0},${ch?.documentFee || 0},${ch?.insuranceFee || 0},${ch?.savingAmount || 0},${total},${status}\n`;
});
     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement("a");
     link.setAttribute("href", url);
     link.setAttribute("download", `Collection_Record_${targetGroupRef?.groupName}_Due_${collectionData.installmentNo}.csv`);
     link.click();
  };

  const totalDue = collectionData?.members?.reduce((s, m) => s + m.totalDue, 0) || 0;
  const dynamicallyCollected = collectionData?.members?.reduce((s, m) => s + (editedEntries[m.loanScheduleId] || 0), 0) || 0;
  const targetGroupRef = groups.find(g => String(g.id) === selectedGroup);
  const targetLoanRef = activeLoans.find(l => String(l.id) === selectedLoanId);

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .data-table { table-layout: fixed; width: 100%; }
          .data-table th, .data-table td { padding: 10px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .amount-cell { font-family: ui-monospace; font-variant-numeric: tabular-nums; }
          .input-fixed { width: 110px !important; text-align: right; }
          
          /* Receipt Overlay Styles */
          .receipt-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: #f3f4f6; z-index: 100; overflow-y: auto;
            padding: 40px 20px; display: flex; flex-direction: column; align-items: center;
          }
          .receipt-page {
            width: 210mm; background: white; padding: 20mm; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
            color: black !important; font-family: 'Inter', sans-serif !important;
          }
          .dotted-summary { display: flex; align-items: baseline; gap: 8px; font-weight: 800; text-transform: uppercase; }
          .dotted-spacer { border-bottom: 2px dotted #000; flex-grow: 1; margin-bottom: 4px; opacity: 0.3; }
        }
        @media print {
  body * {
    visibility: hidden !important;
  }

  .receipt-overlay,
  .receipt-overlay * {
    visibility: visible !important;
  }

  .receipt-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }

  .no-print {
    display: none !important;
  }

  table {
    border-collapse: collapse;
  }

  th, td {
    border: 1px solid #000 !important;
  }

  th {
    background: #f3f4f6 !important;
    -webkit-print-color-adjust: exact;
  }
}
      `}} />

      {isReceiptView ? (
        <div className="receipt-overlay">
          <div className="w-[210mm] mb-6 flex justify-between items-center no-print">
             <Button variant="outline" className="gap-2" onClick={() => setIsReceiptView(false)}>
                <ArrowLeft className="h-4 w-4" /> Back to Collection Entry
             </Button>
             <div className="flex gap-2">
                <Button onClick={handlePrint}>
                  Print Document
                </Button> 
             </div>
          </div>
          
          <div className="receipt-page">
             {/* HEADER */}
             <div className="flex justify-between items-start mb-1">
                <div>
                  <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">MicroFinance Pro</h1>
                  <p className="text-[9px] font-bold tracking-[0.15em] mt-1 opacity-60">INSTITUTIONAL GRADE FINANCIAL RECORDS</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black uppercase leading-none">Collection Receipt</h2>
                  <p className="text-[10px] font-bold mt-2">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                </div>
             </div>
             <div className="border-t-[4px] border-black my-6"></div>

             {/* DETAILS */}
             <div className="grid grid-cols-2 gap-x-20 gap-y-3 mb-10 text-[11pt] font-semibold">
                <div className="flex justify-between">
                  <span className="opacity-50 text-[9pt]">GROUP NAME:</span>
                  <span className="font-black uppercase">{targetGroupRef?.groupName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50 text-[9pt]">INSTALLMENT NO:</span>
                  <span className="font-black text-2xl leading-none mt-[-2px]">{collectionData?.installmentNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50 text-[9pt]">LOAN ACCOUNT:</span>
                  <span className="font-black uppercase">#{selectedLoanId}</span>
                </div>
                <div className="flex justify-between border-b-2 border-black pb-1">
                  <span className="opacity-50 text-[9pt]">DUE DATE:</span>
                  <span className="font-black uppercase">{collectionData?.dueDate}</span>
                </div>
             </div>

             {/* INSTALLMENT TABLE */}
             <div className="mb-10">
                <h3 className="text-xs font-black uppercase mb-3 px-1 border-l-4 border-black">Member Installment Collection</h3>
                <table className="w-full border-collapse border border-black text-[10pt]">
                   <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-black p-2 w-10 text-center font-black">#</th>
                        <th className="border border-black p-2 text-left font-black">MEMBER NAME</th>
                        <th className="border border-black p-2 text-right font-black">PRINCIPAL</th>
                        <th className="border border-black p-2 text-right font-black">INTEREST</th>
                        <th className="border border-black p-2 text-right font-black">TOTAL DUE</th>
                        <th className="border border-black p-2 text-center font-black">STATUS</th>
                      </tr>
                   </thead>
                   <tbody>
                      {collectionData?.members.map((m, i) => {
                         const editVal = editedEntries[m.loanScheduleId] || 0;
                         return (
                           <tr key={i}>
                             <td className="border border-black p-2 text-center font-bold opacity-30">{(i+1).toString().padStart(2, '0')}</td>
                             <td className="border border-black p-2 font-black uppercase text-sm">{m.memberName}</td>
                             <td className="border border-black p-2 text-right amount-cell tabular-nums">₹{m.principal?.toLocaleString()}</td>
                             <td className="border border-black p-2 text-right amount-cell tabular-nums">₹{m.interest?.toLocaleString()}</td>
                             <td className="border border-black p-2 text-right font-black amount-cell tabular-nums bg-gray-50/50">₹{m.totalDue?.toLocaleString()}</td>
                             <td className="border border-black p-2 text-center">
                                <span className={`inline-block w-20 py-1 text-[8pt] font-black uppercase rounded ${
                                   m.status === 'PAID' ? 'bg-success text-white' : 
                                   m.status === 'PARTIAL' ? 'bg-yellow-400 text-black' : 'bg-destructive text-white'
                                }`}>{m.status}</span>
                             </td>
                           </tr>
                         );
                      })}
                   </tbody>
                   <tfoot>
                      <tr className="bg-white border-t-[3px] border-black font-black text-base">
                        <td colSpan={2} className="border border-black p-3 text-right">AGGREGATE TOTALS</td>
                        <td className="border border-black p-3 text-right amount-cell tabular-nums">₹{collectionData?.members.reduce((s, m) => s + (m.principal || 0), 0).toLocaleString()}</td>
                        <td className="border border-black p-3 text-right amount-cell tabular-nums">₹{collectionData?.members.reduce((s, m) => s + (m.interest || 0), 0).toLocaleString()}</td>
                        <td className="border border-black p-3 text-right amount-cell tabular-nums bg-gray-50">₹{totalDue.toLocaleString()}</td>
                        <td className="border border-black p-3 text-center amount-cell tabular-nums text-success">₹{dynamicallyCollected.toLocaleString()}</td>
                      </tr>
                   </tfoot>
                </table>
             </div>

             {/* CHARGES BREAKDOWN */}
             {chargeStatus && (
                <div className="mb-10">
                   <h3 className="text-xs font-black uppercase mb-3 px-1 border-l-4 border-black">Loan Activation Charges Breakdown</h3>
                   <table className="w-full border-collapse border border-black text-[9pt]">
                      <thead className="bg-gray-100">
                         <tr>
                            <th className="border border-black p-1.5 w-10 text-center font-black">#</th>
                            <th className="border border-black p-1.5 text-left font-black">MEMBER NAME</th>
                            <th className="border border-black p-1.5 text-right font-black">PROC. FEE</th>
                            <th className="border border-black p-1.5 text-right font-black">DOC. FEE</th>
                            <th className="border border-black p-1.5 text-right font-black">INS. FEE</th>
                            <th className="border border-black p-1.5 text-right font-black">SAVINGS</th>
                            <th className="border border-black p-1.5 text-right font-black">TOTAL</th>
                            <th className="border border-black p-1.5 text-center font-black">STATUS</th>
                         </tr>
                      </thead>
                      <tbody>
  {availableSchedules[0]?.members?.map((m, i) => {
    const specificPayMatch = paidChargesMembers.find(p => p.memberId === m.memberId);
    const ch = targetLoanRef?.charges;

    const total = targetLoanRef
      ? (ch?.documentFee || 0) +
        (ch?.insuranceFee || 0) +
        (ch?.processingFee || 0) +
        (ch?.savingAmount || 0)
      : 0;

    //  FIXED LOGIC (move outside JSX)
    const isZeroCharge = total === 0;

    const statusText = isZeroCharge
      ? 'NIL'
      : specificPayMatch
        ? 'PAID'
        : 'PENDING';

    return (
      <tr key={i}>
        <td className="border border-black p-1.5 text-center font-bold opacity-30">
          {i + 1}
        </td>

        <td className="border border-black p-1.5 font-bold uppercase">
          {m.memberName}
        </td>

        <td className="border border-black p-1.5 text-right">
          ₹{ch?.processingFee || 0}
        </td>

        <td className="border border-black p-1.5 text-right">
          ₹{ch?.documentFee || 0}
        </td>

        <td className="border border-black p-1.5 text-right">
          ₹{ch?.insuranceFee || 0}
        </td>

        <td className="border border-black p-1.5 text-right">
          ₹{ch?.savingAmount || 0}
        </td>

        <td className="border border-black p-1.5 text-right font-black">
          ₹{total.toLocaleString()}
        </td>

        <td className="border border-black p-1.5 text-center">
          <span
            className={`inline-block py-0.5 w-16 text-[7pt] font-black uppercase rounded ${
              statusText === 'PAID'
                ? 'bg-green-600 text-white'
                : statusText === 'PENDING'
                ? 'bg-red-600 text-white'
                : 'bg-gray-300 text-black'
            }`}
          >
            {statusText}
          </span>
        </td>
      </tr>
    );
  })}
</tbody>
                   </table>
                </div>
             )}

             {/* DOTTED SUMMARY */}
             <div className="mt-12 space-y-4 max-w-[450px] ml-auto">
                <div className="dotted-summary text-base">
                   <span>Total Charges Collected</span>
                   <div className="dotted-spacer"></div>
                   <span className="tabular-nums">₹{dynamicallyCollected.toLocaleString()}</span>
                </div>
                <div className="dotted-summary text-sm opacity-70">
                   <span>Total Members Registered</span>
                   <div className="dotted-spacer"></div>
                   <span className="tabular-nums">{targetLoanRef?.totalMembers || 0}</span>
                </div>
                <div className="dotted-summary text-sm opacity-70">
                   <span>Members with Paid Charges</span>
                   <div className="dotted-spacer"></div>
                   <span className="tabular-nums">{paidChargesMembers.length}</span>
                </div>
                <div className="dotted-summary text-sm text-destructive">
                   <span>Remaining Members Pending</span>
                   <div className="dotted-spacer"></div>
                   <span className="tabular-nums">{(targetLoanRef?.totalMembers || 0) - paidChargesMembers.length}</span>
                </div>
             </div>

             {/* SIGNATURE */}
             <div className="mt-24 flex justify-between items-end">
                <div className="text-center">
                   <div className="border-b-2 border-black w-56 mb-2"></div>
                   <p className="text-[10pt] font-black uppercase tracking-widest opacity-40">Authorized Seal & Signature</p>
                </div>
                <p className="text-[8pt] italic opacity-30 max-w-[320px] text-right leading-tight">
                   System generated financial document for {targetGroupRef?.groupName}. Verified against live ledger logs. No manual stamp required unless specified by regional audit.
                </p>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* HEADER SECTION */}
          <div className="flex items-center justify-between no-print">
            <div className="flex flex-col">
              <h2 className="page-header mb-0 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Collection Entry
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-semibold">Live Gateway — Real-time Sync</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1 border-primary/20 h-9" onClick={handleDownloadRecord} disabled={!collectionData}>
                <Download className="h-3.5 w-3.5 text-primary" /> Export CSV
              </Button>
              
              <Button variant="default" size="sm" className="gap-1 shadow-sm h-9 bg-primary/90" onClick={() => setIsReceiptView(true)} disabled={!collectionData}>
                <Printer className="h-3.5 w-3.5" /> Print Sheet
              </Button>
            </div>
          </div>

          {/* FILTER CONTROLS */}
          <div className="form-section no-print shadow-sm border border-border/40 p-5 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Select Group</Label>
                <Select value={selectedGroup} onValueChange={handleGroupChange}>
                  <SelectTrigger className="h-9 shadow-sm"><SelectValue placeholder="Target Group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.groupName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Active Loan</Label>
                <Select value={selectedLoanId} onValueChange={handleLoanChange} disabled={activeLoans.length === 0 || !selectedGroup}>
                  <SelectTrigger className="h-9 shadow-sm"><SelectValue placeholder={!selectedGroup ? "Waiting..." : (activeLoans.length === 0 ? "No active loans" : "Target Loan")} /></SelectTrigger>
                  <SelectContent>
                    {activeLoans.map(l => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        ID: #{l.id} - ₹{l.totalPrincipal?.toLocaleString()} ({l.collectionType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Installment Selection</Label>
                <Select value={selectedDueNumber} onValueChange={handleDueChange} disabled={availableSchedules.length === 0 || !selectedLoanId}>
                  <SelectTrigger className="h-9 shadow-sm"><SelectValue placeholder="Due Date" /></SelectTrigger>
                  <SelectContent>
                    {availableSchedules.map(d => (
                      <SelectItem key={d.installmentNo} value={String(d.installmentNo)}>
                         {d.installmentNo} ({d.dueDate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full h-9 gap-2 font-bold shadow-md bg-primary hover:bg-primary/90" onClick={handleSaveCollection} disabled={!collectionData || loading || !isAuthorized}>
                  <Save className="h-4 w-4" /> {loading ? "Syncing..." : "Commit Collection"}
                </Button>
              </div>
            </div>
          </div>

          {isAdmin && collectionData && (
            <div className="flex bg-amber-50 border border-amber-200 p-3 rounded-lg no-print items-center gap-4">
               <ShieldAlert className="h-5 w-5 text-amber-600" />
               <div className="flex-1">
                 <h4 className="text-[11px] font-black text-amber-900 uppercase">Admin Override Active</h4>
                 <p className="text-[10px] text-amber-700 mt-0.5">Historical edit mode engaged. This unlocks strictly locked PAID records for correction.</p>
               </div>
               <Switch checked={adminEditMode} onCheckedChange={setAdminEditMode} className="data-[state=checked]:bg-amber-600" />
            </div>
          )}

          {!isAdmin && isStaff && selectedGroup && !isAuthorized && (
             <div className="flex bg-rose-50 border border-rose-200 p-3 rounded-lg no-print items-center gap-4">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                <div className="flex-1">
                  <h4 className="text-[11px] font-black text-rose-900 uppercase">Restricted Access</h4>
                  <p className="text-[10px] text-rose-700 mt-0.5">You are not the assigned collector for this group. Collection entry is locked for your account.</p>
                </div>
             </div>
          )}

          {/* RENDER DEMAND PAYMENT SHEET */}
          {collectionData ? (
            <div className="form-section no-print p-0 overflow-hidden shadow-md border border-border/40 bg-white">
              <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-tight">
                    Group: {targetGroupRef?.groupName} — Installment #{collectionData.installmentNo}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-bold">
                    Loan ID: #{selectedLoanId} — Expected Date: <span className="text-primary">{collectionData.dueDate}</span>
                  </p>
                </div>
                <div className="flex gap-10">
                  <div className="text-right">
                    <span className="block text-[10px] text-muted-foreground font-bold uppercase">Demand Amount</span>
                    <span className="text-lg font-black text-foreground tabular-nums">₹{totalDue.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-success font-bold uppercase">Collection Today</span>
                    <span className="text-lg font-black text-success tabular-nums">₹{dynamicallyCollected.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <table className="data-table text-xs">
                <thead className="bg-gray-100/80 border-b uppercase">
                  <tr>
                    <th className="w-12 text-center">#</th>
                    <th className="text-left">Member Reference</th>
                    <th className="text-right w-24">Principal</th>
                    <th className="text-right w-24">Interest</th>
                    <th className="text-right w-28">Total Due</th>
                    <th className="text-center w-24">Status</th>
                    <th className="text-right w-44">Collection Input</th>
                    <th className="text-right w-32">Balance</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {collectionData?.members?.map((m, idx) => {
                    const editVal = editedEntries[m.loanScheduleId] || 0;
                    const remainingBeforeEntry = m.totalDue - (m.paidAmount || 0);
                    const dynamicBalance = remainingBeforeEntry - editVal;
                    
                    return (
                      <tr key={m.loanScheduleId} className={`hover:bg-muted/5 transition-colors ${m.status === 'PAID' ? 'bg-gray-50/50 grayscale-[0.3]' : ''}`}>
                        <td className="text-center text-muted-foreground font-mono opacity-60">{(idx + 1).toString().padStart(2, '0')}</td>
                        <td className="font-bold text-foreground text-sm uppercase">{m.memberName}</td>
                        <td className="text-right amount-cell text-muted-foreground opacity-80">₹{m.principal?.toLocaleString()}</td>
                        <td className="text-right amount-cell text-muted-foreground opacity-80">₹{m.interest?.toLocaleString()}</td>
                        <td className="text-right amount-cell font-black text-foreground">₹{m.totalDue?.toLocaleString()}</td>
                        <td className="text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                            m.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            m.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>{m.status}</span>
                        </td>
                        <td className="flex justify-end p-2 px-6">
                          <Input
                            type="number"
                            value={editVal}
                            disabled={isRowDisabled(m.status)}
                            onChange={e => handleAmountChange(m.loanScheduleId, Number(e.target.value))}
                            className={`h-8 font-black text-right input-fixed ${isRowDisabled(m.status) ? 'bg-gray-100 border-transparent shadow-none' : 'border-primary/20 focus:border-primary shadow-sm'}`}
                          />
                        </td>
                        <td className={`text-right amount-cell font-black ${dynamicBalance > 0 ? "text-rose-600" : (dynamicBalance < 0 ? "text-amber-600" : "text-emerald-700")}`}>
                          ₹{dynamicBalance?.toLocaleString()}
                        </td>
                        <td className="px-2">
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => openHistory(m.loanScheduleId)}>
                              <History className="h-4 w-4" />
                           </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-black border-t-2">
                    <td colSpan={2} className="p-4 uppercase text-[10px] tracking-widest text-muted-foreground">Session Aggregate Demand</td>
                    <td className="text-right p-4 amount-cell">₹{collectionData?.members?.reduce((s, m) => s + (m.principal || 0), 0).toLocaleString()}</td>
                    <td className="text-right p-4 amount-cell">₹{collectionData?.members?.reduce((s, m) => s + (m.interest || 0), 0).toLocaleString()}</td>
                    <td className="text-right p-4 amount-cell bg-gray-100">₹{totalDue.toLocaleString()}</td>
                    <td></td>
                    <td className="text-right p-4 amount-cell text-emerald-700 text-lg">₹{dynamicallyCollected.toLocaleString()}</td>
                    <td className="text-right p-4 amount-cell text-rose-600">₹{(totalDue - dynamicallyCollected).toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : loading ? (
            <div className="form-section text-center py-20 bg-muted/5 border-dashed border-2 no-print">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary opacity-20" />
              <h3 className="text-xl font-black text-foreground/80 uppercase tracking-tighter">Fetching Demand Sheet...</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2 animate-pulse">Syncing with ledger logs</p>
            </div>
          ) : (
            <div className="form-section text-center py-20 bg-muted/5 border-dashed border-2 no-print">
              <ReceiptText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
              <h3 className="text-xl font-black text-foreground/80 uppercase">Pending Selection</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">Activate parameters in the top ribbon to load the real-time collection demand matrix.</p>
            </div>
          )}

          {/* LOAN CHARGES COMPONENT */}
          {selectedLoanId && chargeStatus && (
            <div className="form-section no-print p-0 overflow-hidden border border-border/40 shadow-md bg-white mt-4">
              <div className="p-4 bg-emerald-50/30 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><ShieldAlert className="h-5 w-5" /></div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-900 uppercase">Activation Charges Ledger</h3>
                    <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-tight">Post-Initialization Fee Collection</p>
                  </div>
                </div>
                <div className="flex gap-6 text-center">
                   <div><span className="block text-[10px] font-bold text-emerald-700 uppercase">Units</span><span className="font-black text-emerald-900">{targetLoanRef?.totalMembers || 0}</span></div>
                   <div><span className="block text-[10px] font-bold text-emerald-700 uppercase">Paid</span><span className="font-black text-success">{paidChargesMembers.length}</span></div>
                   <div><span className="block text-[10px] font-bold text-rose-600 uppercase">Due</span><span className="font-black text-rose-700">{(targetLoanRef?.totalMembers || 0) - paidChargesMembers.length}</span></div>
                </div>
              </div>
              
              <table className="data-table text-xs">
                <thead className="bg-gray-100 border-b uppercase">
                  <tr>
                    <th className="text-center w-12">#</th>
                    <th className="text-left">Member Detail</th>
                    <th className="text-right w-24">Proc Fee</th>
                    <th className="text-right w-24">Doc Fee</th>
                    <th className="text-right w-24">Ins Fee</th>
                    <th className="text-right w-24">Savings</th>
                    <th className="text-right w-28 font-black">Total</th>
                    <th className="text-center w-32">Status</th>
                    <th className="w-32 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {availableSchedules[0]?.members?.map((m, idx) => {
                    const specificPayMatch = paidChargesMembers.find(p => p.memberId === m.memberId);
                    const ch = targetLoanRef?.charges;
                    const totalValue = targetLoanRef ? (ch?.documentFee || 0) + (ch?.insuranceFee || 0) + (ch?.processingFee || 0) + (ch?.savingAmount || 0) : 0;
                    const isMarkedPaid = specificPayMatch !== undefined;
                    const statusText = totalValue === 0 ? 'NIL' : isMarkedPaid ? 'PAID' : 'PENDING';
                    const format = (v: any) => v === 0 || !v ? <span className="opacity-30">nil</span> : `₹${v.toLocaleString()}`;

                    return (
                      <tr key={m.memberId} className={`hover:bg-muted/5 ${!isMarkedPaid && totalValue > 0 ? 'bg-rose-50/10' : ''}`}>
                        <td className="text-center opacity-70 font-mono font-semibold">{(idx+1).toString().padStart(2, '0')}</td>
                        <td className="font-black uppercase text-foreground">{m.memberName}</td>
                        <td className="text-right opacity-70"> {format(ch?.processingFee)} </td>
                        <td className="text-right opacity-70"> {format(ch?.documentFee)} </td>
                        <td className="text-right opacity-70"> {format(ch?.insuranceFee)} </td>
                        <td className="text-right opacity-70"> {format(ch?.savingAmount)} </td>
                        <td className="text-right font-black text-primary">₹{totalValue.toLocaleString()}</td>
                        <td className="text-center">
                          

<span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
  statusText === 'PAID'
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
    : statusText === 'PENDING'
    ? 'bg-rose-100 text-rose-800 border-rose-300'
    : 'bg-gray-200 text-gray-800 border-gray-400'
}`}>
  {statusText}
</span>
                        </td>
                        <td className="px-4 py-1.5">
                          <Button size="sm" variant="outline" className={`h-7 w-full text-[10px] font-black uppercase transition-all ${isMarkedPaid ? 'border-emerald-200 text-emerald-700' : 'border-success text-success hover:bg-success hover:text-white'}`}
                            disabled={isMarkedPaid || totalValue === 0 || !canPostCharges}
                            onClick={() => postChargePayment(m.memberId, totalValue)}>
                            {isMarkedPaid ? 'Cleared' : 'Pay Fees'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* HISTORY MODAL DIALOG */}
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogContent className="max-w-sm overflow-hidden p-0 border-none shadow-2xl">
              <div className="bg-primary p-4 text-primary-foreground">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 uppercase tracking-widest text-xs font-black">
                    <History className="h-4 w-4" /> Payment Ledger Trace
                  </DialogTitle>
                </DialogHeader>
              </div>
              <div className="p-4 bg-white space-y-3">
                {historyData.length === 0 ? (
                   <p className="text-xs text-muted-foreground text-center py-6 font-bold uppercase opacity-40">No entries in log</p>
                ) : (
                   historyData.map((h, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-lg hover:border-primary/50 transition-colors">
                        {editingPaymentId === h.paymentId ? (
                            <div className="flex items-center gap-2 w-full">
                               <Input type="number" className="h-8 font-black text-right" autoFocus value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} />
                               <div className="flex gap-1">
                                 <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => submitPaymentEdit(h.paymentId, editAmount)}><Check className="h-4 w-4"/></Button>
                                 <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setEditingPaymentId(null)}><X className="h-4 w-4"/></Button>
                               </div>
                            </div>
                        ) : (
                          <>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-foreground">₹{h.amount?.toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">{h.collectedBy} — {h.paymentDate}</span>
                            </div>
                            {adminEditMode && isAdmin && (
                               <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => { setEditingPaymentId(h.paymentId); setEditAmount(h.amount); }}>
                                  <Pencil className="h-4 w-4" />
                               </Button>
                            )}
                          </>
                        )}
                      </div>
                   ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
