import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getFinanceCategories, getMonthSummary, getTransactions } from '@/features/finance/actions';
import { FinanceTracker } from '@/features/finance/components/finance-tracker';
import { BarChart, DonutChart } from '@/components/common/charts';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Personal Finance',
  description: 'Lightweight personal income and expense tracking.',
};

interface FinancePageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = /^\d{4}-\d{2}$/.test(params.month ?? '') ? (params.month as string) : defaultMonth;

  const prevMonth = (() => {
    const d = new Date(`${month}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  const [summary, prev, transactions, categories] = await Promise.all([
    getMonthSummary(month),
    getMonthSummary(prevMonth),
    getTransactions({ limit: 200 }),
    getFinanceCategories(),
  ]);

  const trend = [
    { label: prevMonth.slice(5), value: prev.net },
    { label: month.slice(5), value: summary.net },
  ];

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Personal Finance"
        description="Income and expenses, tracked by hand. Personal only — never mixed with organizational finance."
        actions={
          <>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
            <form action="/finance" method="get" className="flex items-center gap-1.5">
              <input
                type="month"
                name="month"
                defaultValue={month}
                aria-label="Summary month"
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              />
              <Button type="submit" variant="outline" size="sm" className="h-8">
                View
              </Button>
            </form>
          </>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Income · {month}</p>
          <p className="text-2xl font-bold tabular-nums">+{formatMoney(summary.income)}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Expenses · {month}</p>
          <p className="text-2xl font-bold tabular-nums text-destructive">
            −{formatMoney(summary.expenses)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Net · {month}</p>
          <p className={`text-2xl font-bold tabular-nums ${summary.net < 0 ? 'text-destructive' : ''}`}>
            {formatMoney(summary.net)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground">vs {prevMonth}</p>
          <p className="text-2xl font-bold tabular-nums">
            {summary.net - prev.net >= 0 ? '+' : '−'}
            {formatMoney(Math.abs(summary.net - prev.net))}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Net Trend</h2>
          <BarChart data={trend} height={140} ariaLabel={`Net result ${prevMonth} versus ${month}`} />
        </section>
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Spending by Category</h2>
          <DonutChart
            data={summary.byCategory.map((c) => ({ label: c.category, value: c.expenses }))}
            ariaLabel={`Expense breakdown for ${month}`}
          />
        </section>
      </div>

      <section>
        <FinanceTracker initialTransactions={transactions} categories={categories} defaultMonth={month} />
      </section>
    </AppShell>
  );
}
