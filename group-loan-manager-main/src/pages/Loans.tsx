import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Eye, Calendar, AlertTriangle, CheckCircle2, UserPlus, ArrowLeft, ArrowRight, Edit, Search, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  LoanInitRequest, LoanDraftDto, LoanSchedulePreviewDto, 
  LoanConfirmRequest, MemberScheduleDto, LoanScheduleGroupResponse,
  AddMemberScheduleDto, LoanSummaryResponse, EditMemberScheduleRequest,
  EditLoanRequest, LoanChargesDto, AddMemberPreviewResponse, AddMemberConfirmRequest
} from "@/types/loanTypes";
import { PaginationControls } from "@/components/PaginationControls";

interface GroupData {
  id: number;
  groupName: string;
  collectionType: string;
  collectionDay?: string;
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
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Create Form state
  const [calculationBasis, setCalculationBasis] = useState<"FIXED_RATE" | "FIXED_DUE">("FIXED_RATE");
  const [dueAmount, setDueAmount] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("2");
  const [duration, setDuration] = useState("12");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [savingAmount, setSavingAmount] = useState("0");
  const [insuranceFee, setInsuranceFee] = useState("0");
  const [processingFee, setProcessingFee] = useState("0");
  const [documentFee, setDocumentFee] = useState("0");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [step, setStep] = useState(1);
  const [loanDraft, setLoanDraft] = useState<LoanDraftDto | null>(null);
  const [editableSchedule, setEditableSchedule] = useState<LoanSchedulePreviewDto[]>([]);
  const [expectedInitPrincipal, setExpectedInitPrincipal] = useState(0);
  const [expectedInitInterest, setExpectedInitInterest] = useState(0);
  const [expectedMemberTotals, setExpectedMemberTotals] = useState<Record<number, { p: number, i: number }>>({});
  const [targetLoanId, setTargetLoanId] = useState<number | null>(null);
  const [targetMemberId, setTargetMemberId] = useState("");
  const [targetLoanMemberIds, setTargetLoanMemberIds] = useState<number[]>([]);

  // Add Member to Loan state
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberStep, setAddMemberStep] = useState(1);
  const [addMemberDraft, setAddMemberDraft] = useState<AddMemberPreviewResponse | null>(null);
  const [addMemberSchedule, setAddMemberSchedule] = useState<AddMemberScheduleDto[]>([]);
  const [initialAddMemberSchedule, setInitialAddMemberSchedule] = useState<AddMemberScheduleDto[]>([]);
  const [addMemberAdminTarget, setAddMemberAdminTarget] = useState<number>(0);
  const [expectedAddMemberPrincipal, setExpectedAddMemberPrincipal] = useState(0);
  const [expectedAddMemberInterest, setExpectedAddMemberInterest] = useState(0);

  // Member Schedule Edit state
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingMemberName, setEditingMemberName] = useState("");
  const [memberSchedules, setMemberSchedules] = useState<MemberScheduleDto[]>([]);
  const [expectedPrincipal, setExpectedPrincipal] = useState(0);
  const [expectedInterest, setExpectedInterest] = useState(0);
const API_BASE = import.meta.env.VITE_API_BASE_URL;

  /** Parses a backend error response and returns only the human-readable message. */
  async function parseApiError(res: Response, fallback: string): Promise<string> {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      return parsed.message || fallback;
    } catch {
      return text || fallback;
    }
  }

  /** Calculates end date based on duration in WEEKS and collection type. */
  function calcEndDate(start: string, collectionType: string, durationWeeks: number): string {
    if (!start || !collectionType || durationWeeks <= 0) return "";
    
    let totalSchedules = 0;
    if (collectionType === "DAILY") totalSchedules = durationWeeks * 7;
    else if (collectionType === "WEEKLY") totalSchedules = durationWeeks;
    else if (collectionType === "BIWEEKLY") totalSchedules = Math.floor(durationWeeks / 2);
    else if (collectionType === "MONTHLY") totalSchedules = Math.floor(durationWeeks / 4);
    
    if (totalSchedules <= 0) return "";
    
    const d = new Date(start);
    for (let i = 1; i < totalSchedules; i++) {
        if (collectionType === "DAILY")         d.setDate(d.getDate() + 1);
        else if (collectionType === "WEEKLY")   d.setDate(d.getDate() + 7);
        else if (collectionType === "BIWEEKLY") d.setDate(d.getDate() + 14);
        else                                    d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().split("T")[0];
  }

  const selectedGroup = groups.find(g => g.id.toString() === selectedGroupId);
  const durationNum = parseInt(duration) || 0;
  
  const scheduleCount = useMemo(() => {
    if (!selectedGroup || durationNum <= 0) return 0;
    const type = selectedGroup.collectionType;
    if (type === "DAILY") return durationNum * 7;
    if (type === "WEEKLY") return durationNum;
    if (type === "BIWEEKLY") return Math.floor(durationNum / 2);
    if (type === "MONTHLY") return Math.floor(durationNum / 4);
    return 0;
  }, [selectedGroup, durationNum]);

  const endDatePreview = useMemo(() =>
    selectedGroup && startDate && durationNum > 0 && durationNum <= 800
      ? calcEndDate(startDate, selectedGroup.collectionType, durationNum)
      : "",
    [selectedGroup, startDate, durationNum]
  );

  // Auto-calculation logic for Calculation Basis
  useEffect(() => {
    if (calculationBasis === "FIXED_DUE") {
      const p = parseFloat(loanAmount) || 0;
      const d = parseFloat(dueAmount) || 0;
      const dur = durationNum || 0;
      const count = scheduleCount || 0;

      if (p > 0 && d > 0 && dur > 0 && count > 0) {
        const totalInterest = (d * count) - p;
        const rate = (totalInterest / p) / dur * 100;
        setInterestRate(rate.toFixed(2));
      }
    } else {
      // FIXED_RATE mode: calculate dueAmount (informative)
      const p = parseFloat(loanAmount) || 0;
      const r = parseFloat(interestRate) || 0;
      const dur = durationNum || 0;
      const count = scheduleCount || 0;

      if (p > 0 && dur > 0 && count > 0) {
        const totalInterest = p * (r / 100) * dur;
        const totalObligation = p + totalInterest;
        const d = totalObligation / count;
        setDueAmount(d.toFixed(2));
      } else {
        setDueAmount("");
      }
    }
  }, [calculationBasis, loanAmount, interestRate, dueAmount, durationNum, scheduleCount]);

  const currentLoanSummary = useMemo(() =>
     loanSummaries.find(l => l.id === selectedLoanId),
     [loanSummaries, selectedLoanId]
  );
  const isLoanClosed = currentLoanSummary?.status === "CLOSED";

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/groups?size=50`, {
        headers: { "loggedInUser": user.username },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.content !== undefined ? data.content : data);
      }
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  }, [user]);

  const fetchLoanSummaries = useCallback(async (p = page, s = pageSize) => {
    if (!user) return;
    setFetchingLoans(true);
    try {
      let url = `${API_BASE}/api/loans/summary?page=${p}&size=${s}&search=${encodeURIComponent(search)}`;
      if (filterGroupId && filterGroupId !== "ALL") {
        url = `${API_BASE}/api/loans/group/${filterGroupId}/summary?page=${p}&size=${s}&search=${encodeURIComponent(search)}`;
      }
      const res = await fetch(url, {
        headers: { "loggedInUser": user.username }
      });
      if (res.ok) {
        const data = await res.json();
        setLoanSummaries(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      } else {
        setLoanSummaries([]);
      }
    } catch (err) {
      console.error("Failed to fetch loan summaries", err);
      toast.error("Failed to fetch loan summaries");
    } finally {
      setFetchingLoans(false);
    }
  }, [user, page, pageSize, filterGroupId, search]);

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
      const res = await fetch(`${API_BASE}/api/members/group/${groupId}?size=50`, {
        headers: { "loggedInUser": user.username },
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.content !== undefined ? data.content : data;
        setGroupMembers(content);
        setSelectedMemberIds(content.map((m: any) => m.id));
      }
    } catch (err) {
      console.error("Failed to fetch members", err);
    }
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (filterGroupId && selectedLoanId) {
       fetchLoans(filterGroupId, selectedLoanId);
       setViewMode("SCHEDULE");
    } else {
       fetchLoanSummaries();
       setViewMode("SUMMARY");
    }
  }, [filterGroupId, selectedLoanId, fetchLoanSummaries, fetchLoans]);

  // Debounced search for Loans: reset to page 0 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (selectedGroupId && open) {
      fetchGroupMembers(selectedGroupId);
    }
  }, [selectedGroupId, open, fetchGroupMembers]);

  const handleGroupSelect = async (groupId: string) => {
    if (!groupId || !user) return;
    try {
      const res = await fetch(`${API_BASE}/api/loans/group/${groupId}/summary`, {
        headers: { "loggedInUser": user.username }
      });
      if (res.ok) {
        const summaries = await res.json();
        const hasActive = summaries.some((l: any) => l.status === "ACTIVE");
        if (hasActive) {
          toast.error("This group already has an active loan. Please select a different group.");
          setSelectedGroupId("");
          setGroupMembers([]);
          setSelectedMemberIds([]);
          return;
        }
      }
    } catch {
      // fail silently — group select still proceeds
    }
    setSelectedGroupId(groupId);
    setError("");
  };

  const handleInit = async () => {
    if (!selectedGroupId || !loanAmount || !user) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Validation: Start Date must match Collection Day for WEEKLY/BIWEEKLY
      if (selectedGroup && (selectedGroup.collectionType === "WEEKLY" || selectedGroup.collectionType === "BIWEEKLY")) {
        const groupDay = selectedGroup.collectionDay; 
        if (groupDay) {
          const selectedDate = new Date(startDate);
          // Use 'en-US' for day name comparison (MONDAY, etc)
          const selectedDayName = selectedDate.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
          
          if (selectedDayName !== groupDay.toUpperCase()) {
             toast.error(`Start date must be a ${groupDay}`);
             setLoading(false);
             return;
          }
        }
      }

      const res = await fetch(`${API_BASE}/api/loans/init`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "loggedInUser": user.username 
        },
        body: JSON.stringify({
          groupId: parseInt(selectedGroupId),
          totalLoanAmount: parseFloat(loanAmount),
          interestRate: calculationBasis === 'FIXED_RATE' ? parseFloat(interestRate) : undefined,
          dueAmount: calculationBasis === 'FIXED_DUE' ? parseFloat(dueAmount) : undefined,
          durationWeeks: parseInt(duration),
          startDate,
          endDate: endDatePreview || undefined,
          memberIds: selectedMemberIds,
          charges: { 
            savingAmount: parseFloat(savingAmount), 
            insuranceFee: parseFloat(insuranceFee),
            processingFee: parseFloat(processingFee),
            documentFee: parseFloat(documentFee)
          }
        } as LoanInitRequest)
      });

      if (!res.ok) throw new Error(await parseApiError(res, "Failed to initialize loan"));
      
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

      if (!previewRes.ok) throw new Error(await parseApiError(previewRes, "Failed to generate preview"));
      
      const previewData = await previewRes.json();
      setEditableSchedule(previewData);
      setExpectedInitPrincipal(previewData.reduce((sum: any, s: any) => sum + s.principal, 0));
      setExpectedInitInterest(previewData.reduce((sum: any, s: any) => sum + s.interest, 0));

      const mTotals: Record<number, { p: number, i: number }> = {};
      previewData.forEach((s: any) => {
          if (!mTotals[s.memberId]) mTotals[s.memberId] = { p: 0, i: 0 };
          mTotals[s.memberId].p += s.principal;
          mTotals[s.memberId].i += s.interest;
      });
      setExpectedMemberTotals(mTotals);

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
    
    // Validate per member
    const currentMemberTotals: Record<number, { p: number, i: number }> = {};
    editableSchedule.forEach(s => {
       if (!currentMemberTotals[s.memberId]) currentMemberTotals[s.memberId] = { p: 0, i: 0 };
       currentMemberTotals[s.memberId].p += s.principal;
       currentMemberTotals[s.memberId].i += s.interest;
    });

    for (const mIdStr in expectedMemberTotals) {
       const mId = Number(mIdStr);
       const expected = expectedMemberTotals[mId];
       const current = currentMemberTotals[mId] || { p: 0, i: 0 };
       const memberName = groupMembers.find(m => m.id === mId)?.name || `M-${mId}`;

       if (Math.abs(current.p - expected.p) > 0.1) {
          toast.error(`Principal for ${memberName} must match ₹${expected.p.toLocaleString()}. Off by ₹${Math.abs(expected.p - current.p).toFixed(2)}`);
          return;
       }
       if (Math.abs(current.i - expected.i) > 0.1) {
          toast.error(`Interest for ${memberName} must match ₹${expected.i.toLocaleString()}. Off by ₹${Math.abs(expected.i - current.i).toFixed(2)}`);
          return;
       }
    }

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

      if (!res.ok) throw new Error(await parseApiError(res, "Failed to confirm loan"));
      
      setStep(3);
      toast.success("Group loan created successfully!");
      fetchLoanSummaries(0, pageSize);
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
      setAddMemberDraft(data);
      setAddMemberSchedule(data.schedules);
      setInitialAddMemberSchedule(JSON.parse(JSON.stringify(data.schedules)));
      setAddMemberAdminTarget(data.dueAmount || 0);
      setExpectedAddMemberPrincipal(data.schedules.reduce((sum: any, s: any) => sum + s.principal, 0));
      setExpectedAddMemberInterest(data.schedules.reduce((sum: any, s: any) => sum + s.interest, 0));
      setAddMemberStep(2);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemberConfirm = async () => {
    if (!addMemberDraft || !targetLoanId || !user) return;
    
    const currentP = addMemberSchedule.reduce((sum, s) => sum + s.principal, 0);
    const currentI = addMemberSchedule.reduce((sum, s) => sum + s.interest, 0);
    const currentTotal = currentP + currentI;
    const expectedTotal = expectedAddMemberPrincipal + expectedAddMemberInterest;

    if (Math.abs(currentP - expectedAddMemberPrincipal) > 0.1) {
       const diff = Math.abs(currentP - expectedAddMemberPrincipal);
       const direction = currentP > expectedAddMemberPrincipal ? "High" : "Low";
       toast.error(`Principal Mismatch: Total must be ₹${expectedAddMemberPrincipal.toLocaleString()}. Currently: ₹${currentP.toLocaleString()} (${direction} by ₹${diff.toLocaleString()})`);
       return;
    }
    if (Math.abs(currentI - expectedAddMemberInterest) > 0.1) {
       const diff = Math.abs(currentI - expectedAddMemberInterest);
       const direction = currentI > expectedAddMemberInterest ? "High" : "Low";
       toast.error(`Interest Mismatch: Total must be ₹${expectedAddMemberInterest.toLocaleString()}. Currently: ₹${currentI.toLocaleString()} (${direction} by ₹${diff.toLocaleString()})`);
       return;
    }
    if (Math.abs(currentTotal - expectedTotal) > 0.1) {
       const diff = Math.abs(currentTotal - expectedTotal);
       const direction = currentTotal > expectedTotal ? "High" : "Low";
       toast.error(`Total Mismatch: Combined total must be ₹${expectedTotal.toLocaleString()}. Currently: ₹${currentTotal.toLocaleString()} (${direction} by ₹${diff.toLocaleString()})`);
       return;
    }

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
    
    const currentP = memberSchedules.reduce((sum, s) => sum + s.principal, 0);
    const currentI = memberSchedules.reduce((sum, s) => sum + s.interest, 0);
    if (Math.abs(currentP - expectedPrincipal) > 0.1) {
       toast.error(`Total principal must match ₹${expectedPrincipal.toLocaleString()}. Currently off by ₹${Math.abs(expectedPrincipal - currentP).toFixed(2)}`);
       return;
    }
    if (Math.abs(currentI - expectedInterest) > 0.1) {
       toast.error(`Total interest must match ₹${expectedInterest.toLocaleString()}. Currently off by ₹${Math.abs(expectedInterest - currentI).toFixed(2)}`);
       return;
    }

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
        setExpectedPrincipal(data.reduce((sum: any, s: any) => sum + s.principal, 0));
        setExpectedInterest(data.reduce((sum: any, s: any) => sum + s.interest, 0));
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
      fetchLoanSummaries(page, pageSize);
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

  const handleAdminTargetChange = (newTarget: number) => {
    setAddMemberAdminTarget(newTarget);
    if (!addMemberSchedule.length) return;
    
    // Total interest and principal ratio for this member
    const totalP = expectedAddMemberPrincipal;
    const totalI = expectedAddMemberInterest;
    const overallTotal = totalP + totalI;
    const ratioP = totalP / (overallTotal || 1);
    
    const updated = addMemberSchedule.map(row => {
        // Round primary split (Principal) and derive interest to ensure row total equals target
        const pEach = Math.round(newTarget * ratioP);
        const iEach = newTarget - pEach;
        
        return { 
            ...row, 
            principal: pEach, 
            interest: iEach, 
            total: newTarget 
        };
    });
    
    setAddMemberSchedule(updated);
  };

  const handleResetAddMemberSchedule = () => {
    if (!addMemberDraft) return;
    setAddMemberSchedule(addMemberDraft.schedules);
    if (addMemberDraft.schedules.length > 0) {
        setAddMemberAdminTarget(addMemberDraft.schedules[addMemberDraft.schedules.length - 1].total);
    }
    toast.info("Schedule reset to initial state");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="page-header mb-0">Group Loans</h2>
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
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-semibold">Select Group *</Label>
                            {selectedGroup && (
                               <div className="flex gap-2">
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Type: {selectedGroup.collectionType}</span>
                                  {selectedGroup.collectionType !== 'DAILY' && selectedGroup.collectionType !== 'MONTHLY' && (
                                     <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded font-bold uppercase shadow-sm">Day: {selectedGroup.collectionDay || "MONDAY"}</span>
                                  )}
                               </div>
                            )}
                        </div>
                        <Select value={selectedGroupId} onValueChange={handleGroupSelect}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Select group to disburse" /></SelectTrigger>
                          <SelectContent>
                            {groups.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.groupName} ({g.collectionType})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Loan Amount(Per Person) *</Label>
                        <div className="relative">
                          <Input type="number" className="h-11 font-bold text-base pl-8" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} placeholder="0.00" />
                          <span className="absolute left-3 top-2.5 text-muted-foreground font-bold text-lg">₹</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Calculation Basis</Label>
                        <Select value={calculationBasis} onValueChange={(v: any) => setCalculationBasis(v)}>
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIXED_DUE">Fixed Due Amount (₹)</SelectItem>
                            <SelectItem value="FIXED_RATE">Fixed Interest Rate (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Duration (Weeks: 1-800) *</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            min={1} max={800}
                            className={`h-11 font-bold ${durationNum <= 0 || durationNum > 800 ? "border-destructive ring-1 ring-destructive" : ""}`}
                          />
                          {(durationNum <= 0 || durationNum > 800) && (
                            <p className="absolute -bottom-5 left-0 text-[10px] text-destructive font-bold">Must be 1-800 weeks</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-primary">Due Amount (per installment)</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            className={`h-11 font-black pl-8 transition-all ${calculationBasis === 'FIXED_RATE' ? 'bg-muted/30 cursor-not-allowed opacity-70' : 'bg-primary/5 focus:ring-2'}`}
                            value={dueAmount} 
                            disabled={calculationBasis === 'FIXED_RATE'}
                            onChange={e => {
                                const val = e.target.value;
                                setDueAmount(val);
                                // Auto-calc ghost rate if possible
                                if (parseFloat(val) > 0 && parseFloat(loanAmount) > 0 && durationNum > 0 && scheduleCount > 0) {
                                    const totalObligation = parseFloat(val) * scheduleCount;
                                    const totalI = totalObligation - parseFloat(loanAmount);
                                    const rate = (totalI / parseFloat(loanAmount)) / durationNum * 100;
                                    setInterestRate(rate.toFixed(2));
                                }
                            }}
                            placeholder={calculationBasis === 'FIXED_RATE' ? "AUTO" : "Enter amount"}
                          />
                          <span className="absolute left-3 top-2.5 text-muted-foreground/60 font-bold text-lg">₹</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Interest Rate (% per week)</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            className={`h-11 font-black transition-all ${calculationBasis === 'FIXED_DUE' ? 'bg-muted/30 cursor-not-allowed opacity-70' : 'bg-background'}`}
                            value={interestRate} 
                            readOnly={calculationBasis === 'FIXED_DUE'}
                            onChange={e => setInterestRate(e.target.value)} 
                          />
                          <span className="absolute right-3 top-3 text-muted-foreground font-bold text-sm">%</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Start Date</Label>
                        <Input type="date" className="h-11 font-medium" value={startDate} onChange={e => setStartDate(e.target.value)} />
                      </div>
                      
                      <div className="space-y-2 relative">
                        <Label className="text-xs font-semibold text-muted-foreground">Calculated End Date</Label>
                        <div className="relative">
                           <Input
                             type="text"
                             value={endDatePreview || "—"}
                             readOnly
                             className="h-11 bg-muted/20 cursor-not-allowed text-muted-foreground font-medium"
                           />
                           {scheduleCount > 0 && (
                             <span className="absolute right-3 top-3 text-[10px] font-bold bg-muted-foreground/20 px-2 py-0.5 rounded text-muted-foreground">
                               {scheduleCount} installments
                             </span>
                           )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 italic px-1">Auto-computed by system from start date & duration</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t bg-muted/10 p-3 rounded-lg border">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Saving Amount</Label>
                        <Input type="number" className="h-9 text-xs" min={0} value={savingAmount} onChange={e => setSavingAmount(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Insurance Fee</Label>
                        <Input type="number" className="h-9 text-xs" min={0} value={insuranceFee} onChange={e => setInsuranceFee(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Processing Fee</Label>
                        <Input type="number" className="h-9 text-xs" min={0} value={processingFee} onChange={e => setProcessingFee(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Document Fee</Label>
                        <Input type="number" className="h-9 text-xs" min={0} value={documentFee} onChange={e => setDocumentFee(e.target.value)} />
                      </div>
                    </div>

                    {selectedGroupId && groupMembers.length > 0 && (
                      <div className="space-y-2 pt-4 border-t">
                        <Label className="text-xs font-bold uppercase text-muted-foreground px-1">Select Members ({selectedMemberIds.length} / {groupMembers.length})</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto p-2 bg-background border rounded-lg shadow-inner">
                          {groupMembers.map(m => (
                            <div key={m.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer border border-transparent transition-colors">
                              <input 
                                type="checkbox" 
                                id={`m-${m.id}`} 
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={selectedMemberIds.includes(m.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedMemberIds([...selectedMemberIds, m.id]);
                                  else setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.id));
                                }}
                              />
                              <label htmlFor={`m-${m.id}`} className="text-xs font-medium cursor-pointer select-none">{m.name}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {error && <div className="p-4 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 font-semibold shadow-sm animate-in fade-in slide-in-from-top-1"><AlertTriangle className="h-5 w-5 shrink-0" />{error}</div>}
                    
                    <Button onClick={handleInit} disabled={loading} className="w-full h-12 text-base font-bold shadow-lg hover:shadow-xl transition-all">
                      {loading ? "Generating Schedule..." : "Generate & Preview Schedule"}
                    </Button>
                  </div>
                )}

                {step === 2 && loanDraft && (
                  <div className="space-y-4 py-4">
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 shadow-sm flex flex-col md:flex-row justify-around items-center gap-4">
                       <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 px-1 border-b">Duration</span>
                          <div className="text-sm font-bold tracking-tight text-foreground">
                            {loanDraft.durationWeeks} <span className="text-[10px] font-normal text-muted-foreground">weeks</span>
                          </div>
                       </div>
                       <div className="h-8 w-px bg-border/50 hidden md:block" />
                       <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 px-1 border-b">Interest Rate</span>
                          <div className="text-sm font-bold tracking-tight text-foreground">
                            {loanDraft.interestRate}% <span className="text-[10px] font-normal text-muted-foreground">/wk</span>
                          </div>
                       </div>
                       <div className="h-8 w-px bg-border/50 hidden md:block" />
                       {(() => {
                           const curP = editableSchedule.reduce((sum, s) => sum + s.principal, 0);
                           const curI = editableSchedule.reduce((sum, s) => sum + s.interest, 0);
                           const curT = curP + curI;
                           const expP = expectedInitPrincipal;
                           const expI = expectedInitInterest;
                           const expT = expP + expI;

                           const isPErr = Math.abs(curP - expP) > 0.5;
                           const isIErr = Math.abs(curI - expI) > 0.5;
                           const isTErr = Math.abs(curT - expT) > 0.5;

                           return (
                             <>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 px-1 border-b">Principal</span>
                                  <div className={`text-sm font-bold tracking-tight ${isPErr ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                                    ₹{curP.toLocaleString()} <span className="text-muted-foreground/30 font-normal mx-0.5">/</span> ₹{expP.toLocaleString()}
                                  </div>
                                </div>
                                <div className="h-8 w-px bg-border/50 hidden md:block" />
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 px-1 border-b">Interest</span>
                                  <div className={`text-sm font-bold tracking-tight ${isIErr ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                                    ₹{curI.toLocaleString()} <span className="text-muted-foreground/30 font-normal mx-0.5">/</span> ₹{expI.toLocaleString()}
                                  </div>
                                </div>
                                <div className="h-8 w-px bg-border/50 hidden md:block" />
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 px-1 border-b">Total Due</span>
                                  <div className={`text-sm font-black tracking-tight ${isTErr ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                                    ₹{curT.toLocaleString()} <span className="text-muted-foreground/30 font-normal mx-0.5">/</span> ₹{expT.toLocaleString()}
                                  </div>
                                </div>
                             </>
                           );
                       })()}
                    </div>

                    <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1">
                       {Object.keys(expectedMemberTotals).map(mIdStr => {
                          const mId = Number(mIdStr);
                          const memberName = groupMembers.find(m => m.id === mId)?.name || `M-${mId}`;
                          const memberRows = editableSchedule.filter(s => s.memberId === mId);
                          
                          const currentP = memberRows.reduce((sum, s) => sum + s.principal, 0);
                          const currentI = memberRows.reduce((sum, s) => sum + s.interest, 0);
                          const currentTotal = currentP + currentI;
                          const expected = expectedMemberTotals[mId];
                          const expectedTotal = expected.p + expected.i;

                          return (
                             <div key={mId} className="border rounded-md overflow-hidden border-border/80">
                                <div className="bg-primary/5 p-2 flex justify-between items-center text-xs flex-wrap gap-2 border-b border-border/50">
                                   <span className="font-bold text-primary">{memberName}</span>
                                   <div className="flex gap-4">
                                      <span className={`font-semibold ${Math.abs(currentP - expected.p) > 0.1 ? 'text-destructive' : ''}`}>
                                        Principal: ₹{currentP.toLocaleString()} / ₹{expected.p.toLocaleString()}
                                      </span>
                                      <span className={`font-semibold ${Math.abs(currentI - expected.i) > 0.1 ? 'text-destructive' : ''}`}>
                                        Interest: ₹{currentI.toLocaleString()} / ₹{expected.i.toLocaleString()}
                                      </span>
                                      <span className={`font-bold ${Math.abs(currentTotal - expectedTotal) > 0.1 ? 'text-destructive' : ''}`}>
                                        Total: ₹{currentTotal.toLocaleString()} / ₹{expectedTotal.toLocaleString()}
                                      </span>
                                   </div>
                                </div>
                                <table className="data-table text-[11px] w-full mt-0">
                                  <thead className="bg-background">
                                    <tr>
                                      <th className="w-12 text-center">Inst #</th>
                                      <th>Due Date</th>
                                      <th>Principal</th>
                                      <th>Interest</th>
                                      <th>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {memberRows.map(item => {
                                      const originalIndex = editableSchedule.findIndex(s => s.memberId === item.memberId && s.installmentNo === item.installmentNo);
                                      return (
                                        <tr key={`${item.memberId}-${item.installmentNo}`}>
                                          <td className="text-center font-bold text-primary">{item.installmentNo}</td>
                                          <td>
                                            <Input
                                              type="date"
                                              value={item.dueDate}
                                              onChange={e => {
                                                const updated = [...editableSchedule];
                                                updated[originalIndex] = { ...item, dueDate: e.target.value };
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
                                                updated[originalIndex] = { ...item, principal: val, total: Number((val + item.interest).toFixed(2)) };
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
                                                updated[originalIndex] = { ...item, interest: val, total: Number((val + item.principal).toFixed(2)) };
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
                                      );
                                    })}
                                  </tbody>
                                </table>
                             </div>
                          );
                       })}
                    </div>

                    <div className="flex gap-3 pt-4 border-t mt-4">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">Back to Initialization</Button>
                      <Button onClick={handleConfirm} disabled={loading} className="flex-[2] h-11 text-base font-bold shadow-lg bg-primary">
                        {loading ? "Creating Loan..." : "Confirm & Create Group Loan"}
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
                     <Button onClick={() => { setOpen(false); window.location.reload(); }} className="px-8">Close</Button>
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
      
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-muted/30 p-3 rounded-lg border">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search group name or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Label className="text-sm whitespace-nowrap">Filter Group:</Label>
          <Select value={filterGroupId || "ALL"} onValueChange={(v) => { setFilterGroupId(v === "ALL" ? "" : v); setSelectedLoanId(null); }}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Groups</SelectItem>
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id.toString()}>
                  {g.groupName} ({g.collectionType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                      <td>{ls.durationWeeks} weeks</td>
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
                                      const allMemberIds = new Set<number>();
                                      data.forEach((inst: any) => {
                                        if (inst.members) {
                                          inst.members.forEach((m: any) => allMemberIds.add(m.memberId));
                                        }
                                      });
                                      setTargetLoanMemberIds(Array.from(allMemberIds));
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
            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              totalElements={totalElements}
              onPageChange={(p) => {
                setPage(p);
                fetchLoanSummaries(p, pageSize);
              }}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(0);
                fetchLoanSummaries(0, s);
              }}
            />
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
             <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex justify-between items-center flex-wrap gap-2">
                <span className="text-xs font-semibold text-primary">Member ID: # {editingMemberId}</span>
                <div className="flex gap-4">
                  {(() => {
                     const currentP = memberSchedules.reduce((sum, s) => sum + s.principal, 0);
                     const currentI = memberSchedules.reduce((sum, s) => sum + s.interest, 0);
                     const currentTotal = currentP + currentI;
                     const expectedTotal = expectedPrincipal + expectedInterest;
                     return (
                        <>
                          <span className={`text-xs font-bold ${Math.abs(currentP - expectedPrincipal) > 0.1 ? 'text-destructive' : ''}`}>
                            Principal: ₹{currentP.toLocaleString()} / ₹{expectedPrincipal.toLocaleString()}
                          </span>
                          <span className={`text-xs font-bold ${Math.abs(currentI - expectedInterest) > 0.1 ? 'text-destructive' : ''}`}>
                            Interest: ₹{currentI.toLocaleString()} / ₹{expectedInterest.toLocaleString()}
                          </span>
                          <span className={`text-xs font-bold ${Math.abs(currentTotal - expectedTotal) > 0.1 ? 'text-destructive' : ''}`}>
                            Total: ₹{currentTotal.toLocaleString()} / ₹{expectedTotal.toLocaleString()}
                          </span>
                        </>
                     );
                  })()}
                </div>
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
                            className="h-7 text-xs w-[145px] px-1" 
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
             <Button size="sm" onClick={handleEditMemberSchedule} disabled={loading}>
               {loading ? "Saving..." : "Save Member Schedule"}
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addMemberOpen} onOpenChange={(v) => { if (!v) resetForm(); setAddMemberOpen(v); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {addMemberStep === 1 && "Add Member to Loan - Step 1: Select Member"}
              {addMemberStep === 2 && "Add Member to Loan - Step 2: Review Schedule"}
              {addMemberStep === 3 && "Add Member to Loan - Success"}
            </DialogTitle>
          </DialogHeader>

          {addMemberStep === 1 && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-md text-xs border">
                Review the auto-generated schedule for the new member based on the existing group loan structure.
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground mr-1">Select Member from Group</Label>
                <Select value={targetMemberId} onValueChange={setTargetMemberId}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Choose a member to add" /></SelectTrigger>
                  <SelectContent>
                    {(() => {
                        const available = groupMembers.filter(m => !targetLoanMemberIds.includes(m.id));
                        if(available.length === 0) return <SelectItem value="none" disabled>no one</SelectItem>;
                        return available.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>);
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full h-11" 
                onClick={handleAddMemberPreview} 
                disabled={loading || !targetMemberId}
              >
                {loading ? "Calculating Schedule..." : "Generate Schedule Preview"}
              </Button>
            </div>
          )}

          {addMemberStep === 2 && addMemberDraft && (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4 mt-2">
                {/* Proposed Dynamic Summary Bar */}
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 shadow-sm flex flex-col md:flex-row justify-around items-center gap-4">
                  {(() => {
                      const curP = addMemberSchedule.reduce((sum, s) => sum + s.principal, 0);
                      const curI = addMemberSchedule.reduce((sum, s) => sum + s.interest, 0);
                      const curT = curP + curI;
                      const expP = expectedAddMemberPrincipal;
                      const expI = expectedAddMemberInterest;
                      const expT = expP + expI;

                      const isPErr = Math.abs(curP - expP) > 0.5;
                      const isIErr = Math.abs(curI - expI) > 0.5;
                      const isTErr = Math.abs(curT - expT) > 0.5;

                      return (
                        <>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Principal Amount</span>
                            <div className={`text-sm font-bold tracking-tight ${isPErr ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                              ₹{curP.toLocaleString()} <span className="text-muted-foreground/50 font-normal mx-1">/</span> ₹{expP.toLocaleString()}
                            </div>
                          </div>
                          <div className="h-8 w-px bg-border/50 hidden md:block" />
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Interest Amount</span>
                            <div className={`text-sm font-bold tracking-tight ${isIErr ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                              ₹{curI.toLocaleString()} <span className="text-muted-foreground/50 font-normal mx-1">/</span> ₹{expI.toLocaleString()}
                            </div>
                          </div>
                          <div className="h-8 w-px bg-border/50 hidden md:block" />
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Due Amount</span>
                            <div className={`text-sm font-black tracking-tight ${isTErr ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                              ₹{curT.toLocaleString()} <span className="text-muted-foreground/50 font-normal mx-1">/</span> ₹{expT.toLocaleString()}
                            </div>
                          </div>
                        </>
                      );
                  })()}
                </div>

                <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-md border border-dashed justify-between">
                    <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap pl-1">Standard Per Due Target:</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            className="h-8 w-24 text-xs font-bold pl-5 border-none bg-background focus-visible:ring-1" 
                            value={addMemberAdminTarget}
                            onChange={(e) => handleAdminTargetChange(Number(e.target.value))}
                          />
                          <span className="absolute left-1.5 top-2 text-muted-foreground font-bold text-[10px]">₹</span>
                        </div>
                        <p className="text-[10px] italic text-muted-foreground">Updating this redistributes the total across all rows</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 border rounded-md">
                    <table className="data-table text-[11px] w-full mt-0">
                        <thead className="bg-muted/50 sticky top-0 shadow-sm z-10">
                          <tr>
                            <th className="w-12 text-center">#</th>
                            <th className="text-left w-32">Due Date</th>
                            <th className="text-left w-24">Standard Per Due</th>
                            <th className="text-left">Principal</th>
                            <th className="text-left">Interest</th>
                            <th className="text-left bg-primary/5">Row Total</th>
                          </tr>
                        </thead>
                        <tbody>
                              {addMemberSchedule.map((item, idx) => (
                                <tr key={item.installmentNo}>
                                  <td className="text-center font-bold text-primary">
                                    {item.installmentNo}
                                  </td>
                                  <td>
                                    <Input
                                      type="date"
                                      value={item.dueDate}
                                      onChange={e => {
                                        const updated = [...addMemberSchedule];
                                        updated[idx] = { ...item, dueDate: e.target.value };
                                        setAddMemberSchedule(updated);
                                      }}
                                      className="h-7 w-[130px] text-[11px] px-1 border-none focus-visible:ring-1"
                                    />
                                  </td>
                                  <td className="font-semibold text-muted-foreground pl-1">
                                    ₹{addMemberAdminTarget.toLocaleString()}
                                  </td>
                                  <td>
                                    <Input
                                      type="number"
                                      value={item.principal}
                                      onChange={e => {
                                        const val = Math.round(Number(e.target.value));
                                        const updated = [...addMemberSchedule];
                                        updated[idx] = { ...item, principal: val, total: val + item.interest };
                                        setAddMemberSchedule(updated);
                                      }}
                                      className="h-7 w-20 text-[11px] border-none focus-visible:ring-1"
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      type="number"
                                      value={item.interest}
                                      onChange={e => {
                                        const val = Math.round(Number(e.target.value));
                                        const updated = [...addMemberSchedule];
                                        updated[idx] = { ...item, interest: val, total: val + item.principal };
                                        setAddMemberSchedule(updated);
                                      }}
                                      className="h-7 w-20 text-[11px] border-none focus-visible:ring-1"
                                    />
                                  </td>
                                  <td className="bg-primary/5 font-bold">
                                    <div className="flex items-center gap-1">
                                       ₹{Math.round(item.total).toLocaleString()}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={() => setAddMemberStep(1)} className="flex-1">Back</Button>
                      <Button variant="secondary" onClick={handleResetAddMemberSchedule} className="flex-1 gap-2">
                        <RotateCcw className="h-4 w-4" /> Reset Schedule
                      </Button>
                      <Button onClick={handleAddMemberConfirm} disabled={loading} className="flex-2 h-10 bg-primary">
                        {loading ? "Adding Member..." : "Confirm & Persist Schedule"}
                      </Button>
                    </div>
            </div>
          )}

          {addMemberStep === 3 && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="h-20 w-20 bg-success/20 rounded-full flex items-center justify-center text-success mb-2">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-bold">Member Linked!</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                The member has been added to the loan and their personalized schedule has been persisted.
              </p>
              <Button onClick={() => { setAddMemberOpen(false); window.location.reload(); }} className="px-10 h-11 mt-4">Close & Refresh</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
