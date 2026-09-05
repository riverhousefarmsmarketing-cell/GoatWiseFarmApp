'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Select,
  Badge,
  LoadingSpinner,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { milkAmountToLbs } from '@/hooks/useMilk';
import { isFemale, isIntactMale } from '@/lib/animalVocab';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Users,
  Heart,
  Baby,
  Milk,
  DollarSign,
  Printer,
  CheckCircle,
  Calendar,
  ClipboardList,
} from 'lucide-react';

type ExportFormat = 'csv' | 'pdf';
type ExportType = 'animals' | 'health' | 'breeding' | 'milk' | 'financial' | 'herd_summary';

export default function ExportPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [selectedExport, setSelectedExport] = useState<ExportType | null>(null);
  const [dateRange, setDateRange] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Fetch all data
  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_reference', false) // export the owned herd, not outside animals
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: healthRecords } = useQuery({
    queryKey: ['health_records_export'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_records')
        .select(`*, animal:animals(name)`)
        .eq('user_id', user!.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: breedingRecords } = useQuery({
    queryKey: ['breeding_records_export'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breeding_records')
        .select(`
          *,
          doe:animals!breeding_records_doe_id_fkey(name),
          buck:animals!breeding_records_buck_id_fkey(name)
        `)
        .eq('user_id', user!.id)
        .order('breeding_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: milkRecords } = useQuery({
    queryKey: ['milk_records_export'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_records')
        .select(`*, animal:animals(name)`)
        .eq('user_id', user!.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions_export'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`*, animal:animals(name)`)
        .eq('user_id', user!.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Filter by date range
  const filterByDateRange = (records: any[], dateField: string = 'date') => {
    if (dateRange === 'all') return records;
    
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case '7d': startDate.setDate(now.getDate() - 7); break;
      case '30d': startDate.setDate(now.getDate() - 30); break;
      case '90d': startDate.setDate(now.getDate() - 90); break;
      case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
    }
    
    return records.filter((r: any) => new Date(r[dateField]) >= startDate);
  };

  // CSV Export functions
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const csvRows = [headers.join(',')];
    
    data.forEach((row: any) => {
      const values = headers.map(header => {
        const key = header.toLowerCase().replace(/ /g, '_');
        let value = row[key] ?? '';
        
        // Handle nested objects
        if (key === 'animal_name' && row.animal) value = row.animal.name || '';
        if (key === 'doe_name' && row.doe) value = row.doe.name || '';
        if (key === 'buck_name' && row.buck) value = row.buck.name || '';
        
        // Escape for CSV
        if (typeof value === 'string') {
          // Prevent CSV formula injection in spreadsheet apps
          if (/^[=+\-@]/.test(value)) {
            value = `'${value}`;
          }
          // Quote (and double up internal quotes) when the value contains
          // a comma, double-quote, or newline/carriage return
          if (/[",\n\r]/.test(value)) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  };

  // Download helper
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print helper for PDF-style output
  const printReport = (title: string, content: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print reports');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: 600; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .date { color: #6b7280; }
          .summary { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-item { display: inline-block; margin-right: 30px; }
          .summary-value { font-size: 24px; font-weight: bold; color: #10b981; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐐 GoatWise - ${title}</h1>
          <span class="date">Generated: ${new Date().toLocaleDateString()}</span>
        </div>
        ${content}
        <div class="footer">
          <p>Generated by GoatWise Farm Management Software</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Export handlers
  const handleExportAnimals = (format: ExportFormat) => {
    setIsExporting(true);
    const animalsList = (animals as any[]) || [];

    if (format === 'csv') {
      const headers = ['Name', 'Breed', 'Sex', 'Category', 'Status', 'Birth_Date', 'Tag_Number', 'Registration_Number', 'Color_Markings', 'Notes'];
      const data = animalsList.map((a: any) => ({
        name: a.name,
        breed: a.breed || '',
        sex: a.sex,
        category: a.category,
        status: a.status,
        birth_date: a.date_of_birth || '',
        tag_number: a.tag_number || '',
        registration_number: a.registration_number || '',
        color_markings: a.color_markings || '',
        notes: a.notes || '',
      }));
      exportToCSV(data, 'goatwise_animals', headers);
    } else {
      const activeAnimals = animalsList.filter((a: any) => a.status === 'active');
      const does = activeAnimals.filter((a: any) => isFemale(a)).length;
      const bucks = activeAnimals.filter((a: any) => isIntactMale(a)).length;

      let tableRows = animalsList.map((a: any) => `
        <tr>
          <td>${a.name}</td>
          <td>${a.breed || '-'}</td>
          <td>${a.sex}</td>
          <td>${a.category.replace('_', ' ')}</td>
          <td>${a.status}</td>
          <td>${a.date_of_birth ? formatDate(a.date_of_birth) : '-'}</td>
          <td>${a.tag_number || '-'}</td>
        </tr>
      `).join('');

      const content = `
        <div class="summary">
          <div class="summary-item"><span class="summary-value">${activeAnimals.length}</span><br>Active Animals</div>
          <div class="summary-item"><span class="summary-value">${does}</span><br>Does</div>
          <div class="summary-item"><span class="summary-value">${bucks}</span><br>Bucks</div>
        </div>
        <table>
          <thead>
            <tr><th>Name</th><th>Breed</th><th>Sex</th><th>Category</th><th>Status</th><th>Birth Date</th><th>Tag #</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      `;
      printReport('Animal Registry', content);
    }

    setIsExporting(false);
    setExportSuccess('Animals exported successfully!');
    setTimeout(() => setExportSuccess(null), 3000);
  };

  const handleExportHealth = (format: ExportFormat) => {
    setIsExporting(true);
    const records = filterByDateRange((healthRecords as any[]) || [], 'date');

    if (format === 'csv') {
      const headers = ['Date', 'Animal_Name', 'Type', 'Treatment', 'Medication', 'Dosage', 'Dosage_Unit', 'Cost', 'Notes'];
      const data = records.map((r: any) => ({
        date: r.date,
        animal_name: r.animal?.name || '',
        type: r.type,
        treatment: r.treatment || '',
        medication: r.medication || '',
        dosage: r.dosage || '',
        dosage_unit: r.dosage_unit || '',
        cost: r.cost || '',
        notes: r.notes || '',
      }));
      exportToCSV(data, 'goatwise_health_records', headers);
    } else {
      const totalCost = records.reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
      
      let tableRows = records.slice(0, 50).map((r: any) => `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td>${r.animal?.name || '-'}</td>
          <td>${r.type}</td>
          <td>${r.treatment || '-'}</td>
          <td>${r.medication || '-'}</td>
          <td>${r.cost ? '$' + r.cost.toFixed(2) : '-'}</td>
        </tr>
      `).join('');

      const content = `
        <div class="summary">
          <div class="summary-item"><span class="summary-value">${records.length}</span><br>Total Records</div>
          <div class="summary-item"><span class="summary-value">$${totalCost.toFixed(2)}</span><br>Total Cost</div>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Animal</th><th>Type</th><th>Treatment</th><th>Medication</th><th>Cost</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        ${records.length > 50 ? '<p><em>Showing first 50 records. Export to CSV for complete data.</em></p>' : ''}
      `;
      printReport('Health Records', content);
    }

    setIsExporting(false);
    setExportSuccess('Health records exported successfully!');
    setTimeout(() => setExportSuccess(null), 3000);
  };

  const handleExportBreeding = (format: ExportFormat) => {
    setIsExporting(true);
    const records = filterByDateRange((breedingRecords as any[]) || [], 'breeding_date');

    if (format === 'csv') {
      const headers = ['Breeding_Date', 'Doe_Name', 'Buck_Name', 'Status', 'Due_Date', 'Kidding_Date', 'Number_of_Kids', 'Notes'];
      const data = records.map((r: any) => ({
        breeding_date: r.breeding_date,
        doe_name: r.doe?.name || '',
        buck_name: r.buck?.name || '',
        status: r.status,
        due_date: r.due_date || '',
        kidding_date: r.kidding_date || '',
        number_of_kids: r.number_of_kids || '',
        notes: r.notes || '',
      }));
      exportToCSV(data, 'goatwise_breeding_records', headers);
    } else {
      const kidded = records.filter((r: any) => r.status === 'kidded').length;
      const totalKids = records.reduce((sum: number, r: any) => sum + (r.number_of_kids || 0), 0);
      
      let tableRows = records.slice(0, 50).map((r: any) => `
        <tr>
          <td>${formatDate(r.breeding_date)}</td>
          <td>${r.doe?.name || '-'}</td>
          <td>${r.buck?.name || '-'}</td>
          <td>${r.status.replace('_', ' ')}</td>
          <td>${r.due_date ? formatDate(r.due_date) : '-'}</td>
          <td>${r.number_of_kids || '-'}</td>
        </tr>
      `).join('');

      const content = `
        <div class="summary">
          <div class="summary-item"><span class="summary-value">${records.length}</span><br>Total Breedings</div>
          <div class="summary-item"><span class="summary-value">${kidded}</span><br>Kidded</div>
          <div class="summary-item"><span class="summary-value">${totalKids}</span><br>Kids Born</div>
        </div>
        <table>
          <thead>
            <tr><th>Breeding Date</th><th>Doe</th><th>Buck</th><th>Status</th><th>Due Date</th><th>Kids</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      `;
      printReport('Breeding Records', content);
    }

    setIsExporting(false);
    setExportSuccess('Breeding records exported successfully!');
    setTimeout(() => setExportSuccess(null), 3000);
  };

  const handleExportMilk = (format: ExportFormat) => {
    setIsExporting(true);
    const records = filterByDateRange((milkRecords as any[]) || [], 'date');

    if (format === 'csv') {
      const headers = ['Date', 'Animal_Name', 'Session', 'Amount', 'Amount_Unit', 'Fat_Percent', 'Protein_Percent', 'Notes'];
      const data = records.map((r: any) => ({
        date: r.date,
        animal_name: r.animal?.name || '',
        session: r.session,
        amount: r.amount,
        amount_unit: r.amount_unit || 'lbs',
        fat_percent: r.fat_percent || '',
        protein_percent: r.protein_percent || '',
        notes: r.notes || '',
      }));
      exportToCSV(data, 'goatwise_milk_records', headers);
    } else {
      // Normalize to lbs -- the report labels everything "lbs", but records may be
      // stored in kg/oz/ml/liters/gallons/quarts.
      const totalMilk = records.reduce((sum: number, r: any) => sum + milkAmountToLbs(r.amount, r.amount_unit), 0);
      const uniqueDates = new Set(records.map((r: any) => r.date)).size;
      const avgDaily = uniqueDates > 0 ? totalMilk / uniqueDates : 0;

      // Group by date for report (normalized to lbs)
      const byDate: Record<string, number> = {};
      records.forEach((r: any) => {
        if (!byDate[r.date]) byDate[r.date] = 0;
        byDate[r.date] += milkAmountToLbs(r.amount, r.amount_unit);
      });

      let tableRows = Object.entries(byDate)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 30)
        .map(([date, total]) => `
          <tr>
            <td>${formatDate(date)}</td>
            <td>${(total as number).toFixed(2)} lbs</td>
          </tr>
        `).join('');

      const content = `
        <div class="summary">
          <div class="summary-item"><span class="summary-value">${totalMilk.toFixed(1)}</span><br>Total lbs</div>
          <div class="summary-item"><span class="summary-value">${avgDaily.toFixed(1)}</span><br>Daily Avg</div>
          <div class="summary-item"><span class="summary-value">${uniqueDates}</span><br>Days Recorded</div>
        </div>
        <h2>Daily Totals</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Total Production</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      `;
      printReport('Milk Production Report', content);
    }

    setIsExporting(false);
    setExportSuccess('Milk records exported successfully!');
    setTimeout(() => setExportSuccess(null), 3000);
  };

  const handleExportFinancial = (format: ExportFormat) => {
    setIsExporting(true);
    const records = filterByDateRange((transactions as any[]) || [], 'date');

    if (format === 'csv') {
      const headers = ['Date', 'Type', 'Category', 'Amount', 'Description', 'Animal_Name', 'Tax_Deductible', 'Notes'];
      const data = records.map((r: any) => ({
        date: r.date,
        type: r.type,
        category: r.category,
        amount: r.amount,
        description: r.description || '',
        animal_name: r.animal?.name || '',
        tax_deductible: r.tax_deductible ? 'Yes' : 'No',
        notes: r.notes || '',
      }));
      exportToCSV(data, 'goatwise_financial_records', headers);
    } else {
      const income = records.filter((r: any) => r.type === 'income').reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      const expenses = records.filter((r: any) => r.type === 'expense').reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      const profit = income - expenses;
      
      let tableRows = records.slice(0, 50).map((r: any) => `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td>${r.type}</td>
          <td>${r.category.replace('_', ' ')}</td>
          <td style="color: ${r.type === 'income' ? '#10b981' : '#ef4444'}">
            ${r.type === 'income' ? '+' : '-'}$${r.amount.toFixed(2)}
          </td>
          <td>${r.description || '-'}</td>
        </tr>
      `).join('');

      const content = `
        <div class="summary">
          <div class="summary-item"><span class="summary-value" style="color: #10b981">$${income.toFixed(2)}</span><br>Income</div>
          <div class="summary-item"><span class="summary-value" style="color: #ef4444">$${expenses.toFixed(2)}</span><br>Expenses</div>
          <div class="summary-item"><span class="summary-value" style="color: ${profit >= 0 ? '#10b981' : '#ef4444'}">$${Math.abs(profit).toFixed(2)}</span><br>${profit >= 0 ? 'Profit' : 'Loss'}</div>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Description</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      `;
      printReport('Financial Report', content);
    }

    setIsExporting(false);
    setExportSuccess('Financial records exported successfully!');
    setTimeout(() => setExportSuccess(null), 3000);
  };

  const handleExportHerdSummary = (format: ExportFormat) => {
    setIsExporting(true);
    const animalsList = (animals as any[]) || [];
    const breedingList = (breedingRecords as any[]) || [];
    const milkList = (milkRecords as any[]) || [];
    const transactionsList = (transactions as any[]) || [];

    const activeAnimals = animalsList.filter((a: any) => a.status === 'active');
    const does = activeAnimals.filter((a: any) => isFemale(a));
    const bucks = activeAnimals.filter((a: any) => isIntactMale(a));
    
    // Categories
    const byCategory: Record<string, number> = {};
    activeAnimals.forEach((a: any) => {
      const cat = a.category.replace('_', ' ');
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    // Breeds
    const byBreed: Record<string, number> = {};
    activeAnimals.forEach((a: any) => {
      const breed = a.breed || 'Unknown';
      byBreed[breed] = (byBreed[breed] || 0) + 1;
    });

    // Breeding stats
    const pregnant = breedingList.filter((b: any) => b.status === 'confirmed_pregnant' || b.status === 'bred').length;
    const kidded = breedingList.filter((b: any) => b.status === 'kidded').length;
    const totalKids = breedingList.reduce((sum: number, b: any) => sum + (b.number_of_kids || 0), 0);

    // Milk stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMilk = milkList.filter((m: any) => new Date(m.date) >= thirtyDaysAgo);
    // Normalized to lbs; the summary card is labeled "lbs".
    const totalMilk = recentMilk.reduce((sum: number, m: any) => sum + milkAmountToLbs(m.amount, m.amount_unit), 0);

    // Financial stats (last 30 days)
    const recentTrans = transactionsList.filter((t: any) => new Date(t.date) >= thirtyDaysAgo);
    const income = recentTrans.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const expenses = recentTrans.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const categoryRows = Object.entries(byCategory).map(([cat, count]) => `<tr><td>${cat}</td><td>${count}</td></tr>`).join('');
    const breedRows = Object.entries(byBreed).map(([breed, count]) => `<tr><td>${breed}</td><td>${count}</td></tr>`).join('');

    const content = `
      <h2>Herd Overview</h2>
      <div class="summary">
        <div class="summary-item"><span class="summary-value">${activeAnimals.length}</span><br>Active Animals</div>
        <div class="summary-item"><span class="summary-value">${does.length}</span><br>Does</div>
        <div class="summary-item"><span class="summary-value">${bucks.length}</span><br>Bucks</div>
        <div class="summary-item"><span class="summary-value">${pregnant}</span><br>Pregnant</div>
      </div>

      <h2>By Category</h2>
      <table>
        <thead><tr><th>Category</th><th>Count</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>

      <h2>By Breed</h2>
      <table>
        <thead><tr><th>Breed</th><th>Count</th></tr></thead>
        <tbody>${breedRows}</tbody>
      </table>

      <h2>Breeding Summary</h2>
      <div class="summary">
        <div class="summary-item"><span class="summary-value">${breedingList.length}</span><br>Total Breedings</div>
        <div class="summary-item"><span class="summary-value">${kidded}</span><br>Kidded</div>
        <div class="summary-item"><span class="summary-value">${totalKids}</span><br>Kids Born</div>
      </div>

      <h2>Last 30 Days</h2>
      <div class="summary">
        <div class="summary-item"><span class="summary-value">${totalMilk.toFixed(1)} lbs</span><br>Milk Produced</div>
        <div class="summary-item"><span class="summary-value" style="color: #10b981">$${income.toFixed(0)}</span><br>Income</div>
        <div class="summary-item"><span class="summary-value" style="color: #ef4444">$${expenses.toFixed(0)}</span><br>Expenses</div>
      </div>
    `;
    
    printReport('Herd Summary Report', content);
    setIsExporting(false);
    setExportSuccess('Herd summary exported successfully!');
    setTimeout(() => setExportSuccess(null), 3000);
  };

  const exportOptions = [
    {
      id: 'animals',
      title: 'Animal Registry',
      description: 'Export all animals with details',
      icon: Users,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
      count: (animals as any[])?.length || 0,
      formats: ['csv', 'pdf'],
      handler: handleExportAnimals,
    },
    {
      id: 'health',
      title: 'Health Records',
      description: 'Treatments, medications, and costs',
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      count: (healthRecords as any[])?.length || 0,
      formats: ['csv', 'pdf'],
      handler: handleExportHealth,
    },
    {
      id: 'breeding',
      title: 'Breeding Records',
      description: 'Breedings, due dates, and kidding history',
      icon: Baby,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      count: (breedingRecords as any[])?.length || 0,
      formats: ['csv', 'pdf'],
      handler: handleExportBreeding,
    },
    {
      id: 'milk',
      title: 'Milk Production',
      description: 'Daily milking records and totals',
      icon: Milk,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      count: (milkRecords as any[])?.length || 0,
      formats: ['csv', 'pdf'],
      handler: handleExportMilk,
    },
    {
      id: 'financial',
      title: 'Financial Records',
      description: 'Income, expenses, and profit/loss',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      count: (transactions as any[])?.length || 0,
      formats: ['csv', 'pdf'],
      handler: handleExportFinancial,
    },
    {
      id: 'herd_summary',
      title: 'Herd Summary Report',
      description: 'Complete farm overview for printing',
      icon: ClipboardList,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      count: null,
      formats: ['pdf'],
      handler: handleExportHerdSummary,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export Data</h1>
          <p className="text-gray-500">Download your farm records as CSV or printable reports</p>
        </div>
        <Select
          options={[
            { value: 'all', label: 'All Time' },
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' },
            { value: '1y', label: 'Last Year' },
          ]}
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Success Message */}
      {exportSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800">{exportSuccess}</span>
        </div>
      )}

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportOptions.map((option) => (
          <Card key={option.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${option.bgColor} flex items-center justify-center`}>
                <option.icon className={`h-6 w-6 ${option.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{option.title}</h3>
                <p className="text-sm text-gray-500 mb-3">{option.description}</p>
                {option.count !== null && (
                  <p className="text-xs text-gray-400 mb-3">{option.count} records</p>
                )}
                <div className="flex gap-2">
                  {option.formats.includes('csv') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => option.handler('csv')}
                      disabled={isExporting}
                      leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                    >
                      CSV
                    </Button>
                  )}
                  {option.formats.includes('pdf') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => option.handler('pdf')}
                      disabled={isExporting}
                      leftIcon={<Printer className="h-4 w-4" />}
                    >
                      Print
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Help Section */}
      <Card className="p-5 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Export Tips</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>CSV</strong> files can be opened in Excel, Google Sheets, or any spreadsheet app</li>
          <li>• <strong>Print</strong> opens a formatted report you can print or save as PDF</li>
          <li>• Use the date range filter to export specific time periods</li>
          <li>• Herd Summary provides a complete overview ideal for record keeping</li>
        </ul>
      </Card>
    </div>
  );
}
