'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Select,
  Badge,
  LoadingSpinner,
} from '@/components/ui';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  ArrowRight,
  Users,
  Heart,
  Baby,
  Milk,
  DollarSign,
  HelpCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';

type ImportType = 'animals' | 'health' | 'breeding' | 'milk' | 'financial';

interface ColumnMapping {
  csvColumn: string;
  dbField: string;
}

interface ImportPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const IMPORT_CONFIGS: Record<ImportType, {
  title: string;
  icon: any;
  color: string;
  bgColor: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldLabels: Record<string, string>;
  fieldTypes: Record<string, 'text' | 'number' | 'date' | 'select'>;
  selectOptions?: Record<string, string[]>;
}> = {
  animals: {
    title: 'Animals',
    icon: Users,
    color: 'text-primary-600',
    bgColor: 'bg-primary-100',
    requiredFields: ['name', 'sex', 'category', 'status'],
    optionalFields: ['breed', 'date_of_birth', 'tag_number', 'registration_number', 'color_markings', 'notes', 'purchase_date', 'purchase_cost'],
    fieldLabels: {
      name: 'Name',
      sex: 'Sex',
      category: 'Category',
      status: 'Status',
      breed: 'Breed',
      date_of_birth: 'Birth Date',
      tag_number: 'Tag Number',
      registration_number: 'Registration Number',
      color_markings: 'Color/Markings',
      notes: 'Notes',
      purchase_date: 'Purchase Date',
      purchase_cost: 'Purchase Price',
    },
    fieldTypes: {
      name: 'text',
      sex: 'select',
      category: 'select',
      status: 'select',
      breed: 'text',
      date_of_birth: 'date',
      tag_number: 'text',
      registration_number: 'text',
      color_markings: 'text',
      notes: 'text',
      purchase_date: 'date',
      purchase_cost: 'number',
    },
    selectOptions: {
      sex: ['doe', 'buck', 'wether'],
      category: ['milking_doe', 'dry_doe', 'bred_doe', 'doeling', 'buckling', 'buck', 'wether', 'kid'],
      status: ['active', 'sold', 'deceased', 'culled'],
    },
  },
  health: {
    title: 'Health Records',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    requiredFields: ['date', 'animal_name', 'type'],
    optionalFields: ['treatment', 'medication', 'dosage', 'dosage_unit', 'cost', 'administered_by', 'notes', 'follow_up_date'],
    fieldLabels: {
      date: 'Date',
      animal_name: 'Animal Name',
      type: 'Type',
      treatment: 'Treatment',
      medication: 'Medication',
      dosage: 'Dosage',
      dosage_unit: 'Dosage Unit',
      cost: 'Cost',
      administered_by: 'Administered By',
      notes: 'Notes',
      follow_up_date: 'Follow-up Date',
    },
    fieldTypes: {
      date: 'date',
      animal_name: 'text',
      type: 'select',
      treatment: 'text',
      medication: 'text',
      dosage: 'number',
      dosage_unit: 'text',
      cost: 'number',
      administered_by: 'text',
      notes: 'text',
      follow_up_date: 'date',
    },
    selectOptions: {
      type: ['vaccination', 'deworming', 'hoof_trim', 'illness', 'injury', 'medication', 'checkup', 'other'],
    },
  },
  breeding: {
    title: 'Breeding Records',
    icon: Baby,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    requiredFields: ['breeding_date', 'doe_name', 'buck_name'],
    optionalFields: ['status', 'due_date', 'kidding_date', 'number_of_kids', 'notes'],
    fieldLabels: {
      breeding_date: 'Breeding Date',
      doe_name: 'Doe Name',
      buck_name: 'Buck Name',
      status: 'Status',
      due_date: 'Due Date',
      kidding_date: 'Kidding Date',
      number_of_kids: 'Number of Kids',
      notes: 'Notes',
    },
    fieldTypes: {
      breeding_date: 'date',
      doe_name: 'text',
      buck_name: 'text',
      status: 'select',
      due_date: 'date',
      kidding_date: 'date',
      number_of_kids: 'number',
      notes: 'text',
    },
    selectOptions: {
      status: ['bred', 'confirmed_pregnant', 'open', 'kidded', 'aborted'],
    },
  },
  milk: {
    title: 'Milk Records',
    icon: Milk,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    requiredFields: ['date', 'animal_name', 'amount'],
    optionalFields: ['session', 'amount_unit', 'fat_percent', 'protein_percent', 'somatic_cell_count', 'notes'],
    fieldLabels: {
      date: 'Date',
      animal_name: 'Animal Name',
      amount: 'Amount',
      session: 'Session (AM/PM)',
      amount_unit: 'Unit',
      fat_percent: 'Fat %',
      protein_percent: 'Protein %',
      somatic_cell_count: 'SCC',
      notes: 'Notes',
    },
    fieldTypes: {
      date: 'date',
      animal_name: 'text',
      amount: 'number',
      session: 'select',
      amount_unit: 'text',
      fat_percent: 'number',
      protein_percent: 'number',
      somatic_cell_count: 'number',
      notes: 'text',
    },
    selectOptions: {
      session: ['AM', 'PM'],
    },
  },
  financial: {
    title: 'Financial Records',
    icon: DollarSign,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    // 'vendor' was offered here but transactions has no such column -- it has
    // vendor_id, a uuid, and there is no vendors table to resolve a name
    // against. Any row mapped to it failed the whole import. Dropped rather
    // than silently discarded; vendor names can go in description.
    requiredFields: ['date', 'type', 'category', 'amount'],
    optionalFields: ['description', 'animal_name', 'tax_deductible', 'notes'],
    fieldLabels: {
      date: 'Date',
      type: 'Type',
      category: 'Category',
      amount: 'Amount',
      description: 'Description',
      animal_name: 'Animal Name',
      tax_deductible: 'Tax Deductible',
      notes: 'Notes',
    },
    fieldTypes: {
      date: 'date',
      type: 'select',
      category: 'select',
      amount: 'number',
      description: 'text',
      animal_name: 'text',
      tax_deductible: 'select',
      notes: 'text',
    },
    selectOptions: {
      type: ['income', 'expense'],
      category: ['milk_sales', 'animal_sales', 'breeding_fees', 'feed', 'veterinary', 'supplies', 'equipment', 'other'],
      tax_deductible: ['true', 'false'],
    },
  },
};

export default function ImportPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'select' | 'upload' | 'map' | 'preview' | 'result'>('select');
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [csvData, setCsvData] = useState<ImportPreview | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Parse CSV file
  const parseCSV = (text: string): ImportPreview => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) throw new Error('Empty file');

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1, 101).map(line => parseCSVLine(line)); // Preview first 100 rows

    return {
      headers,
      rows,
      totalRows: lines.length - 1,
    };
  };

  // Parse a single CSV line (handles quoted values)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  };

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setCsvData(parsed);
        
        // Auto-map columns with matching names
        const config = IMPORT_CONFIGS[importType!];
        const allFields = [...config.requiredFields, ...config.optionalFields];
        const autoMappings: Record<string, string> = {};
        
        parsed.headers.forEach(header => {
          const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const match = allFields.find(field => 
            field === normalized || 
            config.fieldLabels[field]?.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalized
          );
          if (match) {
            autoMappings[header] = match;
          }
        });
        
        setColumnMappings(autoMappings);
        setStep('map');
      } catch (error) {
        alert('Error parsing CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  }, [importType]);

  // Validate mappings
  const validateMappings = (): string[] => {
    const errors: string[] = [];
    const config = IMPORT_CONFIGS[importType!];
    
    config.requiredFields.forEach(field => {
      const mapped = Object.values(columnMappings).includes(field);
      if (!mapped) {
        errors.push(`Required field "${config.fieldLabels[field]}" is not mapped`);
      }
    });
    
    return errors;
  };

  // Process import
  const processImport = async () => {
    if (!csvData || !importType || !user) return;

    setIsImporting(true);
    const config = IMPORT_CONFIGS[importType];
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    // Get animal name to ID mapping if needed
    let animalMap: Record<string, string> = {};
    if (['health', 'breeding', 'milk', 'financial'].includes(importType)) {
      const { data: animals } = await supabase
        .from('animals')
        .select('id, name')
        .eq('user_id', user.id);
      
      if (animals) {
        animals.forEach((a: any) => {
          animalMap[a.name.toLowerCase()] = a.id;
        });
      }
    }

    // Process each row
    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i];
      const record: Record<string, any> = { user_id: user.id };
      let hasError = false;

      // Map columns to fields
      csvData.headers.forEach((header, idx) => {
        const field = columnMappings[header];
        if (field && row[idx]) {
          let value: any = row[idx];

          // Type conversion
          if (config.fieldTypes[field] === 'number') {
            value = parseFloat(value) || 0;
          } else if (config.fieldTypes[field] === 'date') {
            // Try to parse date
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              value = date.toISOString().split('T')[0];
            } else {
              value = null;
            }
          } else if (field === 'tax_deductible') {
            value = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
          }

          // Handle animal name lookups
          if (field === 'animal_name') {
            const animalId = animalMap[value.toLowerCase()];
            if (animalId) {
              record['animal_id'] = animalId;
            } else {
              result.errors.push(`Row ${i + 2}: Animal "${value}" not found`);
              hasError = true;
            }
          } else if (field === 'doe_name') {
            const animalId = animalMap[value.toLowerCase()];
            if (animalId) {
              record['doe_id'] = animalId;
            } else {
              result.errors.push(`Row ${i + 2}: Doe "${value}" not found`);
              hasError = true;
            }
          } else if (field === 'buck_name') {
            const animalId = animalMap[value.toLowerCase()];
            if (animalId) {
              record['buck_id'] = animalId;
            } else {
              result.errors.push(`Row ${i + 2}: Buck "${value}" not found`);
              hasError = true;
            }
          } else {
            record[field] = value;
          }
        }
      });

      if (hasError) {
        result.failed++;
        continue;
      }

      // Validate required fields
      const missingRequired = config.requiredFields.filter(field => {
        if (field === 'animal_name') return !record['animal_id'];
        if (field === 'doe_name') return !record['doe_id'];
        if (field === 'buck_name') return !record['buck_id'];
        return !record[field];
      });

      if (missingRequired.length > 0) {
        result.errors.push(`Row ${i + 2}: Missing required fields: ${missingRequired.join(', ')}`);
        result.failed++;
        continue;
      }

      // Insert record
      const tableName = importType === 'financial' ? 'transactions' : 
                        importType === 'health' ? 'health_records' :
                        importType === 'breeding' ? 'breeding_records' :
                        importType === 'milk' ? 'milk_records' : 'animals';

      const { error } = await (supabase as any).from(tableName).insert(record);

      if (error) {
        result.errors.push(`Row ${i + 2}: ${error.message}`);
        result.failed++;
      } else {
        result.success++;
      }
    }

    setImportResult(result);
    setStep('result');
    setIsImporting(false);

    // Invalidate queries to refresh data
    queryClient.invalidateQueries();
  };

  // Download template
  const downloadTemplate = (type: ImportType) => {
    const config = IMPORT_CONFIGS[type];
    const headers = [...config.requiredFields, ...config.optionalFields]
      .map(field => config.fieldLabels[field])
      .join(',');
    
    const blob = new Blob([headers + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `goatwise_${type}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reset import
  const resetImport = () => {
    setStep('select');
    setImportType(null);
    setCsvData(null);
    setColumnMappings({});
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
          <p className="text-gray-500">Import records from CSV files</p>
        </div>
        {step !== 'select' && (
          <Button variant="outline" onClick={resetImport} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Start Over
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 text-sm">
        {['Select Type', 'Upload File', 'Map Columns', 'Preview', 'Complete'].map((label, idx) => {
          const steps = ['select', 'upload', 'map', 'preview', 'result'];
          const currentIdx = steps.indexOf(step);
          const isActive = idx === currentIdx;
          const isComplete = idx < currentIdx;

          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isActive ? 'bg-primary-600 text-white' :
                isComplete ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {isComplete ? <CheckCircle className="h-5 w-5" /> : idx + 1}
              </div>
              <span className={`hidden sm:inline ${isActive ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                {label}
              </span>
              {idx < 4 && <ArrowRight className="h-4 w-4 text-gray-300" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Select Import Type */}
      {step === 'select' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">What would you like to import?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.entries(IMPORT_CONFIGS) as [ImportType, typeof IMPORT_CONFIGS[ImportType]][]).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => { setImportType(type); setStep('upload'); }}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                >
                  <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                    <config.icon className={`h-6 w-6 ${config.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{config.title}</p>
                    <p className="text-sm text-gray-500">{config.requiredFields.length} required fields</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Templates */}
          <Card className="p-6 bg-gray-50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              Download Templates
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Download a CSV template with the correct column headers for each import type.
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(IMPORT_CONFIGS) as ImportType[]).map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant="outline"
                  onClick={() => downloadTemplate(type)}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  {IMPORT_CONFIGS[type].title}
                </Button>
              ))}
            </div>
          </Card>

          {/* Tips */}
          <Card className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              Import Tips
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• CSV files must have headers in the first row</li>
              <li>• Dates should be in YYYY-MM-DD format (e.g., 2024-01-15)</li>
              <li>• Animal names must match existing animals exactly (for health, breeding, milk records)</li>
              <li>• Import animals first before importing other record types</li>
              <li>• Review the preview carefully before confirming the import</li>
            </ul>
          </Card>
        </div>
      )}

      {/* Step 2: Upload File */}
      {step === 'upload' && importType && (
        <Card className="p-6">
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto rounded-xl ${IMPORT_CONFIGS[importType].bgColor} flex items-center justify-center mb-4`}>
              {(() => {
                const Icon = IMPORT_CONFIGS[importType].icon;
                return <Icon className={`h-8 w-8 ${IMPORT_CONFIGS[importType].color}`} />;
              })()}
            </div>
            <h2 className="text-lg font-semibold mb-2">Upload {IMPORT_CONFIGS[importType].title} CSV</h2>
            <p className="text-gray-500 mb-6">Select a CSV file from your computer</p>

            <label className="block w-full max-w-md mx-auto">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="font-medium text-gray-700">Click to upload CSV</p>
                <p className="text-sm text-gray-500">or drag and drop</p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(importType)}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Download Template
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Map Columns */}
      {step === 'map' && csvData && importType && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Map CSV Columns to Fields</h2>
            <p className="text-gray-500 mb-6">
              Match your CSV columns to the correct database fields. Required fields are marked with *.
            </p>

            <div className="space-y-4">
              {csvData.headers.map(header => (
                <div key={header} className="flex items-center gap-4">
                  <div className="w-1/3">
                    <Badge variant="info" className="font-mono text-sm">
                      {header}
                    </Badge>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <div className="w-1/2">
                    <Select
                      options={[
                        { value: '', label: '-- Skip this column --' },
                        ...IMPORT_CONFIGS[importType].requiredFields.map(field => ({
                          value: field,
                          label: `${IMPORT_CONFIGS[importType].fieldLabels[field]} *`,
                        })),
                        ...IMPORT_CONFIGS[importType].optionalFields.map(field => ({
                          value: field,
                          label: IMPORT_CONFIGS[importType].fieldLabels[field],
                        })),
                      ]}
                      value={columnMappings[header] || ''}
                      onChange={(e) => setColumnMappings(prev => ({
                        ...prev,
                        [header]: e.target.value,
                      }))}
                    />
                  </div>
                </div>
              ))}
            </div>

            {validateMappings().length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-medium text-yellow-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Missing Required Mappings
                </p>
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  {validateMappings().map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={validateMappings().length > 0}
              >
                Preview Import
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 'preview' && csvData && importType && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Preview Import</h2>
              <Badge variant="info">{csvData.totalRows} rows</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">#</th>
                    {Object.entries(columnMappings)
                      .filter(([_, field]) => field)
                      .map(([header, field]) => (
                        <th key={header} className="text-left py-2 px-3 font-medium text-gray-600">
                          {IMPORT_CONFIGS[importType].fieldLabels[field]}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.rows.slice(0, 10).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b">
                      <td className="py-2 px-3 text-gray-400">{rowIdx + 1}</td>
                      {csvData.headers.map((header, colIdx) => {
                        const field = columnMappings[header];
                        if (!field) return null;
                        return (
                          <td key={header} className="py-2 px-3">
                            {row[colIdx] || <span className="text-gray-300">-</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {csvData.totalRows > 10 && (
              <p className="mt-3 text-sm text-gray-500">
                Showing first 10 of {csvData.totalRows} rows
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep('map')}>
                Back
              </Button>
              <Button
                onClick={processImport}
                disabled={isImporting}
                leftIcon={isImporting ? <LoadingSpinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              >
                {isImporting ? 'Importing...' : `Import ${csvData.totalRows} Records`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 5: Result */}
      {step === 'result' && importResult && (
        <Card className="p-6 text-center">
          {importResult.success > 0 ? (
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          )}
          
          <h2 className="text-xl font-semibold mb-2">Import Complete</h2>
          
          <div className="flex justify-center gap-8 my-6">
            <div>
              <p className="text-3xl font-bold text-green-600">{importResult.success}</p>
              <p className="text-sm text-gray-500">Successful</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">{importResult.failed}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left max-h-48 overflow-y-auto">
              <p className="font-medium text-red-800 mb-2">Errors:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {importResult.errors.slice(0, 20).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
                {importResult.errors.length > 20 && (
                  <li className="text-red-500">... and {importResult.errors.length - 20} more errors</li>
                )}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={resetImport}>
              Import More Data
            </Button>
            <Button onClick={() => window.location.href = `/dashboard/${importType === 'animals' ? 'herd' : importType}`}>
              View {IMPORT_CONFIGS[importType!].title}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
