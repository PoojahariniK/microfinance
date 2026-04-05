package com.microfinance.loanapp.dto.report;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data @NoArgsConstructor @AllArgsConstructor
public class DashboardReportDto {
    private double totalDisbursed;
    private double totalCollection;
    private double totalOutstanding;
    private double totalInterestEarned;
    private long totalGroups;
    private long totalMembers;
    private long activeLoans;
    private long closedLoans;
    private double collectionEfficiency;
    private double overduePercentage;
    private int highRiskLoansCount;
    private List<TrendDto> trends;
    private List<UpcomingInstallmentDto> upcomingInstallments;
}
