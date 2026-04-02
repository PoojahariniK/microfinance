import { useState, useEffect } from "react";
import { 
  Banknote, Users, UsersRound, Wallet, HandCoins, TrendingUp, 
  PiggyBank, BarChart3, AlertCircle, Clock, CheckCircle2, 
  ArrowUpRight, ArrowDownRight, Loader2, Calendar
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    summary: null,
    pnl: null,
    pending: [],
    trend: [],
    groups: [],
    defaulters: [],
    upcoming: [],
    activity: null
  });
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const format = (val: any) => (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { "loggedInUser": user?.username || "" };
      
      const [summaryRes, pnlRes, pendingRes, trendRes, groupsRes, defaultersRes, activityRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/summary`, { headers }),
        fetch(`${API_BASE}/api/reports/pnl`, { headers }),
        fetch(`${API_BASE}/api/payments/pending?timeFilter=ALL`, { headers }),
        fetch(`${API_BASE}/api/reports/trend`, { headers }),
        fetch(`${API_BASE}/api/reports/groups`, { headers }),
        fetch(`${API_BASE}/api/reports/pending?groupId=ALL`, { headers }),
        fetch(`${API_BASE}/api/reports/activity`, { headers })
      ]);

      const [summary, pnl, pending, trend, groups, defaulters, activity] = await Promise.all([
        summaryRes.ok ? summaryRes.json() : null,
        pnlRes.ok ? pnlRes.json() : null,
        pendingRes.ok ? pendingRes.json() : [],
        trendRes.ok ? trendRes.json() : [],
        groupsRes.ok ? groupsRes.json() : [],
        defaultersRes.ok ? defaultersRes.json() : [],
        activityRes.ok ? activityRes.json() : null
      ]);

      // Process Pending for Today's Focus
      const overdueCount = pending.filter((p: any) => p.isOverdue).length;
      const todayPending = pending.filter((p: any) => p.dueDate === today).length;
      
      // Process Upcoming
      const upcoming = pending.filter((p: any) => p.dueDate > today).slice(0, 5);

      // Pulse Calculation (Efficiency)
      const todayCollection = activity?.payments?.filter((p: any) => p.date === today).reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
      const todayScheduled = pending.filter((p: any) => p.dueDate === today).reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
      const pulseEfficiency = todayScheduled + todayCollection > 0 ? (todayCollection / (todayScheduled + todayCollection)) * 100 : 0;

      setData({
        summary,
        pnl,
        pending,
        overdueCount,
        todayPending,
        trend: trend || [],
        groups,
        defaulters: (defaulters || []).sort((a: any, b: any) => b.pendingAmount - a.pendingAmount).slice(0, 15),
        upcoming,
        activity,
        pulseEfficiency
      });
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Ledger Systems...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Dashboard</h2>
        </div>
        
      </div>

      {/* SECTION 1: SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Loans", value: data.summary?.activeLoans, icon: Banknote, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Closed Loans", value: (data.summary?.totalLoans - data.summary?.activeLoans), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Groups", value: data.summary?.totalGroups, icon: UsersRound, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Principal O/S", value: `₹${format(data.summary?.pendingAmount)}`, icon: Wallet, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Total Collection", value: `₹${format(data.summary?.totalCollection)}`, icon: PiggyBank, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Interest Earned", value: `₹${format(data.summary?.totalInterestCollected)}`, icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
          { 
            label: "Total Revenue", 
            value: `₹${format(data.pnl?.totalRevenue)}`, 
            icon: TrendingUp, 
            color: "text-primary", 
            bg: "bg-primary/5",
            isHighlight: true 
          },
          { label: "Total Members", value: data.summary?.totalMembers, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
        ].map((s, i) => (
          <Card key={i} className={`border-none shadow-sm ${s.isHighlight ? 'ring-1 ring-primary/20' : ''}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${s.bg} ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{s.label}</p>
                <p className="text-lg font-black tracking-tight text-foreground">{s.value || 0}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SECTION 2: TODAY'S FOCUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-1 border-rose-100 bg-rose-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-3 w-3" /> Overdue Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-rose-700">{data.overdueCount}</span>
              <span className="text-xs font-bold text-rose-600/60 uppercase">Installments</span>
            </div>
            <p className="text-[9px] font-bold text-rose-600 mt-2 uppercase tracking-tighter">Requires immediate follow-up</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 border-amber-100 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-2">
              <Clock className="h-3 w-3" /> Today's Demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-amber-700">{data.todayPending}</span>
              <span className="text-xs font-bold text-amber-600/60 uppercase">Dues Today</span>
            </div>
            <p className="text-[9px] font-bold text-amber-600 mt-2 uppercase tracking-tighter">Collection active for {new Date().toLocaleDateString()}</p>
          </CardContent>
        </Card>

        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SECTION 3: COLLECTION TREND CHART */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Principal & Interest Velocity
            </h3>
            <span className="text-[9px] font-bold bg-muted px-2 py-1 rounded uppercase tracking-tighter">Monthly Projection</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border/50 shadow-sm min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} interval={0} height={40} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', paddingTop: '20px' }} />
                <Bar name="Principal Collected" dataKey="totalCollection" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar name="Interest Yield" dataKey="interest" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 7: RECENT ACTIVITY */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Live Registry Logs
          </h3>
          <div className="bg-white p-6 rounded-2xl border border-border/50 shadow-sm h-[320px] overflow-y-auto">
            <div className="space-y-6 pr-2">
              {data.activity?.payments.map((p: any, i: number) => (
                <div key={`p-${i}`} className="flex gap-4 group">
                  <div className="relative">
                    <div className="h-8 w-8 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                      <HandCoins className="h-4 w-4" />
                    </div>
                    {i !== (data.activity?.payments.length + data.activity?.loans.length - 1) && <div className="absolute top-8 left-4 w-px h-full bg-border -ml-[0.5px]" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600 mb-0.5">
                      PAYMENT RECEIVED <ArrowUpRight className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-bold text-foreground">{p.memberName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-black text-foreground">₹{format(p.amount)}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">{p.date}</span>
                    </div>
                  </div>
                </div>
              ))}
              {data.activity?.loans.map((l: any, i: number) => (
                <div key={`l-${i}`} className="flex gap-4 group">
                  <div className="relative">
                    <div className="h-8 w-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                      <Banknote className="h-4 w-4" />
                    </div>
                    {i !== data.activity?.loans.length - 1 && <div className="absolute top-8 left-4 w-px h-full bg-border -ml-[0.5px]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 mb-0.5">
                      NEW LOAN DISBURSED <ArrowUpRight className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-bold text-foreground">{l.groupName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-black text-foreground">Loan #{l.id}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">{l.startDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* SECTION 4: GROUP PERFORMANCE */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <UsersRound className="h-4 w-4" /> Portfolio Performance Matrix
          </h3>
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="max-h-[350px] overflow-y-auto relative">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-20 bg-gray-50">
                  <tr className="border-b border-border/50">
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground">Portfolio Group</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground text-right">Collection (₹)</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground text-right">Outstanding (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((g: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-foreground">{g.groupName}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-bold text-xs tracking-tight">₹{format(g.collection)}</td>
                      <td className="px-6 py-4 text-right text-rose-600 font-bold text-xs tracking-tight">₹{format(g.pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 5: TOP DEFAULTERS */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-rose-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> High-Risk Delinquency Monitor
          </h3>
          <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden border-t-4">
            <div className="max-h-[350px] overflow-y-auto relative">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-20 bg-rose-50">
                  <tr className="border-b border-rose-100">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-rose-700">Account Holder</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-rose-700 text-center">Dues</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-rose-700 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.defaulters.map((d: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-rose-50/20 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-foreground">
                        {d.memberName}
                        <span className="ml-2 py-0.5 px-1.5 bg-gray-100 text-[9px] text-muted-foreground rounded uppercase">Loan #{d.loanId}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black rounded-full">{d.overdueCount} DUES</span>
                      </td>
                      <td className="px-6 py-4 text-right text-rose-700 font-black text-xs tracking-tight">₹{format(d.pendingAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: UPCOMING COLLECTIONS */}
      <div className="space-y-4 pt-4">
         <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Pipeline Inventory (Next 5 Installments)
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {data.upcoming.map((u: any, i: number) => (
              <div key={i} className="p-4 bg-white border border-border/50 rounded-2xl shadow-sm hover:border-primary/20 transition-all group">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">{u.groupName}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-primary">INSTL #{u.installmentNo}</span>
                  <div className="h-6 w-6 bg-primary/5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-dashed border-border/50">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground mb-1">
                    <Calendar className="h-3 w-3" /> {u.dueDate}
                  </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                    <Users className="h-3 w-3" /> {u.pendingMembers} Pending
                  </div>
                </div>
              </div>
            ))}
            {data.upcoming.length === 0 && (
              <div className="col-span-5 py-12 text-center bg-gray-50/50 rounded-2xl border border-dashed border-border mx-auto w-full">
                 <Calendar className="h-8 w-8 mx-auto text-muted-foreground opacity-20 mb-2" />
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">No Upcoming Managed Demands Found</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
