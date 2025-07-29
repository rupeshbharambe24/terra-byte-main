
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3, 
  Download,
  Plus,
  CreditCard,
  Wallet,
  Building,
  Calculator
} from 'lucide-react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';

const FinancialManagement: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [activeTab, setActiveTab] = useState('overview');

  // Mock financial data
  const financialOverview = {
    totalAssets: 2450000,
    totalLiabilities: 890000,
    equity: 1560000,
    availableCash: 125000,
    pendingBalance: 35000,
    monthlyRevenue: 185000,
    monthlyExpenses: 142000,
    netIncome: 43000
  };

  const transactions = [
    { id: 1, date: '2024-01-15', description: 'Crop Sales - Wheat', category: 'Revenue', amount: 85000, type: 'income' },
    { id: 2, date: '2024-01-14', description: 'Fertilizer Purchase', category: 'Variable Expenses', amount: -12000, type: 'expense' },
    { id: 3, date: '2024-01-13', description: 'Equipment Maintenance', category: 'Fixed Expenses', amount: -8500, type: 'expense' },
    { id: 4, date: '2024-01-12', description: 'Dairy Sales', category: 'Revenue', amount: 25000, type: 'income' },
    { id: 5, date: '2024-01-11', description: 'Utility Bills', category: 'Fixed Expenses', amount: -3200, type: 'expense' }
  ];

  const loans = [
    {
      id: 1,
      type: 'Term Loan',
      bank: 'Agricultural Bank',
      principal: 500000,
      outstanding: 350000,
      interestRate: 8.5,
      monthlyPayment: 15000,
      nextPayment: '2024-02-01',
      status: 'Active'
    },
    {
      id: 2,
      type: 'Line of Credit',
      bank: 'Rural Credit Union',
      principal: 100000,
      outstanding: 45000,
      interestRate: 9.2,
      monthlyPayment: 2500,
      nextPayment: '2024-01-25',
      status: 'Active'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Financial Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive financial tracking and management for your farm operations.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="loans">Loans & Credit</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="budget">Budget Planning</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Financial Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                    <Building className="w-4 h-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialOverview.totalAssets)}</div>
                    <p className="text-xs text-green-600 mt-1">+5.2% from last month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
                    <CreditCard className="w-4 h-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialOverview.totalLiabilities)}</div>
                    <p className="text-xs text-red-600 mt-1">-2.1% from last month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Equity</CardTitle>
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialOverview.equity)}</div>
                    <p className="text-xs text-blue-600 mt-1">+8.7% from last month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available Cash</CardTitle>
                    <Wallet className="w-4 h-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialOverview.availableCash)}</div>
                    <p className="text-xs text-purple-600 mt-1">Pending: {formatCurrency(financialOverview.pendingBalance)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Income vs Expenses Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Income vs Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Revenue</span>
                        <span className="text-green-600 font-bold">{formatCurrency(financialOverview.monthlyRevenue)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{width: '75%'}}></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Expenses</span>
                        <span className="text-red-600 font-bold">{formatCurrency(financialOverview.monthlyExpenses)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-600 h-2 rounded-full" style={{width: '58%'}}></div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Net Income</span>
                        <span className="text-blue-600 font-bold">{formatCurrency(financialOverview.netIncome)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Asset Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Land & Property</span>
                        <span className="text-sm font-medium">65%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Equipment & Machinery</span>
                        <span className="text-sm font-medium">20%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Livestock</span>
                        <span className="text-sm font-medium">10%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Cash & Investments</span>
                        <span className="text-sm font-medium">5%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Transaction History</h2>
                <div className="flex gap-2">
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">This Week</SelectItem>
                      <SelectItem value="monthly">This Month</SelectItem>
                      <SelectItem value="quarterly">This Quarter</SelectItem>
                      <SelectItem value="yearly">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Transaction
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{transaction.category}</TableCell>
                          <TableCell className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(Math.abs(transaction.amount))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loans" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Loans & Credit Management</h2>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Loan
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loans.map((loan) => (
                  <Card key={loan.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{loan.type}</CardTitle>
                        <Badge>{loan.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{loan.bank}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Outstanding</p>
                          <p className="font-semibold">{formatCurrency(loan.outstanding)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Principal</p>
                          <p className="font-semibold">{formatCurrency(loan.principal)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Interest Rate</p>
                          <p className="font-semibold">{loan.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Monthly Payment</p>
                          <p className="font-semibold">{formatCurrency(loan.monthlyPayment)}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-sm text-gray-600">Next Payment</p>
                        <p className="font-semibold">{loan.nextPayment}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{width: `${((loan.principal - loan.outstanding) / loan.principal) * 100}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-center text-gray-600">
                        {Math.round(((loan.principal - loan.outstanding) / loan.principal) * 100)}% paid off
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Financial Reports</h2>
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Export Reports
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Balance Sheet
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Assets, liabilities, and equity overview</p>
                    <Button variant="outline" className="w-full mt-4">Generate Report</Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Income Statement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Revenue and expense analysis</p>
                    <Button variant="outline" className="w-full mt-4">Generate Report</Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Cash Flow Statement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Cash inflows and outflows tracking</p>
                    <Button variant="outline" className="w-full mt-4">Generate Report</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="budget" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Budget Planning</h2>
                <Button>
                  <Calculator className="w-4 h-4 mr-2" />
                  Create Budget
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Budget vs Actual Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { category: 'Revenue', budgeted: 180000, actual: 185000 },
                      { category: 'Fixed Expenses', budgeted: 85000, actual: 82000 },
                      { category: 'Variable Expenses', budgeted: 60000, actual: 60000 },
                      { category: 'Capital Expenses', budgeted: 25000, actual: 30000 }
                    ].map((item) => (
                      <div key={item.category} className="grid grid-cols-4 gap-4 items-center">
                        <div className="font-medium">{item.category}</div>
                        <div className="text-center">{formatCurrency(item.budgeted)}</div>
                        <div className="text-center">{formatCurrency(item.actual)}</div>
                        <div className={`text-center font-medium ${
                          item.actual > item.budgeted ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {((item.actual - item.budgeted) / item.budgeted * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default FinancialManagement;