import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getTodayInvoices, getDailyReport, getMonthlyReport, getTopProducts } from '@/services/sales';
import { getLowStockProducts } from '@/services/products';
import { getBranches } from '@/services/branches';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Invoice, DailyReport, MonthlyReport, TopProduct, Branch, ReturnRecord } from '@/types/index';
import { getReturnReport } from '@/services/returns';
import * as XLSX from 'xlsx';
import {
  BarChart2, RefreshCw, TrendingUp, ShoppingBag, Receipt, AlertTriangle, Award, Download, Undo2
} from 'lucide-react';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'මුදල්', card: 'කාඩ්', transfer: 'Transfer',
};

const MONTHS: { value: string; label: string }[] = [
  { value: '1', label: 'ජනවාරි' }, { value: '2', label: 'පෙබරවාරි' },
  { value: '3', label: 'මාර්තු' }, { value: '4', label: 'අප්‍රේල්' },
  { value: '5', label: 'මැයි' }, { value: '6', label: 'ජූනි' },
  { value: '7', label: 'ජූලි' }, { value: '8', label: 'අගෝස්තු' },
  { value: '9', label: 'සැප්තැම්බර්' }, { value: '10', label: 'ඔක්තෝබර්' },
  { value: '11', label: 'නොවැම්බර්' }, { value: '12', label: 'දෙසැම්බර්' },
];

function StatCard({ label, value, sub, color = 'text-foreground', loading: l }: {
  label: string; value: string; sub?: string; color?: string; loading?: boolean;
}) {
  return (
    <Card className="h-full">
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        {l ? <Skeleton className="h-7 w-24 mt-1 bg-muted" /> : (
          <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
        )}
        {sub && !l && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  // Cashier locked to their own branch; admin can select any
  const cashierBranch = (!isAdmin && profile?.branch_id) ? profile.branch_id : null;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Today sales
  const [todayInvoices, setTodayInvoices] = useState<Invoice[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);

  // Daily — cashier auto-locked to branch
  const [dailyDate, setDailyDate] = useState(today);
  const [dailyBranch, setDailyBranch] = useState(cashierBranch ?? 'all');
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Monthly — cashier auto-locked to branch
  const [monthYear, setMonthYear] = useState(String(now.getFullYear()));
  const [monthMonth, setMonthMonth] = useState(String(now.getMonth() + 1));
  const [monthBranch, setMonthBranch] = useState(cashierBranch ?? 'all');
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Top products
  const [topDate, setTopDate] = useState(today);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loadingTop, setLoadingTop] = useState(false);

  // Low stock
  const [lowStock, setLowStock] = useState<{ id: string; name: string; barcode: string; qty: number }[]>([]);
  const [loadingLow, setLoadingLow] = useState(true);
  // Returns report
  const [returnDate, setReturnDate] = useState(today);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);

  // Branches
  const [branches, setBranches] = useState<Branch[]>([]);

  const loadToday = useCallback(async () => {
    setLoadingToday(true);
    try {
      setTodayInvoices(await getTodayInvoices());
    } catch { toast.error('අද විකිණීම් ලබාගැනීම අසාර්ථකයි'); }
    finally { setLoadingToday(false); }
  }, []);

  const loadLowStock = useCallback(async () => {
    setLoadingLow(true);
    try { setLowStock(await getLowStockProducts()); }
    catch { toast.error('අඩු stock ලබාගැනීම අසාර්ථකයි'); }
    finally { setLoadingLow(false); }
  }, []);

  const loadBranches = useCallback(async () => {
    try { setBranches(await getBranches()); }
    catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    loadToday();
    loadLowStock();
    loadBranches();
  }, [loadToday, loadLowStock, loadBranches]);

  const fetchDailyReport = async () => {
    setLoadingDaily(true);
    try {
      setDailyReport(await getDailyReport(dailyDate, dailyBranch === 'all' ? null : dailyBranch));
    } catch { toast.error('Daily report ලබාගැනීම අසාර්ථකයි'); }
    finally { setLoadingDaily(false); }
  };

  const fetchMonthlyReport = async () => {
    setLoadingMonthly(true);
    try {
      setMonthlyReport(await getMonthlyReport(
        parseInt(monthYear, 10),
        parseInt(monthMonth, 10),
        monthBranch === 'all' ? null : monthBranch
      ));
    } catch { toast.error('Monthly report ලබාගැනීම අසාර්ථකයි'); }
    finally { setLoadingMonthly(false); }
  };

  const fetchTopProducts = async () => {
    setLoadingTop(true);
    try { setTopProducts(await getTopProducts(topDate)); }
    catch { toast.error('Top products ලබාගැනීම අසාර්ථකයි'); }
    finally { setLoadingTop(false); }
  };

  const todayTotal = todayInvoices.reduce((s, i) => s + i.total_amount, 0);
  const todayProfit = todayInvoices.reduce((s, i) => s + i.total_profit, 0);

  const exportTodaySales = () => {
    if (todayInvoices.length === 0) return toast.info('විකිණීම් නොමැත');
    const rows = todayInvoices.map(inv => ({
      'Invoice No': inv.invoice_no,
      'Time': new Date(inv.created_at).toLocaleTimeString('si-LK'),
      'Cashier': inv.cashier_username,
      'Customer': inv.customer_name || '-',
      'Total Amount': inv.total_amount,
      'Payment Method': PAYMENT_LABELS[inv.payment_method] || inv.payment_method,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Today_Sales');
    XLSX.writeFile(wb, `Today_Sales_${today}.xlsx`);
  };

  const fetchReturnsReport = async () => {
    if (!profile?.shop_id) return;
    setLoadingReturns(true);
    try { setReturns(await getReturnReport(profile.shop_id, returnDate, returnDate)); }
    catch { toast.error('Returns ලබාගැනීම අසාර්ථකයි'); }
    finally { setLoadingReturns(false); }
  };

  const exportDailySales = () => {
    if (!dailyReport) return toast.info('දෛනික විකිණීම් නොමැත');
    const rows = [{
      'Date': dailyReport.date,
      'Invoice Count': dailyReport.invoice_count,
      'Total Sales (Rs)': dailyReport.total_sales,
      'Total Cost (Rs)': dailyReport.total_cost,
      'Total Profit (Rs)': dailyReport.total_profit,
    }];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily_Sales');
    XLSX.writeFile(wb, `Daily_Sales_${dailyDate}.xlsx`);
  };

  const exportMonthlySales = () => {
    if (!monthlyReport) return toast.info('මාසික විකිණීම් නොමැත');
    const rows = [{
      'Year': monthlyReport.year,
      'Month': monthlyReport.month,
      'Invoice Count': monthlyReport.invoice_count,
      'Total Sales (Rs)': monthlyReport.total_sales,
      'Total Cost (Rs)': monthlyReport.total_cost,
      'Total Profit (Rs)': monthlyReport.total_profit,
    }];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly_Sales');
    XLSX.writeFile(wb, `Monthly_Sales_${monthYear}_${monthMonth}.xlsx`);
  };

  const exportLowStock = () => {
    if (lowStock.length === 0) return toast.info('අඩු Stock නොමැත');
    const rows = lowStock.map(p => ({
      'Product Name': p.name,
      'Barcode': p.barcode,
      'Current Qty': p.qty,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Low_Stock');
    XLSX.writeFile(wb, `Low_Stock_${today}.xlsx`);
  };

  const exportReturns = () => {
    if (returns.length === 0) return toast.info('Returns නොමැත');
    const rows = returns.flatMap(r => {
      if (!r.return_items || r.return_items.length === 0) {
        return [{
          'Return Date': new Date(r.created_at).toLocaleTimeString('si-LK'),
          'Invoice ID': r.invoice_id,
          'Reason': r.reason,
          'Total Refund': r.total_refund,
          'Cashier': r.cashier_username,
          'Product Name': '-',
          'Qty': 0,
          'Price': 0
        }];
      }
      return r.return_items.map((item: any) => ({
        'Return Date': new Date(r.created_at).toLocaleTimeString('si-LK'),
        'Invoice ID': r.invoice_id,
        'Reason': r.reason,
        'Total Refund': r.total_refund,
        'Cashier': r.cashier_username,
        'Product Name': item.product_name,
        'Qty': item.qty,
        'Price': item.price
      }));
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Returns');
    XLSX.writeFile(wb, `Returns_${returnDate}.xlsx`);
  };
  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-balance">{t('nav.reports')}</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => { loadToday(); loadLowStock(); }} className="gap-1.5 shrink-0">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="sr-only md:not-sr-only">යාවත්කාලීන</span>
          </Button>
        </div>

        {/* Today summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="අද Invoices" value={String(todayInvoices.length)} loading={loadingToday} color="text-primary" />
          <StatCard label="අද විකිණීම්" value={`Rs. ${todayTotal.toFixed(0)}`} loading={loadingToday} />
          {isAdmin && (
            <StatCard label="අද ලාභය" value={`Rs. ${todayProfit.toFixed(0)}`} loading={loadingToday} color="text-green-500" />
          )}
          <StatCard label="අඩු Stock" value={String(lowStock.length)} loading={loadingLow} color={lowStock.length > 0 ? 'text-destructive' : 'text-foreground'} />
        </div>

        <Tabs defaultValue="today">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="today" className="gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              <span>අද විකිණීම්</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="daily" className="gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>දෛනික</span>
                </TabsTrigger>
                <TabsTrigger value="monthly" className="gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>මාසික</span>
                </TabsTrigger>
                <TabsTrigger value="top" className="gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>Top Products</span>
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="lowstock" className="gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>අඩු Stock</span>
              {lowStock.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 text-xs px-1">{lowStock.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="returns" className="gap-1.5">
              <Undo2 className="w-3.5 h-3.5" />
              <span>Returns</span>
            </TabsTrigger>
          </TabsList>

          {/* Today's Sales */}
          <TabsContent value="today" className="mt-3">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-balance">
                  අද ({new Date().toLocaleDateString('si-LK')}) — {todayInvoices.length} Invoices
                </CardTitle>
                <Button size="sm" variant="outline" onClick={exportTodaySales} className="gap-1.5 h-8">
                  <Download className="w-3.5 h-3.5" />
                  <span className="sr-only md:not-sr-only">Download</span>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full max-w-full overflow-x-auto bg-card rounded-b-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Invoice #</TableHead>
                        <TableHead className="whitespace-nowrap">Cashier</TableHead>
                        <TableHead className="whitespace-nowrap">ගෙවීම</TableHead>
                        <TableHead className="whitespace-nowrap">Items</TableHead>
                        <TableHead className="whitespace-nowrap">{t('billing.total')}</TableHead>
                        {isAdmin && <TableHead className="whitespace-nowrap">ලාභය</TableHead>}
                        <TableHead className="whitespace-nowrap">වේලාව</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingToday ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: isAdmin ? 7 : 6 }).map((__, j) => (
                              <TableCell key={j}><Skeleton className="h-5 w-full bg-muted" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : todayInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-muted-foreground whitespace-nowrap">
                            අද විකිණීම් නොමැත
                          </TableCell>
                        </TableRow>
                      ) : (
                        todayInvoices.map(inv => (
                          <TableRow key={inv.id}>
                            <TableCell className="whitespace-nowrap font-bold">#{inv.invoice_no}</TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">{inv.cashier_username}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline" className="text-xs">
                                {PAYMENT_LABELS[inv.payment_method] ?? inv.payment_method}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{inv.items?.length ?? 0}</TableCell>
                            <TableCell className="whitespace-nowrap font-medium">Rs. {inv.total_amount.toFixed(2)}</TableCell>
                            {isAdmin && (
                              <TableCell className="whitespace-nowrap text-green-500">
                                Rs. {inv.total_profit.toFixed(2)}
                              </TableCell>
                            )}
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {new Date(inv.created_at).toLocaleTimeString('si-LK', { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Report */}
          {isAdmin && (
            <TabsContent value="daily" className="mt-3 space-y-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-normal">දිනය</Label>
                      <Input
                        type="date"
                        value={dailyDate}
                        onChange={e => setDailyDate(e.target.value)}
                        max={today}
                        className="px-3 w-44"
                      />
                    </div>
                    {branches.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-normal">{t('products.branch')}</Label>
                        <Select value={dailyBranch} onValueChange={setDailyBranch}>
                          <SelectTrigger className="w-44">
                            <SelectValue placeholder="සියල්ල" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">සියල්ල</SelectItem>
                            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={fetchDailyReport} disabled={loadingDaily} className="shrink-0">
                      {loadingDaily ? 'ගෙනිමින්...' : 'වාර්තාව ලබාගන්න'}
                    </Button>
                    <Button variant="outline" onClick={exportDailySales} disabled={!dailyReport} className="shrink-0 gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      <span className="sr-only md:not-sr-only">Download</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {dailyReport && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Invoices" value={String(dailyReport.invoice_count)} />
                  <StatCard label="විකිණීම්" value={`Rs. ${dailyReport.total_sales.toFixed(2)}`} />
                  <StatCard label="ලාභය" value={`Rs. ${dailyReport.total_profit.toFixed(2)}`} color="text-green-500" />
                  <StatCard label="පිරිවැය" value={`Rs. ${dailyReport.total_cost.toFixed(2)}`} />
                </div>
              )}
              {!dailyReport && !loadingDaily && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  ඉහත filter select කර "වාර්තාව ලබාගන්න" ක්ලික් කරන්න
                </p>
              )}
            </TabsContent>
          )}

          {/* Monthly Report */}
          {isAdmin && (
            <TabsContent value="monthly" className="mt-3 space-y-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row gap-3 items-end flex-wrap">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-normal">වර්ෂය</Label>
                      <Input
                        type="number"
                        min="2020"
                        max={now.getFullYear()}
                        value={monthYear}
                        onChange={e => setMonthYear(e.target.value)}
                        className="px-3 w-28"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-normal">මාසය</Label>
                      <Select value={monthMonth} onValueChange={setMonthMonth}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="මාසය" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {branches.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-normal">{t('products.branch')}</Label>
                        <Select value={monthBranch} onValueChange={setMonthBranch}>
                          <SelectTrigger className="w-44">
                            <SelectValue placeholder="සියල්ල" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">සියල්ල</SelectItem>
                            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={fetchMonthlyReport} disabled={loadingMonthly} className="shrink-0">
                      {loadingMonthly ? 'ගෙනිමින්...' : 'වාර්තාව ලබාගන්න'}
                    </Button>
                    <Button variant="outline" onClick={exportMonthlySales} disabled={!monthlyReport} className="shrink-0 gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      <span className="sr-only md:not-sr-only">Download</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {monthlyReport && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Invoices" value={String(monthlyReport.invoice_count)} />
                  <StatCard label="විකිණීම්" value={`Rs. ${monthlyReport.total_sales.toFixed(2)}`} />
                  <StatCard label="ලාභය" value={`Rs. ${monthlyReport.total_profit.toFixed(2)}`} color="text-green-500" />
                  <StatCard label="පිරිවැය" value={`Rs. ${monthlyReport.total_cost.toFixed(2)}`} />
                </div>
              )}
              {!monthlyReport && !loadingMonthly && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  ඉහත filter select කර "වාර්තාව ලබාගන්න" ක්ලික් කරන්න
                </p>
              )}
            </TabsContent>
          )}

          {/* Top Products */}
          {isAdmin && (
            <TabsContent value="top" className="mt-3 space-y-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-normal">දිනය</Label>
                      <Input
                        type="date"
                        value={topDate}
                        onChange={e => setTopDate(e.target.value)}
                        max={today}
                        className="px-3 w-44"
                      />
                    </div>
                    <Button onClick={fetchTopProducts} disabled={loadingTop} className="shrink-0">
                      {loadingTop ? 'ගෙනිමින්...' : 'ලබාගන්න'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <div className="w-full max-w-full overflow-x-auto bg-card rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">#</TableHead>
                          <TableHead className="whitespace-nowrap">භාණ්ඩ නාමය</TableHead>
                          <TableHead className="whitespace-nowrap">විකුණූ ප්‍රමාණය</TableHead>
                          <TableHead className="whitespace-nowrap">Revenue (Rs.)</TableHead>
                          <TableHead className="whitespace-nowrap">ලාභය (Rs.)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingTop ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              {Array.from({ length: 5 }).map((__, j) => (
                                <TableCell key={j}><Skeleton className="h-5 w-full bg-muted" /></TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : topProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground whitespace-nowrap">
                              දිනයක් select කර "ලබාගන්න" ක්ලික් කරන්න
                            </TableCell>
                          </TableRow>
                        ) : (
                          topProducts.map((p, i) => (
                            <TableRow key={p.product_name}>
                              <TableCell className="whitespace-nowrap font-bold text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="whitespace-nowrap font-medium">
                                <div className="flex items-center gap-1.5">
                                  {i === 0 && <ShoppingBag className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                                  {p.product_name}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{p.total_qty}</TableCell>
                              <TableCell className="whitespace-nowrap font-medium">Rs. {p.total_revenue.toFixed(2)}</TableCell>
                              <TableCell className="whitespace-nowrap text-green-500">Rs. {p.total_profit.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Low Stock */}
          <TabsContent value="lowstock" className="mt-3">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-balance">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  අඩු Stock (10 ට අඩු)
                </CardTitle>
                <Button size="sm" variant="outline" onClick={exportLowStock} className="gap-1.5 h-8">
                  <Download className="w-3.5 h-3.5" />
                  <span className="sr-only md:not-sr-only">Download</span>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full max-w-full overflow-x-auto bg-card rounded-b-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">භාණ්ඩ නාමය</TableHead>
                        <TableHead className="whitespace-nowrap">{t('products.barcode')}</TableHead>
                        <TableHead className="whitespace-nowrap">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingLow ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            {[1, 2, 3].map(j => <TableCell key={j}><Skeleton className="h-5 w-full bg-muted" /></TableCell>)}
                          </TableRow>
                        ))
                      ) : lowStock.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-12 text-muted-foreground whitespace-nowrap">
                            සියලු භාණ්ඩ ප්‍රමාණවත් stock ඇත
                          </TableCell>
                        </TableRow>
                      ) : (
                        lowStock.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="whitespace-nowrap font-medium">{p.name}</TableCell>
                            <TableCell className="whitespace-nowrap font-mono text-sm text-muted-foreground">{p.barcode}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="destructive">{p.qty}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returns" className="mt-3 space-y-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-normal">දිනය</Label>
                    <Input
                      type="date"
                      value={returnDate}
                      onChange={e => setReturnDate(e.target.value)}
                      max={today}
                      className="px-3 w-44"
                    />
                  </div>
                  <Button onClick={fetchReturnsReport} disabled={loadingReturns} className="shrink-0">
                    {loadingReturns ? 'ගෙනිමින්...' : 'වාර්තාව ලබාගන්න'}
                  </Button>
                  <Button variant="outline" onClick={exportReturns} disabled={returns.length === 0} className="shrink-0 gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    <span className="sr-only md:not-sr-only">Download</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="w-full max-w-full overflow-x-auto bg-card rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Return Date</TableHead>
                        <TableHead className="whitespace-nowrap">Invoice ID</TableHead>
                        <TableHead className="whitespace-nowrap">Reason</TableHead>
                        <TableHead className="whitespace-nowrap">Total Refund</TableHead>
                        <TableHead className="whitespace-nowrap">Cashier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground whitespace-nowrap">
                            දත්ත නොමැත
                          </TableCell>
                        </TableRow>
                      ) : (
                        returns.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString('si-LK')}</TableCell>
                            <TableCell className="whitespace-nowrap font-mono">{r.invoice_id}</TableCell>
                            <TableCell className="whitespace-nowrap">{r.reason}</TableCell>
                            <TableCell className="whitespace-nowrap font-medium text-destructive">Rs. {r.total_refund.toFixed(2)}</TableCell>
                            <TableCell className="whitespace-nowrap">{r.cashier_username}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
