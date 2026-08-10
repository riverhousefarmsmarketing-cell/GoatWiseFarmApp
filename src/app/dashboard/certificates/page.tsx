'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Select,
  Input,
  LoadingSpinner,
  ErrorState,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  FileText,
  Printer,
  Award,
  Heart,
  Users,
  Calendar,
  Scale,
  Milk,
  CheckCircle,
  Download,
} from 'lucide-react';

type CertificateType = 'sale' | 'health' | 'registration' | 'pedigree';

export default function CertificatesPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [selectedAnimal, setSelectedAnimal] = useState<string>('');
  const [certificateType, setCertificateType] = useState<CertificateType>('sale');
  const [farmName, setFarmName] = useState('River House Farms');
  const [farmAddress, setFarmAddress] = useState('Chehalis, Washington');
  const [farmPhone, setFarmPhone] = useState('');
  const [farmEmail, setFarmEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [salePrice, setSalePrice] = useState('');
  


  // Fetch animals
  const { data: animals, isLoading: animalsLoading, isError: animalsError, refetch: refetchAnimals } = useQuery({
    queryKey: ['animals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('user_id', user!.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch health records for selected animal
  const { data: healthRecords } = useQuery({
    queryKey: ['health_records', selectedAnimal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('animal_id', selectedAnimal)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAnimal,
  });

  // Fetch weight records for selected animal
  const { data: weightRecords } = useQuery({
    queryKey: ['weight_records', selectedAnimal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_records')
        .select('*')
        .eq('animal_id', selectedAnimal)
        .order('date', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAnimal,
  });

  // Fetch milk records for selected animal (last 30 days average)
  const { data: milkRecords } = useQuery({
    queryKey: ['milk_records', selectedAnimal],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from('milk_records')
        .select('*')
        .eq('animal_id', selectedAnimal)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAnimal,
  });

  // Fetch parent animals for pedigree
  const { data: allAnimals } = useQuery({
    queryKey: ['all_animals_pedigree'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get selected animal data
  const animal = useMemo(() => {
    return (animals as any[])?.find((a: any) => a.id === selectedAnimal);
  }, [animals, selectedAnimal]);

  // Get parent data
  const parentData = useMemo(() => {
    if (!animal || !allAnimals) return { dam: null, sire: null, damDam: null, damSire: null, sireDam: null, sireSire: null };
    
    const animalsList = allAnimals as any[];
    const dam = animalsList.find((a: any) => a.id === animal.dam_id);
    const sire = animalsList.find((a: any) => a.id === animal.sire_id);
    const damDam = dam ? animalsList.find((a: any) => a.id === dam.dam_id) : null;
    const damSire = dam ? animalsList.find((a: any) => a.id === dam.sire_id) : null;
    const sireDam = sire ? animalsList.find((a: any) => a.id === sire.dam_id) : null;
    const sireSire = sire ? animalsList.find((a: any) => a.id === sire.sire_id) : null;

    return { dam, sire, damDam, damSire, sireDam, sireSire };
  }, [animal, allAnimals]);

  // Calculate stats
  const stats = useMemo(() => {
    const currentWeight = (weightRecords as any[])?.[0]?.weight || null;
    const milkList = (milkRecords as any[]) || [];
    const totalMilk = milkList.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    const milkDays = new Set(milkList.map((r: any) => r.date)).size;
    const avgDailyMilk = milkDays > 0 ? totalMilk / milkDays : null;

    const recentVaccinations = ((healthRecords as any[]) || [])
      .filter((r: any) => r.type === 'vaccination')
      .slice(0, 5);

    const recentDeworming = ((healthRecords as any[]) || [])
      .filter((r: any) => r.type === 'deworming')
      .slice(0, 3);

    return {
      currentWeight,
      avgDailyMilk,
      recentVaccinations,
      recentDeworming,
    };
  }, [weightRecords, milkRecords, healthRecords]);

  // Calculate age
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return 'Unknown';
    const birth = parseISO(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years} years, ${remainingMonths} months` : `${years} years`;
  };

  // Print certificate
  const printCertificate = () => {
    if (!animal) return;

    let content = '';
    
    if (certificateType === 'sale') {
      content = generateSaleCertificate();
    } else if (certificateType === 'health') {
      content = generateHealthCertificate();
    } else if (certificateType === 'registration') {
      content = generateRegistrationCertificate();
    } else if (certificateType === 'pedigree') {
      content = generatePedigreeCertificate();
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print certificates');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${certificateType.charAt(0).toUpperCase() + certificateType.slice(1)} Certificate - ${animal.name}</title>
        <style>
          @page { margin: 0.5in; }
          body { 
            font-family: 'Georgia', serif; 
            max-width: 8.5in; 
            margin: 0 auto; 
            padding: 0.5in;
            color: #1a1a1a;
          }
          .certificate {
            border: 3px double #2d5016;
            padding: 30px;
            background: linear-gradient(135deg, #fafdf7 0%, #f0f7e6 100%);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #2d5016;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .header h1 {
            color: #2d5016;
            font-size: 28px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .header h2 {
            color: #4a7c23;
            font-size: 18px;
            margin: 0;
            font-weight: normal;
          }
          .farm-info {
            text-align: center;
            margin-bottom: 20px;
            font-size: 14px;
            color: #555;
          }
          .animal-name {
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            color: #2d5016;
            margin: 20px 0;
            padding: 15px;
            background: #fff;
            border: 1px solid #cde0b4;
            border-radius: 8px;
          }
          .section {
            margin: 20px 0;
            padding: 15px;
            background: #fff;
            border: 1px solid #cde0b4;
            border-radius: 8px;
          }
          .section h3 {
            color: #2d5016;
            font-size: 16px;
            margin: 0 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dotted #ddd;
          }
          .info-label {
            color: #666;
            font-size: 13px;
          }
          .info-value {
            font-weight: 600;
            font-size: 13px;
          }
          .pedigree-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .pedigree-table td {
            border: 1px solid #cde0b4;
            padding: 8px;
            vertical-align: top;
          }
          .pedigree-table .gen-label {
            background: #f5f9f0;
            font-weight: bold;
            text-align: center;
            width: 80px;
          }
          .pedigree-name {
            font-weight: bold;
            color: #2d5016;
          }
          .pedigree-details {
            font-size: 11px;
            color: #666;
          }
          .signature-section {
            margin-top: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .signature-line {
            border-top: 1px solid #333;
            padding-top: 5px;
            margin-top: 40px;
          }
          .signature-label {
            font-size: 12px;
            color: #666;
          }
          .health-records {
            font-size: 12px;
          }
          .health-records table {
            width: 100%;
            border-collapse: collapse;
          }
          .health-records th, .health-records td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: left;
          }
          .health-records th {
            background: #f5f9f0;
            font-weight: 600;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          .checkbox {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 1px solid #333;
            margin-right: 8px;
            vertical-align: middle;
          }
          .checkbox.checked::after {
            content: '✓';
            display: block;
            text-align: center;
            line-height: 12px;
            color: #2d5016;
            font-weight: bold;
          }
          @media print {
            body { padding: 0; }
            .certificate { border-width: 2px; }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateSaleCertificate = () => {
    return `
      <div class="certificate">
        <div class="header">
          <h1>Bill of Sale</h1>
          <h2>Certificate of Ownership Transfer</h2>
        </div>
        
        <div class="farm-info">
          <strong>${farmName}</strong><br>
          ${farmAddress}${farmPhone ? ` • ${farmPhone}` : ''}${farmEmail ? ` • ${farmEmail}` : ''}
        </div>

        <div class="animal-name">
          ${animal.name}
        </div>

        <div class="section">
          <h3>Animal Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Registration #:</span>
              <span class="info-value">${animal.registration_number || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tag #:</span>
              <span class="info-value">${animal.tag_number || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Breed:</span>
              <span class="info-value">${animal.breed || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sex:</span>
              <span class="info-value">${animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date of Birth:</span>
              <span class="info-value">${animal.date_of_birth ? formatDate(animal.date_of_birth) : 'Unknown'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Age:</span>
              <span class="info-value">${calculateAge(animal.date_of_birth)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Color/Markings:</span>
              <span class="info-value">${animal.color_markings || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Current Weight:</span>
              <span class="info-value">${stats.currentWeight ? `${stats.currentWeight} lbs` : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Lineage</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Dam:</span>
              <span class="info-value">${parentData.dam?.name || 'Unknown'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sire:</span>
              <span class="info-value">${parentData.sire?.name || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Sale Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Sale Date:</span>
              <span class="info-value">${formatDate(saleDate)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sale Price:</span>
              <span class="info-value">${salePrice ? `$${salePrice}` : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Buyer Information</h3>
          <div class="info-item" style="grid-column: span 2;">
            <span class="info-label">Name:</span>
            <span class="info-value">${buyerName || '________________________'}</span>
          </div>
          <div class="info-item" style="grid-column: span 2; margin-top: 10px;">
            <span class="info-label">Address:</span>
            <span class="info-value">${buyerAddress || '________________________'}</span>
          </div>
        </div>

        <div class="signature-section">
          <div>
            <div class="signature-line">
              <span class="signature-label">Seller Signature</span>
            </div>
          </div>
          <div>
            <div class="signature-line">
              <span class="signature-label">Buyer Signature</span>
            </div>
          </div>
        </div>

        <div class="footer">
          Generated by GoatSteward by RiverHouse Dairy • ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;
  };

  const generateHealthCertificate = () => {
    const vaccinations = stats.recentVaccinations.map((v: any) => `
      <tr>
        <td>${formatDate(v.date)}</td>
        <td>${v.medication || v.treatment || 'Vaccination'}</td>
        <td>${v.dosage ? `${v.dosage} ${v.dosage_unit || ''}` : 'N/A'}</td>
        <td>${v.administered_by || 'Owner'}</td>
      </tr>
    `).join('') || '<tr><td colspan="4">No vaccination records</td></tr>';

    const dewormings = stats.recentDeworming.map((d: any) => `
      <tr>
        <td>${formatDate(d.date)}</td>
        <td>${d.medication || d.treatment || 'Dewormer'}</td>
        <td>${d.dosage ? `${d.dosage} ${d.dosage_unit || ''}` : 'N/A'}</td>
      </tr>
    `).join('') || '<tr><td colspan="3">No deworming records</td></tr>';

    return `
      <div class="certificate">
        <div class="header">
          <h1>Health History Certificate</h1>
          <h2>Generated from GoatSteward Farm Records</h2>
        </div>
        
        <div class="farm-info">
          <strong>${farmName}</strong><br>
          ${farmAddress}${farmPhone ? ` • ${farmPhone}` : ''}
        </div>

        <div class="animal-name">
          ${animal.name}
        </div>

        <div class="section">
          <h3>Animal Identification</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Registration #:</span>
              <span class="info-value">${animal.registration_number || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tag #:</span>
              <span class="info-value">${animal.tag_number || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Breed:</span>
              <span class="info-value">${animal.breed || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sex:</span>
              <span class="info-value">${animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date of Birth:</span>
              <span class="info-value">${animal.date_of_birth ? formatDate(animal.date_of_birth) : 'Unknown'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Age:</span>
              <span class="info-value">${calculateAge(animal.date_of_birth)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Color/Markings:</span>
              <span class="info-value">${animal.color_markings || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Current Weight:</span>
              <span class="info-value">${stats.currentWeight ? `${stats.currentWeight} lbs` : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="section health-records">
          <h3>Vaccination History</h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Vaccine</th><th>Dosage</th><th>Administered By</th></tr>
            </thead>
            <tbody>
              ${vaccinations}
            </tbody>
          </table>
        </div>

        <div class="section health-records">
          <h3>Deworming History</h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Product</th><th>Dosage</th></tr>
            </thead>
            <tbody>
              ${dewormings}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>Health Record Summary</h3>
          <div style="margin: 15px 0;">
            <p><span class="checkbox checked"></span> Health records generated from GoatSteward farm management system</p>
            <p><span class="checkbox checked"></span> Records reflect owner-maintained health history as of the date below</p>
          </div>
          <div class="info-grid" style="margin-top: 15px;">
            <div class="info-item">
              <span class="info-label">Report Date:</span>
              <span class="info-value">${new Date().toLocaleDateString()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Recorded By:</span>
              <span class="info-value">Farm Owner / Operator</span>
            </div>
          </div>
          <p style="margin-top: 12px; font-size: 11px; color: #666;">
            This document reflects health records maintained by the farm owner in GoatSteward. 
            It is not a veterinary health certificate. For official interstate travel or sale 
            documentation, please consult a licensed veterinarian.
          </p>
        </div>

        <div class="signature-section">
          <div>
            <div class="signature-line">
              <span class="signature-label">Owner Signature</span>
            </div>
          </div>

        </div>

        <div class="footer">
          Generated by GoatSteward by RiverHouse Dairy • ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;
  };

  const generateRegistrationCertificate = () => {
    return `
      <div class="certificate">
        <div class="header">
          <h1>Registration Certificate</h1>
          <h2>Certificate of Animal Registration</h2>
        </div>
        
        <div class="farm-info">
          <strong>${farmName}</strong><br>
          ${farmAddress}
        </div>

        <div class="animal-name">
          ${animal.name}
        </div>

        <div class="section">
          <h3>Registration Details</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Registration #:</span>
              <span class="info-value">${animal.registration_number || 'Pending'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tag/Tattoo #:</span>
              <span class="info-value">${animal.tag_number || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Microchip #:</span>
              <span class="info-value">${animal.microchip_id || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Breed:</span>
              <span class="info-value">${animal.breed || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Animal Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Sex:</span>
              <span class="info-value">${animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date of Birth:</span>
              <span class="info-value">${animal.date_of_birth ? formatDate(animal.date_of_birth) : 'Unknown'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Color/Pattern:</span>
              <span class="info-value">${animal.color_markings || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Horn Status:</span>
              <span class="info-value">${animal.polled ? 'Polled' : animal.disbudded ? 'Disbudded' : 'Horned'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Parentage</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Dam:</span>
              <span class="info-value">${parentData.dam?.name || 'Unknown'}${parentData.dam?.registration_number ? ` (${parentData.dam.registration_number})` : ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sire:</span>
              <span class="info-value">${parentData.sire?.name || 'Unknown'}${parentData.sire?.registration_number ? ` (${parentData.sire.registration_number})` : ''}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Breeder/Owner Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Breeder:</span>
              <span class="info-value">${farmName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Current Owner:</span>
              <span class="info-value">${farmName}</span>
            </div>
          </div>
        </div>

        ${stats.avgDailyMilk ? `
        <div class="section">
          <h3>Production Records</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Avg Daily Milk (30d):</span>
              <span class="info-value">${stats.avgDailyMilk.toFixed(2)} lbs</span>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="signature-section">
          <div>
            <div class="signature-line">
              <span class="signature-label">Breeder/Owner Signature</span>
            </div>
          </div>
          <div>
            <div class="signature-line">
              <span class="signature-label">Date</span>
            </div>
          </div>
        </div>

        <div class="footer">
          Generated by GoatSteward by RiverHouse Dairy • ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;
  };

  const generatePedigreeCertificate = () => {
    const formatAnimalCell = (a: any) => {
      if (!a) return '<span style="color: #999;">Unknown</span>';
      return `
        <span class="pedigree-name">${a.name}</span><br>
        <span class="pedigree-details">
          ${a.registration_number ? `Reg: ${a.registration_number}<br>` : ''}
          ${a.breed || ''} ${a.color_markings ? `• ${a.color_markings}` : ''}
        </span>
      `;
    };

    return `
      <div class="certificate">
        <div class="header">
          <h1>Pedigree Certificate</h1>
          <h2>Three Generation Pedigree</h2>
        </div>
        
        <div class="farm-info">
          <strong>${farmName}</strong><br>
          ${farmAddress}
        </div>

        <div class="animal-name">
          ${animal.name}
          <div style="font-size: 14px; font-weight: normal; color: #666; margin-top: 5px;">
            ${animal.registration_number ? `Registration: ${animal.registration_number}` : ''}
            ${animal.breed ? ` • ${animal.breed}` : ''}
          </div>
        </div>

        <div class="section">
          <h3>Animal Details</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Date of Birth:</span>
              <span class="info-value">${animal.date_of_birth ? formatDate(animal.date_of_birth) : 'Unknown'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sex:</span>
              <span class="info-value">${animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Color/Markings:</span>
              <span class="info-value">${animal.color_markings || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Breeder:</span>
              <span class="info-value">${farmName}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Pedigree</h3>
          <table class="pedigree-table">
            <tr>
              <td class="gen-label" rowspan="4">Sire<br>Side</td>
              <td rowspan="2">${formatAnimalCell(parentData.sire)}</td>
              <td>${formatAnimalCell(parentData.sireSire)}</td>
            </tr>
            <tr>
              <td>${formatAnimalCell(parentData.sireDam)}</td>
            </tr>
            <tr>
              <td class="gen-label" rowspan="4">Dam<br>Side</td>
              <td rowspan="2">${formatAnimalCell(parentData.dam)}</td>
              <td>${formatAnimalCell(parentData.damSire)}</td>
            </tr>
            <tr>
              <td>${formatAnimalCell(parentData.damDam)}</td>
            </tr>
          </table>
        </div>

        <div class="signature-section">
          <div>
            <div class="signature-line">
              <span class="signature-label">Breeder/Owner Signature</span>
            </div>
          </div>
          <div>
            <div class="signature-line">
              <span class="signature-label">Date</span>
            </div>
          </div>
        </div>

        <div class="footer">
          Generated by GoatSteward by RiverHouse Dairy • ${new Date().toLocaleDateString()}<br>
          This pedigree is based on records maintained by ${farmName}
        </div>
      </div>
    `;
  };

  if (animalsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (animalsError) {
    return (
      <div className="space-y-6">
        <ErrorState onRetry={() => refetchAnimals()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Animal Certificates</h1>
        <p className="text-gray-500">Generate printable certificates for sales, health, and registration</p>
      </div>

      {/* Certificate Type Selection */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { type: 'sale', title: 'Bill of Sale', icon: FileText, description: 'Transfer of ownership' },
          { type: 'health', title: 'Health History', icon: Heart, description: 'Vaccination & deworming records from your farm' },
          { type: 'registration', title: 'Registration', icon: Award, description: 'Animal registration info' },
          { type: 'pedigree', title: 'Pedigree', icon: Users, description: '3-generation lineage' },
        ].map((cert) => (
          <button
            key={cert.type}
            onClick={() => setCertificateType(cert.type as CertificateType)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              certificateType === cert.type
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <cert.icon className={`h-6 w-6 mb-2 ${
              certificateType === cert.type ? 'text-primary-600' : 'text-gray-400'
            }`} />
            <p className="font-medium">{cert.title}</p>
            <p className="text-sm text-gray-500">{cert.description}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Animal Selection & Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Select Animal</h2>
          
          <Select
            label="Animal"
            options={[
              { value: '', label: 'Choose an animal...' },
              ...((animals as any[]) || []).map((a: any) => ({
                value: a.id,
                label: `${a.name} - ${a.breed || 'Unknown breed'} (${a.sex})`,
              })),
            ]}
            value={selectedAnimal}
            onChange={(e) => setSelectedAnimal(e.target.value)}
          />

          {animal && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Animal Preview</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Name:</span> <strong>{animal.name}</strong></div>
                  <div><span className="text-gray-500">Breed:</span> {animal.breed || 'N/A'}</div>
                  <div><span className="text-gray-500">Sex:</span> {animal.sex}</div>
                  <div><span className="text-gray-500">Age:</span> {calculateAge(animal.date_of_birth)}</div>
                  <div><span className="text-gray-500">Tag:</span> {animal.tag_number || 'N/A'}</div>
                  <div><span className="text-gray-500">Reg #:</span> {animal.registration_number || 'N/A'}</div>
                  {stats.currentWeight && (
                    <div><span className="text-gray-500">Weight:</span> {stats.currentWeight} lbs</div>
                  )}
                  {stats.avgDailyMilk && (
                    <div><span className="text-gray-500">Milk Avg:</span> {stats.avgDailyMilk.toFixed(2)} lbs/day</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Certificate Options */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Certificate Details</h2>
          
          <div className="space-y-4">
            <Input
              label="Farm Name"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
            />
            
            <Input
              label="Farm Address"
              value={farmAddress}
              onChange={(e) => setFarmAddress(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone (optional)"
                value={farmPhone}
                onChange={(e) => setFarmPhone(e.target.value)}
              />
              <Input
                label="Email (optional)"
                value={farmEmail}
                onChange={(e) => setFarmEmail(e.target.value)}
              />
            </div>

            {certificateType === 'sale' && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Sale Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Sale Date"
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                    />
                    <Input
                      label="Sale Price ($)"
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <Input
                    label="Buyer Name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Leave blank to fill in by hand"
                    className="mt-4"
                  />
                  <Input
                    label="Buyer Address"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="Leave blank to fill in by hand"
                    className="mt-4"
                  />
                </div>
              </>
            )}


          </div>
        </Card>
      </div>

      {/* Generate Button */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Ready to Generate</h3>
            <p className="text-sm text-gray-500">
              {selectedAnimal 
                ? `Generate ${certificateType} certificate for ${animal?.name}`
                : 'Select an animal to generate a certificate'
              }
            </p>
          </div>
          <Button
            onClick={printCertificate}
            disabled={!selectedAnimal}
            leftIcon={<Printer className="h-4 w-4" />}
            size="lg"
          >
            Print Certificate
          </Button>
        </div>
      </Card>

      {/* Tips */}
      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold mb-3">Certificate Tips</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Bill of Sale:</strong> Legal document for transferring ownership. Include buyer info or fill in by hand.</li>
          <li>• <strong>Health History:</strong> Shows vaccination and deworming history from your farm records. Not a veterinary certificate — for official travel docs, consult your vet.</li>
          <li>• <strong>Registration:</strong> Summary of registration details and parentage for your records.</li>
          <li>• <strong>Pedigree:</strong> Three-generation family tree. Great for buyers interested in breeding.</li>
          <li>• Use your browser's "Save as PDF" option in the print dialog to save digital copies.</li>
        </ul>
      </Card>
    </div>
  );
}
