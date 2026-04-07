// Shared in-memory data store for the microfinance system
// In production, this would be backed by a database

export interface Member {
  id: number;
  name: string;
  phone: string;
  address: string;
  aadhaar: string;
  nominee: string;
  bank: string;
  group: string;
}

export function calcEndDate(start: string, collectionType: string, durationWeeks: number): string {
  if (!start || !collectionType || durationWeeks <= 0) return "";
  const date = new Date(start);
  if (collectionType === "Daily") date.setDate(date.getDate() + durationWeeks * 7);
  else if (collectionType === "Weekly") date.setDate(date.getDate() + durationWeeks * 7);
  else if (collectionType === "Monthly") date.setMonth(date.getMonth() + durationWeeks / 4);
  return date.toISOString().split("T")[0];
}

export interface Group {
  id: string;
  name: string;
  collectionType: "Daily" | "Weekly" | "Monthly";
  collectionDay: string;
  collector: string;
  status: "Active" | "Inactive";
  members: number;
}

export interface LoanScheduleItem {
  dueNumber: number;
  dueDate: string;
  principal: number;
  interest: number;
  total: number;
  status: "Pending" | "Paid" | "Partial" | "Overdue";
  paidAmount: number;
}

export interface GroupLoan {
  id: string;
  groupId: string;
  groupName: string;
  loanAmount: number;
  interestRate: number;
  durationWeeks: number;
  collectionType: "Daily" | "Weekly" | "Monthly";
  startDate: string;
  savingAmount: number;
  insuranceFee: number;
  status: "Active" | "Closed";
  createdAt: string;
  memberLoans: MemberLoan[];
}

export interface MemberLoan {
  memberId: number;
  memberName: string;
  loanAmount: number;
  interestRate: number;
  schedule: LoanScheduleItem[];
}

export interface CollectionRecord {
  id: string;
  groupLoanId: string;
  groupName: string;
  dueDate: string;
  dueNumber: number;
  entries: CollectionEntry[];
  savedAt: string;
}

export interface CollectionEntry {
  memberId: number;
  memberName: string;
  loanAmount: number;
  principalDue: number;
  interestDue: number;
  saving: number;
  fine: number;
  totalDue: number;
  amountPaid: number;
  balance: number;
}

// --- Initial Data ---

const initialMembers: Member[] = [
  { id: 1, name: "Ramesh Kumar", phone: "9876543210", address: "12 Main St, Village", aadhaar: "1234-5678-9012", nominee: "Sita Kumar", bank: "SBI - 12345678", group: "Group A" },
  { id: 2, name: "Sita Devi", phone: "9876543211", address: "45 Market Rd", aadhaar: "2345-6789-0123", nominee: "Mohan Devi", bank: "PNB - 23456789", group: "Group A" },
  { id: 3, name: "Mohan Lal", phone: "9876543212", address: "78 Temple St", aadhaar: "3456-7890-1234", nominee: "Priya Lal", bank: "BOI - 34567890", group: "Group A" },
  { id: 4, name: "Priya Singh", phone: "9876543213", address: "22 River Lane", aadhaar: "4567-8901-2345", nominee: "Raj Singh", bank: "SBI - 45678901", group: "Group B" },
  { id: 5, name: "Anil Yadav", phone: "9876543214", address: "55 Hill View", aadhaar: "5678-9012-3456", nominee: "Meena Yadav", bank: "PNB - 56789012", group: "Group B" },
  { id: 6, name: "Geeta Rani", phone: "9876543215", address: "99 Park St", aadhaar: "6789-0123-4567", nominee: "Suresh Rani", bank: "BOI - 67890123", group: "Group B" },
  { id: 7, name: "Suresh Verma", phone: "9876543216", address: "33 Station Rd", aadhaar: "7890-1234-5678", nominee: "Kamla Verma", bank: "SBI - 78901234", group: "Group C" },
  { id: 8, name: "Kamla Devi", phone: "9876543217", address: "11 Bazaar St", aadhaar: "8901-2345-6789", nominee: "Ratan Devi", bank: "PNB - 89012345", group: "Group C" },
];

const initialGroups: Group[] = [
  { id: "GRP001", name: "Group A", collectionType: "Weekly", collectionDay: "Monday", collector: "Ravi", status: "Active", members: 3 },
  { id: "GRP002", name: "Group B", collectionType: "Monthly", collectionDay: "1st", collector: "Sunil", status: "Active", members: 3 },
  { id: "GRP003", name: "Group C", collectionType: "Weekly", collectionDay: "Wednesday", collector: "Amit", status: "Active", members: 2 },
];

// --- Store ---

let members = [...initialMembers];
let groups = [...initialGroups];
let groupLoans: GroupLoan[] = [];
let collectionRecords: CollectionRecord[] = [];

export const store = {
  // Members
  getMembers: () => [...members],
  setMembers: (m: Member[]) => { members = m; },
  getMembersByGroup: (groupName: string) => members.filter(m => m.group === groupName),

  // Groups
  getGroups: () => [...groups],
  setGroups: (g: Group[]) => { groups = g; },
  getGroupByName: (name: string) => groups.find(g => g.name === name),

  // Loans
  getGroupLoans: () => [...groupLoans],
  addGroupLoan: (loan: GroupLoan) => { groupLoans.push(loan); },
  getActiveLoansForGroup: (groupName: string) => groupLoans.filter(l => l.groupName === groupName && l.status === "Active"),

  // Collections
  getCollectionRecords: () => [...collectionRecords],
  addCollectionRecord: (record: CollectionRecord) => { collectionRecords.push(record); },
  getCollectionsByGroup: (groupName: string) => collectionRecords.filter(r => r.groupName === groupName),

  // Update loan schedule after collection
  markDuePaid: (groupLoanId: string, dueNumber: number, memberId: number, paidAmount: number) => {
    const loan = groupLoans.find(l => l.id === groupLoanId);
    if (!loan) return;
    const memberLoan = loan.memberLoans.find(ml => ml.memberId === memberId);
    if (!memberLoan) return;
    const due = memberLoan.schedule.find(s => s.dueNumber === dueNumber);
    if (!due) return;
    due.paidAmount += paidAmount;
    if (due.paidAmount >= due.total) {
      due.status = "Paid";
    } else if (due.paidAmount > 0) {
      due.status = "Partial";
    }
  },
};

// --- Utility: Generate installment schedule ---

export function generateSchedule(
  loanAmount: number,
  interestRate: number,
  durationWeeks: number,
  collectionType: "Daily" | "Weekly" | "Monthly",
  startDate: string
): LoanScheduleItem[] {
  let numberOfDues: number;
  if (collectionType === "Daily") {
    numberOfDues = durationWeeks * 7;
  } else if (collectionType === "Weekly") {
    numberOfDues = durationWeeks;
  } else if (collectionType === "Monthly") {
    numberOfDues = durationWeeks / 4;
  } else {
    numberOfDues = durationWeeks;
  }

  const principalPerDue = Math.round(loanAmount / numberOfDues);
  const totalInterest = Math.round(loanAmount * (interestRate / 100) * durationWeeks);
  const interestPerDue = Math.round(totalInterest / numberOfDues);

  const schedule: LoanScheduleItem[] = [];
  const start = new Date(startDate);

  for (let i = 1; i <= numberOfDues; i++) {
    const dueDate = new Date(start);
    if (collectionType === "Daily") {
      dueDate.setDate(start.getDate() + i);
    } else if (collectionType === "Weekly") {
      dueDate.setDate(start.getDate() + i * 7);
    } else {
      dueDate.setMonth(start.getMonth() + i);
    }

    // Adjust last installment for rounding
    const isLast = i === numberOfDues;
    const thisPrincipal = isLast ? loanAmount - principalPerDue * (numberOfDues - 1) : principalPerDue;
    const thisInterest = isLast ? totalInterest - interestPerDue * (numberOfDues - 1) : interestPerDue;

    schedule.push({
      dueNumber: i,
      dueDate: dueDate.toISOString().split("T")[0],
      principal: thisPrincipal,
      interest: thisInterest,
      total: thisPrincipal + thisInterest,
      status: "Pending",
      paidAmount: 0,
    });
  }

  return schedule;
}
