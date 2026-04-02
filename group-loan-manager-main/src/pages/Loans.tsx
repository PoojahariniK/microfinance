import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Eye, Calendar, AlertTriangle, CheckCircle2, UserPlus, ArrowLeft, ArrowRight, Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  LoanInitRequest, LoanDraftDto, LoanSchedulePreviewDto, 
  LoanConfirmRequest, MemberScheduleDto, LoanScheduleGroupResponse,
  AddMemberScheduleDto, LoanSummaryResponse, EditMemberScheduleRequest,
  EditLoanRequest, LoanChargesDto, AddMemberPreviewResponse, AddMemberConfirmRequest
} from "@/types/loanTypes";

interface GroupData {
  id: number;
  groupName: string;
  collectionType: string;
}

interface Member {
  id: number;
  name: string;
}

export default function Loans() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loans, setLoans] = useState<LoanScheduleGroupResponse[]>([]);
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLoans, setFetchingLoans] = useState(false);
  const [error, setError] = useState("");
  
  // View mode management
  const [viewMode, setViewMode] = useState<"SUMMARY" | "SCHEDULE">("SUMMARY");
  const [loanSummaries, setLoanSummaries] = useState<LoanSummaryResponse[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);

  const [open, setOpen] = useState(false);
  const [viewLoan, setViewLoan] = useState<LoanScheduleGroupResponse | null>(null);

  // Edit Loan state
  const [editLoanOpen, setEditLoanOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanSummaryResponse | null>(null);
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editCharges, setEditCharges] = useState<LoanChargesDto>({
    processingFee: 0,
    documentFee: 0,
    insuranceFee: 0,
    savingAmount: 0
  });

  // Filter state
  const [filterGroupId, setFilterGroupId] = useState<string>("");

  // Create Form state
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("2");
  const [duration, setDuration] = useState("12");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [savingAmount, setSavingAmount] = useState("0");
  const [insuranceFee, setInsuranceFee] = useState("0");
  const [processingFee, setProcessingFee] = useState("0");
  const [documentFee, setDocumentFee] = useState("0");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [step, setStep] = useState(1);
  const [loanDraft, setLoanDraft] = useState<LoanDraftDto | null>(null);
  const [editableSchedule, setEditableSchedule] = useState<LoanSchedulePreviewDto[]>([]);
  const [targetLoanId, setTargetLoanId] = useState<number | null>(null);
  const [targetMemberId, setTargetMemberId] = useState("");
  const [targetLoanMemberIds, setTargetLoanMemberIds] = useState<number[]>([]);

  // Add Member to Loan state
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberStep, setAddMemberStep] = useState(1);
  const [addMemberDraft, setAddMemberDraft] = useState<AddMemberPreviewResponse | null>(null);
  const [addMemberSchedule, setAddMemberSchedule] = useState<AddMemberScheduleDto[]>([]);

  // Member Schedule Edit state
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingMemberName, setEditingMemberName] = useState("");
  const [memberSchedules, setMemberSchedules] = useState<MemberScheduleDto[]>([]);
const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const currentLoanSummary = useMemo(() => 
     loanSummaries.find(l => l.id === selectedLoanId),
     [loanSummaries, selectedLoanId]
  );
  const isLoanClosed = currentLoanSummary?.status === "CLOSED";

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/groups`, {
        headers: { "loggedInUser": user.username },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  }, [user]);

  const fetchLoanSummaries = useCallback(async (groupId?: string) => {
    if (!user) return;
    setFetchingLoans(true);
    try {
      const url = groupId 
        ? `${API_BASE}/api/loans/group/${groupId}/summary`
        : `${API_BASE}/api/loans/summary`;
        
      const res = await fetch(url, {
        headers: { "loggedInUser": user.username },
      });
      if (res.ok) {
        const data = await res.json();
        setLoanSummaries(data);
      } else {
        setLoanSummaries([]);
      }
    } catch (err) {
      console.error("Failed to fetch loan summaries", err);
      toast.error("Failed to fetch loan summaries");
    } finally {
      setFetchingLoans(false);
    }
  }, [user]);

  const fetchLoans = useCallback(async (groupId: string, loanId: number | null) => {
    if (!user || !groupId || !loanId) return;
    setFetchingLoans(true);
    try {
      const res = await fetch(`${API_BASE}/api/loans/group/${groupId}/loan/${loanId}/schedules`, {
        headers: { "loggedInUser": user.username },
      });
      if (res.ok) {
        const data = await res.json();
        setLoans(data);
      } else {
        setLoans([]);
      }
    } catch (err) {
      console.error("Failed to fetch loans", err);
      toast.error("Failed to fetch installments");
    } finally {
      setFetchingLoans(false);
    }
  }, [user]);

  const fetchGroupMembers = useCallback(async (groupId: string) => {
    if (!user || !groupId) return;
    try {
      const res = await fetch(`${API_BASE}/api/members/group/${groupId}`, {
        headers: { "loggedInUser": user.username },
      });
      if (res.ok) {
        const data = await res.json();
        setGroupMembers(data);
        setSelectedMemberIds(data.map((m: any) => m.id));
      }
    } catch (err) {
      console.error("Failed to fetch members", err);
    }
  }, [user]);

  useEffect(() => {
    fetchGroups();
    fetchLoanSummaries();
  }, [fetchGroups, fetchLoanSummaries]);

  useEffect(() => {
    if (filterGroupId && selectedLoanId) {
       fetchLoans(filterGroupId, selectedLoanId);
       setViewMode("SCHEDULE");
    } else {
       fetchLoanSummaries(filterGroupId);
       setViewMode("SUMMARY");
    }
  }, [filterGroupId, selectedLoanId, fetchLoanSummaries, fetchLoans]);

  useEffect(() => {
    if (selectedGroupId && open) {
      fetchGroupMembers(selectedGroupId);
    }
  }, [selectedGroupId, open, fetchGroupMembers]);

  const handleInit = async () => {
    if (!selectedGroupId || !loanAmount || !user) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/loans/init`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "loggedInUser": user.username 
        },
        body: JSON.stringify({
          groupId: parseInt(selectedGroupId),
          totalLoanAmount: parseFloat(loanAmount),
          interestRate: parseFloat(interestRate),
          durationMonths: parseInt(duration),
          startDate,
          endDate,
          memberIds: selectedMemberIds,
          charges: { 
            savingAmount: parseFloat(savingAmount), 
            insuranceFee: parseFloat(insuranceFee),
            processingFee: parseFloat(processingFee),
            documentFee: parseFloat(documentFee)
          }
        } as LoanInitRequest)
      });

      if (!res.ok) throw new Error(await res.text() || "Failed to initialize loan");
      
      const draftData = await res.json();
      setLoanDraft(draftData);
      
      const previewRes = await fetch(`${API_BASE}/api/loans/preview-schedule`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "loggedInUser": user.username 
        },
        body: JSON.stringify(draftData)
      });

      if (!previewRes.ok) throw new Error(await previewRes.text() || "Failed to generate preview");
      
      const previewData = await previewRes.json();
      setEditableSchedule(previewData);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!loanDraft || !user) return;
    setLoading(true);

    const confirmRequest: LoanConfirmRequest = {
      draft: loanDraft,
      schedules: editableSchedule
    };

    try {
      const res = await fetch(`${API_BASE}/api/loans/confirm`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "loggedInUser": user.username 
        },
        body: JSON.stringify(confirmRequest)
      });

      if (!res.ok) throw new Error(await res.text() || "Failed to confirm loan");
      
      setStep(3);
      toast.success("Group loan created successfully!");
      if (filterGroupId === selectedGroupId) {
        fetchLoanSummaries(filterGroupId);
        fetchLoans(filterGroupId, selectedLoanId);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemberPreview = async () => {
    if (!targetLoanId || !targetMemberId || !user) return;
    
    setLoading(true);
    try {
      // Task 3: Active Loan Warning
      const statusRes = await fetch(`${API_BASE}/api/loans/member/${targetMemberId}/active-loan/exists`, {
        headers: { "loggedInUser": user.username }
      });
      if (statusRes.ok) {
        const hasActive = await statusRes.json();
        if (hasActive) {
          const confirmed = window.confirm("This member already has an active loan. Are you sure you want to proceed?");
          if (!confirmed) {
            setLoading(false);
            return;
          }
        }
      }

      const res = await fetch(`${API_BASE}/api/loans/${targetLoanId}/add-member/preview`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "loggedInUser": user.username 
        },
        body: JSON.stringify({ loanId: targetLoanId, memberId: Number(targetMemberId) })
      });

      if (!res.ok) throw new Error(await res.text() || "Failed to preview member addition");
      
      const data = await res.json();
      setAddMemberDraft(data); // Store the whole response including principalAmount and memberId
      setAddMemberSchedule(data.schedules);
      setAddMemberStep(2);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemberConfirm = async () => {
    if (!addMemberDraft || !targetLoanId || !user) return;
    setLoading(true);
    try {
      const confirmPayload: AddMemberConfirmRequest = { 
        memberId: Number(targetMemberId),
        principalAmount: addMemberDraft.principalAmount,
        schedules: addMemberSchedule
      };

      const res = await fetch(`${API_BASE}/api/loans/${targetLoanId}/add-member/confirm`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "loggedInUser": user.username 
        },
        body: JSON.stringify(confirmPayload)
      });

      if (!res.ok) throw new Error(await res.text() || "Failed to confirm member addition");
      
      setAddMemberStep(3);
      toast.success("Member added to loan successfully!");
      if (filterGroupId) fetchLoans(filterGroupId, selectedLoanId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMemberSchedule = async () => {
    if (!targetLoanId || !editingMemberId || !user) return;
    setLoading(true);
    try {
      const req: any = { // Using any to bypass strict type check for now if needed, or update the interface
        loanId: targetLoanId,
        memberId: editingMemberId,
        schedules: memberSchedules.map(s => ({
          loanScheduleId: s.loanScheduleId,
          memberId: editingMemberId,
          principal: s.principal,
          interest: s.interest,
          total: s.principal + s.interest,
          installmentNo: s.installmentNo,
          dueDate: s.dueDate
        }))
      };

      const res = await fetch(`${API_BASE}/api/loans/schedules/member/edit`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "loggedInUser": user.username 
        },
        body: JSON.stringify(req)
      });

      if (!res.ok) throw new Error(await res.text() || "Failed to update member schedule");
      
      toast.success("Member schedule updated successfully!");
      setEditMemberOpen(false);
      if (filterGroupId) fetchLoans(filterGroupId, selectedLoanId);
      setViewLoan(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberScheduleForEdit = async (loanId: number, groupId: string, memberId: number, memberName: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/loans/group/${groupId}/loan/${loanId}/member/${memberId}/schedules`, {
        headers: { "loggedInUser": user.username }
      });
      if (res.ok) {
        const data = await res.json();
        setMemberSchedules(data);
        setEditingMemberId(memberId);
        setEditingMemberName(memberName);
        setTargetLoanId(loanId);
        setEditMemberOpen(true);
      }
    } catch (err) {
      toast.error("Failed to fetch member schedule");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (ls: LoanSummaryResponse) => {
    setEditingLoan(ls);
    setEditStatus(ls.status || "ACTIVE");
    setEditCharges({
      processingFee: ls.charges?.processingFee || 0,
      documentFee: ls.charges?.documentFee || 0,
      insuranceFee: ls.charges?.insuranceFee || 0,
      savingAmount: ls.charges?.savingAmount || 0,
    });
    setEditLoanOpen(true);
  };

  const handleEditLoanSubmit = async () => {
    if (!editingLoan || !user) return;
    setLoading(true);
    try {
      const payload: EditLoanRequest = {
        status: editStatus,
        charges: editCharges
      };
      const res = await fetch(`${API_BASE}/api/loans/edit/${editingLoan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "loggedInUser": user.username
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to update loan");
      toast.success("Loan updated successfully!");
      setEditLoanOpen(false);
      fetchLoanSummaries(filterGroupId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedGroupId("");
    setLoanAmount("");
    setInterestRate("2");
    setDuration("12");
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate("");
    setSavingAmount("0");
    setInsuranceFee("0");
    setProcessingFee("0");
    setDocumentFee("0");
    setStep(1);
    setLoanDraft(null);
    setEditableSchedule([]);
    setError("");
    setAddMemberOpen(false);
    setAddMemberStep(1);
    setAddMemberDraft(null);
    setAddMemberSchedule([]);
    setTargetMemberId("");
    setEditMemberOpen(false);
    setEditingMemberId(null);
    setMemberSchedules([]);
    setTargetLoanMemberIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="page-header mb-0">Group Loans</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
            <Label className="text-sm whitespace-nowrap">Filter Group:</Label>
            <Select value={filterGroupId} onValueChange={(v) => { setFilterGroupId(v); setSelectedLoanId(null); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id.toString()}>
                    {g.groupName} ({g.collectionType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isAdmin && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />New Group Loan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto pt-10">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {step === 1 && "Create Group Loan - Step 1: Initialization"}
                    {step === 2 && "Create Group Loan - Step 2: Preview & Adjust Schedule"}
                    {step === 3 && "Create Group Loan - Success"}
                  </DialogTitle>
                </DialogHeader>

                {step === 1 && (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Select Group *</Label>
                        <Select value={selectedGroupId} onValueChange={(v) => { setSelectedGroupId(v); setError(""); }}>
                          <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                          <SelectContent>
                            {groups.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.groupName} ({g.collectionType})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Total Loan Amount *</Label>
                        <Input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} placeholder="₹" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Interest Rate (% per month)</Label>
                        <Input type="number" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Duration (months)</Label>
                        <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Start Date</Label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">End Date</Label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label className="text-xs">Saving Amount (per member)</Label>
                        <Input type="number" value={savingAmount} onChange={e => setSavingAmount(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Insurance Fee (per member)</Label>
                        <Input type="number" value={insuranceFee} onChange={e => setInsuranceFee(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Processing Fee (per member)</Label>
                        <Input type="number" value={processingFee} onChange={e => setProcessingFee(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Document Fee (per member)</Label>
                        <Input type="number" value={documentFee} onChange={e => setDocumentFee(e.target.value)} />
                      </div>
                    </div>

                    {selectedGroupId && groupMembers.length > 0 && (
                      <div className="space-y-2 pt-4 border-t">
                        <Label className="text-xs font-semibold">Select Members ({selectedMemberIds.length} / {groupMembers.length})</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                          {groupMembers.map(m => (
                            <div key={m.id} className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id={`m-${m.id}`} 
                                checked={selectedMemberIds.includes(m.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedMemberIds([...selectedMemberIds, m.id]);
                                  else setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.id));
                                }}
                              />
                              <label htmlFor={`m-${m.id}`} className="text-xs cursor-pointer">{m.name}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {error && <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</div>}
                    
                    <Button onClick={handleInit} disabled={loading} className="w-full">
                      {loading ? "Generating Draft..." : "Generate Schedule Preview"}
                    </Button>
                  </div>
                )}

                {step === 2 && loanDraft && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-xs">
                       <div><strong>Amount:</strong> ₹{loanDraft.totalLoanAmount.toLocaleString()}</div>
                       <div><strong>Interest:</strong> {loanDraft.interestRate}%</div>
                       <div><strong>Duration:</strong> {loanDraft.durationMonths} mo</div>
                       <div className={Math.abs(editableSchedule.reduce((sum, s) => sum + s.principal, 0) - loanDraft.totalLoanAmount) < 0.1 ? "text-success" : "text-destructive font-bold"}>
                          <strong>Status:</strong> {Math.abs(editableSchedule.reduce((sum, s) => sum + s.principal, 0) - loanDraft.totalLoanAmount) < 0.1 ? "Balanced" : `Principal mismatch: ₹${(editableSchedule.reduce((sum, s) => sum + s.principal, 0) - loanDraft.totalLoanAmount).toFixed(2)}`}
                       </div>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto border rounded-md">
                      <table className="data-table text-[11px]">
                        <thead className="sticky top-0 bg-background shadow-sm">
                          <tr>
                            <th>Inst #</th>
                            <th>Member</th>
                            <th>Due Date</th>
                            <th>Principal</th>
                            <th>Interest</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableSchedule.map((item, i) => (
                            <tr key={`${item.memberId}-${item.installmentNo}`}>
                              <td className="text-center font-bold text-primary">{item.installmentNo}</td>
                              <td className="max-w-[100px] truncate">{groupMembers.find(gm => gm.id === item.memberId)?.name || `M-${item.memberId}`}</td>
                              <td>
                                <Input
                                  type="date"
                                  value={item.dueDate}
                                  onChange={e => {
                                    const updated = [...editableSchedule];
                                    updated[i] = { ...item, dueDate: e.target.value };
                                    setEditableSchedule(updated);
                                  }}
                                  className="h-7 w-[140px] text-[11px] px-1"
                                />
                              </td>
                              <td>
                                <Input
                                  type="number"
                                  value={item.principal}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    const updated = [...editableSchedule];
                                    updated[i] = { ...item, principal: val, total: Number((val + item.interest).toFixed(2)) };
                                    setEditableSchedule(updated);
                                  }}
                                  className="h-7 w-20 text-[11px] px-1"
                                />
                              </td>
                              <td>
                                <Input
                                  type="number"
                                  value={item.interest}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    const updated = [...editableSchedule];
                                    updated[i] = { ...item, interest: val, total: Number((val + item.principal).toFixed(2)) };
                                    setEditableSchedule(updated);
                                  }}
                                  className="h-7 w-20 text-[11px] px-1"
                                />
                              </td>
                              <td className="p-0">
                                <Input
                                    type="number"
                                    value={item.total}
                                    readOnly
                                    className="h-7 w-20 text-[11px] px-1 font-bold bg-muted/50 cursor-not-allowed"
                                  />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                      <Button onClick={handleConfirm} disabled={loading} className="flex-1">
                        {loading ? "Creating..." : "Confirm & Create Loan"}
                      </Button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                     <div className="h-16 w-16 bg-success/20 rounded-full flex items-center justify-center text-success">
                        <CheckCircle2 className="h-10 w-10" />
                     </div>
                     <h3 className="text-xl font-bold">Loan Created Successfully!</h3>
                     <p className="text-muted-foreground text-sm max-w-xs">
                        The group loan has been distributed among the selected members and schedules are generated.
                     </p>
                     <Button onClick={() => setOpen(false)} className="px-8">Close</Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={editLoanOpen} onOpenChange={setEditLoanOpen}>
             <DialogContent className="max-w-md">
                <DialogHeader>
                   <DialogTitle>Edit Loan #{editingLoan?.id} ({editingLoan?.groupName})</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Loan Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                        <SelectItem value="CLOSED">CLOSED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between items-center bg-muted p-2 rounded-md">
                       <Label className="text-xs font-bold">Charges (Per Member)</Label>
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${(editingLoan?.chargeStatus || 'UNPAID') !== 'UNPAID' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                         {editingLoan?.chargeStatus || 'UNPAID'}
                       </span>
                    </div>
                    {(editingLoan?.chargeStatus || 'UNPAID') !== 'UNPAID' && (
                       <p className="text-[10px] text-destructive">Charges cannot be edited because payments have already been recorded.</p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label className="text-xs">Processing Fee</Label>
                         <Input type="number" value={editCharges.processingFee} disabled={(editingLoan?.chargeStatus || 'UNPAID') !== 'UNPAID'} onChange={e => setEditCharges({...editCharges, processingFee: Number(e.target.value)})} />
                       </div>
                       <div className="space-y-2">
                         <Label className="text-xs">Document Fee</Label>
                         <Input type="number" value={editCharges.documentFee} disabled={(editingLoan?.chargeStatus || 'UNPAID') !== 'UNPAID'} onChange={e => setEditCharges({...editCharges, documentFee: Number(e.target.value)})} />
                       </div>
                       <div className="space-y-2">
                         <Label className="text-xs">Insurance Fee</Label>
                         <Input type="number" value={editCharges.insuranceFee} disabled={(editingLoan?.chargeStatus || 'UNPAID') !== 'UNPAID'} onChange={e => setEditCharges({...editCharges, insuranceFee: Number(e.target.value)})} />
                       </div>
                       <div className="space-y-2">
                         <Label className="text-xs">Saving Amount</Label>
                         <Input type="number" value={editCharges.savingAmount} disabled={(editingLoan?.chargeStatus || 'UNPAID') !== 'UNPAID'} onChange={e => setEditCharges({...editCharges, savingAmount: Number(e.target.value)})} />
                       </div>
                    </div>
                  </div>
                  <Button onClick={handleEditLoanSubmit} disabled={loading} className="w-full mt-2">
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
             </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="form-section overflow-x-auto">
        {viewMode === "SUMMARY" ? (
          <>
            <div className="flex items-center gap-2 mb-4 bg-primary/5 p-2 rounded-md">
              <span className="text-sm font-semibold text-primary">Loan Summaries</span>
              <span className="text-xs text-muted-foreground mr-auto">Overview of all active and past loans</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Group Name</th>
                  <th>Members</th>
                  <th>Total Principal</th>
                  <th>Interest</th>
                  <th>Duration</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Charges</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fetchingLoans ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading summaries...</td></tr>
                ) : loanSummaries.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No loans found.</td></tr>
                ) : (
                  loanSummaries.map((ls) => (
                    <tr key={ls.id}>
                      <td className="font-bold text-primary"># {ls.id}</td>
                      <td>{ls.groupName}</td>
                      <td className="text-center font-medium">{ls.totalMembers}</td>
                      <td className="font-semibold">₹{ls.totalPrincipal.toLocaleString()}</td>
                      <td>{ls.interestRate}%</td>
                      <td>{ls.durationMonths} mo</td>
                      <td><span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px]">{ls.collectionType}</span></td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ls.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {ls.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1 items-start">
                           <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${ls.chargeStatus === 'PAID' ? 'bg-success/10 text-success' : ls.chargeStatus === 'PARTIAL' ? 'text-warning-foreground bg-warning/10' : 'bg-muted text-muted-foreground'}`}>
                              {ls.chargeStatus || 'UNPAID'}
                           </span>
                           <span className="text-xs font-semibold text-primary">
                              {((ls.charges?.processingFee || 0) + (ls.charges?.documentFee || 0) + (ls.charges?.insuranceFee || 0) + (ls.charges?.savingAmount || 0)) === 0 
                                ? "nil" 
                                : `₹${(((ls.charges?.processingFee || 0) + (ls.charges?.documentFee || 0) + (ls.charges?.insuranceFee || 0) + (ls.charges?.savingAmount || 0)) * ls.totalMembers).toLocaleString()}`}
                           </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => { setSelectedLoanId(ls.id);setFilterGroupId(ls.groupId.toString());}} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary hover:bg-primary/10 transition-colors" 
                              onClick={() => openEditModal(ls)} 
                              title="Edit Loan"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && ls.status === 'ACTIVE' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary hover:bg-primary/10 transition-colors" 
                              onClick={async () => { 
                                setTargetLoanId(ls.id); 
                                fetchGroupMembers(ls.groupId.toString());
                                // Fetch existing members to filter
                                try {
                                  const res = await fetch(`${API_BASE}/api/loans/group/${ls.groupId}/loan/${ls.id}/schedules`, {
                                    headers: { "loggedInUser": user.username }
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    if (data.length > 0) {
                                      const existingIds = data[0].members.map((m: any) => m.memberId);
                                      setTargetLoanMemberIds(existingIds);
                                    }
                                  }
                                } catch (e) {}
                                setAddMemberOpen(true); 
                              }} 
                              title="Add Member"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4 bg-muted/50 p-2 rounded-md">
              <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-background" onClick={() => setViewMode("SUMMARY")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="h-4 w-px bg-muted-foreground/30" />
              <span className="text-sm font-bold text-primary">Installments List — Loan # {selectedLoanId}</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Inst #</th>
                  <th>Due Date</th>
                  <th>Total Installment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {fetchingLoans ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Fetching installments...</td></tr>
                ) : loans.filter(l => l.loanId === selectedLoanId).length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No installments found for this loan ID.</td></tr>
                ) : (
                  loans.filter(l => l.loanId === selectedLoanId).map((l, idx) => (
                    <tr key={`${l.loanId}-${idx}`}>
                      <td className="font-bold text-primary">{l.installmentNo}</td>
                      <td>{l.dueDate}</td>
                      <td>
                        <div className="flex flex-col">
                           <span className="font-semibold text-sm">
                              ₹{l.members.reduce((sum, m) => sum + (m.total || 0), 0).toLocaleString()}
                           </span>
                           <span className="text-[10px] text-muted-foreground">
                              ({l.members.length} members)
                           </span>
                        </div>
                      </td>
                      <td>
                        {l.members.filter(m => m.status !== 'PAID').length === 0 ? (
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-success/10 text-success">
                            All Paid
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                            Remaining {l.members.filter(m => m.status !== 'PAID').length} unpaid
                          </span>
                        )}
                      </td>
                      <td>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => setViewLoan(l)} title="View Schedule">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      <Dialog open={!!viewLoan} onOpenChange={() => setViewLoan(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Loan Schedule — Installment {viewLoan?.installmentNo}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4 pr-1">
            {viewLoan && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 text-xs border border-primary/10">
                  <div><strong className="text-primary">Loan ID:</strong> # {viewLoan.loanId}</div>
                  <div><strong className="text-primary">Due Date:</strong> {viewLoan.dueDate}</div>
                  <div><strong className="text-primary">Total Amount:</strong> ₹{viewLoan.members.reduce((sum, m) => sum + (m.total || 0), 0).toLocaleString()}</div>
                </div>

                <div className="border rounded-lg overflow-hidden border-muted">
                  <table className="data-table text-xs">
                    <thead className="bg-muted/70">
                      <tr>
                        <th>Member</th>
                        <th>Principal</th>
                        <th>Interest</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Status</th>
                        {isAdmin && !isLoanClosed && <th>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {viewLoan.members.map(m => (
                        <tr key={m.memberId}>
                          <td className="font-semibold">{m.memberName}</td>
                          <td>₹{m.principal?.toLocaleString()}</td>
                          <td>₹{m.interest?.toLocaleString()}</td>
                          <td className="font-bold text-primary">₹{m.total?.toLocaleString()}</td>
                          <td>₹{m.paidAmount?.toLocaleString() || "0"}</td>
                          <td>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              m.status === "PAID" ? "bg-success/10 text-success" :
                              m.status === "PARTIAL" ? "bg-warning/10 text-warning" :
                              "bg-muted text-muted-foreground border border-muted-foreground/20"
                            }`}>
                              {m.status}
                            </span>
                          </td>
                          {isAdmin && !isLoanClosed && (
                            <td>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-[10px] hover:bg-primary/20 hover:text-primary px-3" 
                                onClick={() => fetchMemberScheduleForEdit(viewLoan.loanId, filterGroupId, m.memberId, m.memberName || "")}
                                disabled={m.status === 'PAID'}
                              >
                                {m.status === 'PAID' ? "Paid" : "Edit Member"}
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editMemberOpen} onOpenChange={(v) => { setEditMemberOpen(v); if(!v) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Edit Individual Schedule — {editingMemberName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
             <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex justify-between items-center">
                <span className="text-xs font-semibold text-primary">Member ID: # {editingMemberId}</span>
                <span className="text-xs font-bold">Total Principal: ₹{memberSchedules.reduce((sum, s) => sum + s.principal, 0).toLocaleString()}</span>
             </div>
             
             <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Inst #</th>
                    <th>Due Date</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {memberSchedules.map((s, idx) => {
                    const isPaid = (s.paidAmount || 0) > 0 || (s.status === 'PAID' || s.status === 'PARTIAL');
                    return (
                      <tr key={idx} className={isPaid ? "bg-muted/30" : ""}>
                        <td className="font-bold">{s.installmentNo || idx + 1}</td>
                        <td>
                          <Input 
                            type="date" 
                            className="h-7 text-xs w-32" 
                            value={s.dueDate || ""} 
                            disabled={isPaid}
                            onChange={(e) => {
                              const updated = [...memberSchedules];
                              updated[idx].dueDate = e.target.value;
                              setMemberSchedules(updated);
                            }}
                          />
                        </td>
                        <td>
                          <Input 
                            type="number" 
                            className="h-7 text-xs w-24" 
                            value={s.principal} 
                            disabled={isPaid}
                            onChange={(e) => {
                              const updated = [...memberSchedules];
                              updated[idx].principal = parseFloat(e.target.value) || 0;
                              updated[idx].total = updated[idx].principal + updated[idx].interest;
                              setMemberSchedules(updated);
                            }}
                          />
                        </td>
                        <td>
                          <Input 
                            type="number" 
                            className="h-7 text-xs w-24" 
                            value={s.interest} 
                            disabled={isPaid}
                            onChange={(e) => {
                              const updated = [...memberSchedules];
                              updated[idx].interest = parseFloat(e.target.value) || 0;
                              updated[idx].total = updated[idx].principal + updated[idx].interest;
                              setMemberSchedules(updated);
                            }}
                          />
                        </td>
                        <td className="font-bold">₹{(s.principal + s.interest).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
             <Button variant="outline" size="sm" onClick={() => setEditMemberOpen(false)}>Cancel</Button>
             <Button size="sm" onClick={handleEditMemberSchedule} disabled={loading}>
               {loading ? "Saving..." : "Save Member Schedule"}
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addMemberOpen} onOpenChange={(v) => { if (!v) resetForm(); setAddMemberOpen(v); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {addMemberStep === 1 && "Add Member to Loan - Select Member"}
              {addMemberStep === 2 && "Add Member to Loan - Review Schedule"}
              {addMemberStep === 3 && "Success"}
            </DialogTitle>
          </DialogHeader>

          {addMemberStep === 1 && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-md text-xs">
                Adding a new member to Loan # {targetLoanId}. The backend will generate a matching schedule.
              </div>
              <div className="space-y-2">
                <Label>Select Member</Label>
                <Select value={targetMemberId} onValueChange={setTargetMemberId}>
                  <SelectTrigger><SelectValue placeholder="Choose a member" /></SelectTrigger>
                  <SelectContent>
                    {groupMembers
                      .filter(m => !targetLoanMemberIds.includes(m.id))
                      .map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                onClick={handleAddMemberPreview} 
                disabled={loading || !targetMemberId}
              >
                {loading ? "Generating Schedule..." : "Preview Schedule"}
              </Button>
            </div>
          )}

          {addMemberStep === 2 && addMemberDraft && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-primary/5 rounded-md text-xs border border-primary/10">
                 Previewing schedule for member: <strong>{groupMembers.find(m => m.id === Number(targetMemberId))?.name}</strong>
              </div>
              
              <div className="max-h-60 overflow-y-auto border rounded-md">
                <table className="data-table text-xs">
                  <thead className="sticky top-0 bg-background">
                    <tr>
                      <th>Inst #</th>
                      <th>Due Date</th>
                      <th>Principal</th>
                      <th>Interest</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addMemberSchedule.map((item, i) => (
                      <tr key={i}>
                        <td className="text-center font-bold">{item.installmentNo}</td>
                        <td>
                          <Input 
                             type="date" 
                             value={item.dueDate || ""} 
                             onChange={e => {
                               const updated = [...addMemberSchedule];
                               updated[i] = { ...item, dueDate: e.target.value };
                               setAddMemberSchedule(updated);
                             }}
                             className="h-7 text-[11px] w-[140px] px-1"
                          />
                        </td>
                        <td>
                          <Input 
                            type="number" 
                            value={item.principal} 
                            onChange={e => {
                              const val = Number(e.target.value);
                              const updated = [...addMemberSchedule];
                              updated[i] = { ...item, principal: val, total: val + item.interest };
                              setAddMemberSchedule(updated);
                            }}
                            className="h-7 w-20 text-[11px]"
                          />
                        </td>
                        <td>
                          <Input 
                            type="number" 
                            value={item.interest} 
                            onChange={e => {
                              const val = Number(e.target.value);
                              const updated = [...addMemberSchedule];
                              updated[i] = { ...item, interest: val, total: Number((val + item.principal).toFixed(2)) };
                              setAddMemberSchedule(updated);
                            }}
                            className="h-7 w-20 text-[11px] px-1"
                          />
                        </td>
                        <td className="font-bold">₹{(item.principal + item.interest).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setAddMemberStep(1)} className="flex-1">Back</Button>
                <Button onClick={handleAddMemberConfirm} disabled={loading} className="flex-1">
                  {loading ? "Adding Member..." : "Confirm & Add Member"}
                </Button>
              </div>
            </div>
          )}

          {addMemberStep === 3 && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="h-16 w-16 bg-success/20 rounded-full flex items-center justify-center text-success">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold">Member Added Successfully!</h3>
              <Button onClick={() => setAddMemberOpen(false)} className="px-8">Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}
