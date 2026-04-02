export interface LoanChargesDto {
  savingAmount: number;
  insuranceFee: number;
  processingFee: number;
  documentFee: number;
}

export interface LoanMemberDraftDto {
  memberId: number;
  memberName: string;
  loanAmount: number;
}

export interface LoanDraftDto {
  groupId: number;
  totalLoanAmount: number;
  interestRate: number;
  durationMonths: number;
  startDate: string;
  endDate: string;
  members: LoanMemberDraftDto[];
  charges: LoanChargesDto;
}

export interface LoanInitRequest {
  groupId: number;
  totalLoanAmount: number;
  interestRate: number;
  durationMonths: number;
  startDate: string;
  endDate: string;
  memberIds: number[];
  charges: LoanChargesDto;
}

export interface LoanSchedulePreviewDto {
  memberId: number;
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  total: number;
}

export interface MemberScheduleDto {
  loanScheduleId?: number;
  memberId: number;
  memberName?: string;
  installmentNo?: number;
  dueDate?: string;
  principal: number;
  interest: number;
  total: number;
  paidAmount?: number;
  status?: string;
}

export interface LoanConfirmRequest {
  draft: LoanDraftDto;
  schedules: LoanSchedulePreviewDto[];
}

export interface MemberScheduleEditDto {
  loanScheduleId: number;
  memberId: number;
  principal: number;
  interest: number;
  total: number;
}

export interface LoanScheduleGroupResponse {
  loanId: number;
  installmentNo: number;
  dueDate: string;
  members: MemberScheduleDto[];
}

export interface EditLoanScheduleRequest {
  loanId: number;
  installmentNo: number;
  members: MemberScheduleEditDto[];
}

export interface AddMemberRequest {
  loanId: number;
  memberId: number;
}

export interface AddMemberScheduleDto {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  total: number;
}

export interface AddMemberPreviewResponse {
  loanId: number;
  memberId: number;
  memberName: string;
  principalAmount: number;
  schedules: AddMemberScheduleDto[];
}

export interface AddMemberConfirmRequest {
  memberId: number;
  principalAmount: number;
  schedules: AddMemberScheduleDto[];
}

export interface LoanSummaryResponse {
  id: number;
  groupId: number;
  groupName: string;
  totalMembers: number;
  totalPrincipal: number;
  interestRate: number;
  durationMonths: number;
  collectionType: string;
  status: string;
  charges?: LoanChargesDto;
  chargeStatus?: string;
}

export interface EditLoanRequest {
  charges?: LoanChargesDto;
  status?: string;
}

export interface EditMemberScheduleRequest {
  loanId: number;
  memberId: number;
  schedules: MemberScheduleDto[];
}

export interface CollectionMemberDto {
  loanScheduleId: number;
  memberName: string;
  principal: number;
  interest: number;
  charges: number;
  totalDue: number;
  paidAmount: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
}

export interface CollectionResponse {
  installmentNo: number;
  dueDate: string;
  members: CollectionMemberDto[];
}

export interface PaymentEntryDto {
  loanScheduleId: number;
  amount: number;
}

export interface CollectPaymentRequest {
  loanId: number;
  installmentNo: number;
  paymentDate?: string;
  payments: PaymentEntryDto[];
}

export interface EditPaymentRequest {
  loanId: number;
  installmentNo: number;
  payments: PaymentEntryDto[];
}

export interface PaymentHistoryDto {
  paymentId: number;
  amount: number;
  paymentDate: string;
  collectedBy: string;
}

export interface ChargePaymentMemberDto {
  memberId: number;
  memberName: string;
  amountPaid: number;
  paymentDate: string;
}

export interface ChargeStatusResponse {
  status: "PAID" | "PARTIAL" | "UNPAID";
}

export interface ChargePaymentRequest {
  memberId: number;
  amountPaid: number;
}

export interface PendingPaymentDto {
  groupId: number;
  groupName: string;
  loanId: number;
  installmentNo: number;
  dueDate: string;
  totalMembers: number;
  paidMembers: number;
  pendingMembers: number;
  status: "UNPAID" | "PARTIAL";
  isOverdue: boolean;
}
