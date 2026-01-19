import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Users, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface CSVRow {
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  date_of_birth?: string;
  notes?: string;
  groups?: string;
}

interface CSVUploadProps {
  onUploadComplete: () => void;
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [results, setResults] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setUploading(false);
    setUploadProgress(0);
    setPreview([]);
    setResults(null);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      resetState();
      setFile(selectedFile);

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        preview: 5,
        complete: (result) => {
          // Normalize headers: trim, lowercase, replace spaces with underscores
          const normalizedData = result.data.map((row: any) => {
            const newRow: any = {};
            for (const key in row) {
              const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
              newRow[normalizedKey] = row[key];
            }
            return newRow;
          });
          setPreview(normalizedData as CSVRow[]);
        }
      });
    } else {
      setResults({ successCount: 0, errorCount: 0, errors: ['Please upload a valid CSV file.'] });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'text/csv': ['.csv'] },
  });

  const validateRow = (row: CSVRow, index: number): string | null => {
    if (!row.first_name?.trim()) {
      return `Row ${index + 2}: 'first_name' is missing or empty.`;
    }
    if (!row.last_name?.trim()) {
      return `Row ${index + 2}: 'last_name' is missing or empty.`;
    }
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      return `Row ${index + 2}: Invalid email format for '${row.email}'.`;
    }
    return null;
  };

  const handleUpload = async () => {
    console.log("handleUpload called. File:", file, "Org:", currentOrganization);
    if (!file || !currentOrganization?.id) {
        toast({
            title: "Import Failed",
            description: !file ? "Please select a file first." : "No organization selected. Please ensure you are part of an organization.",
            variant: "destructive",
        });
        console.error("Upload validation failed: No file or no organization.", { file, currentOrganization });
        return;
    }

    setUploading(true);
    setUploadProgress(10);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const validationErrors: string[] = [];
        const validRows: any[] = [];

        setUploadProgress(30);

        // Normalize headers and validate rows
        rows.forEach((row: any, index) => {
          const newRow: any = {};
          for (const key in row) {
            const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            newRow[normalizedKey] = row[key];
          }

          const error = validateRow(newRow, index);
          if (error) {
            validationErrors.push(error);
          } else {
            // Prepare row for database insertion
            const dbRow = {
              first_name: newRow.first_name?.trim(),
              last_name: newRow.last_name?.trim(),
              email: newRow.email?.trim() || null,
              phone_number: newRow.phone_number?.trim() || null,
              address: newRow.address ? {
                street: newRow.address?.trim(),
                city: newRow.city?.trim(),
                state: newRow.state?.trim(),
                zip: newRow.zip_code?.trim()
              } : null,
              birthday: newRow.date_of_birth ? new Date(newRow.date_of_birth).toISOString().split('T')[0] : null,
              member_status: 'first_time_visitor', // Default status
              tags: newRow.notes ? [newRow.notes.trim()] : [],
              organization_id: currentOrganization.id
            };

            validRows.push({
              ...dbRow,
              groups: newRow.groups // Keep groups separate for processing
            });
          }
        });

        setUploadProgress(60);

        if (validRows.length > 0) {
          try {
            // Insert people without groups first
            const peopleToInsert = validRows.map(row => {
              const { groups, ...personData } = row;
              return personData;
            });

            const { data: insertedPersons, error: insertError } = await supabase
              .from('people')
              .insert(peopleToInsert)
              .select('*');

            if (insertError) {
              throw new Error(`Database error: ${insertError.message}`);
            }

            setUploadProgress(80);

            // Handle group memberships
            if (insertedPersons && insertedPersons.length > 0) {
              const { data: groups, error: groupsError } = await supabase
                .from('groups')
                .select('id, name')
                .eq('organization_id', currentOrganization.id);

              if (groupsError) {
                console.error('Error fetching groups:', groupsError);
              } else {
                const groupNameToId: Record<string, string> = {};
                groups?.forEach(g => {
                  groupNameToId[g.name.toLowerCase()] = g.id;
                });

                const memberships: { group_id: string; person_id: string }[] = [];

                insertedPersons.forEach((person, index) => {
                  const originalRow = validRows[index];
                  if (originalRow.groups) {
                    const groupNames = originalRow.groups.split(',').map((g: string) => g.trim().toLowerCase()).filter(Boolean);
                    groupNames.forEach(groupName => {
                      const groupId = groupNameToId[groupName];
                      if (groupId) {
                        memberships.push({
                          group_id: groupId,
                          person_id: person.id
                        });
                      }
                    });
                  }
                });

                if (memberships.length > 0) {
                  const { error: membershipError } = await supabase
                    .from('group_members')
                    .insert(memberships);

                  if (membershipError) {
                    console.error('Error inserting group memberships:', membershipError);
                    validationErrors.push(`Warning: Some group assignments failed - ${membershipError.message}`);
                  }
                }
              }
            }

            setUploadProgress(100);

            const successMessages = [];
            if (insertedPersons && insertedPersons.length > 0) {
              successMessages.push(`Successfully imported ${insertedPersons.length} people.`);
            }

            setResults({
              successCount: insertedPersons?.length || 0,
              errorCount: validationErrors.length,
              errors: validationErrors.length > 0 ? validationErrors : successMessages,
            });

            if (insertedPersons && insertedPersons.length > 0) {
              onUploadComplete();
            }

          } catch (error: any) {
            console.error('Upload error:', error);
            setResults({
              successCount: 0,
              errorCount: 1,
              errors: [`Upload failed: ${error.message}`],
            });
          }
        } else {
          setResults({
            successCount: 0,
            errorCount: validationErrors.length,
            errors: validationErrors.length > 0 ? validationErrors : ['No valid rows found in the CSV file.'],
          });
        }

        setUploading(false);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        setResults({
          successCount: 0,
          errorCount: 1,
          errors: [`CSV Parsing Error: ${error.message}`]
        });
        setUploading(false);
      }
    });
  };

  const downloadTemplate = () => {
    const template = `first_name,last_name,email,phone_number,address,city,state,zip_code,date_of_birth,notes,groups
John,Doe,john.doe@email.com,555-123-4567,123 Main St,Anytown,CA,12345,1990-01-01,Active member,Group1
Jane,Smith,jane.smith@email.com,555-234-5678,456 Oak Ave,Somewhere,NY,67890,1985-05-15,New member,Group2`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'people_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Import Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p>Successfully imported <strong>{results.successCount}</strong> records.</p>
            {results.errorCount > 0 && (
              <p className="text-red-600">Failed to import <strong>{results.errorCount}</strong> records.</p>
            )}
          </div>

          {results.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Error Details</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 bg-muted p-3 rounded-lg">
                {results.errors.map((error, index) => (
                  <div key={index} className="text-xs text-red-700 bg-red-100 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={resetState} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Import Another File
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import People
        </CardTitle>
        <CardDescription>
          Upload a CSV file to add multiple people to your directory. Column headers must match the template.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Download our CSV template first</span>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            Download Template
          </Button>
        </div>

        {/* File Upload */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-violet-500 bg-violet-50' : 'border-gray-300 hover:border-violet-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <span className="font-medium">{file.name}</span>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); resetState(); }}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ) : isDragActive ? (
            <p className="text-lg">Drop the CSV file here...</p>
          ) : (
            <>
              <p className="text-lg font-medium mb-1">Drag & drop a CSV file here</p>
              <p className="text-sm text-muted-foreground">or click to select a file</p>
            </>
          )}
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">File Preview (first 5 rows)</h4>
            <div className="max-h-48 overflow-y-auto border rounded-lg overflow-x-auto">
              <table className="w-full text-xs table-auto">
                <thead className="bg-muted">
                  <tr>
                    {Object.keys(preview[0] || {}).map(key => (
                      <th key={key} className="px-2 py-2 text-left font-medium">{key.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index} className="border-t">
                      {Object.values(row).map((value, valueIndex) => (
                        <td key={valueIndex} className="px-2 py-1 truncate">{String(value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {file && !uploading && (
          <Button onClick={handleUpload} className="w-full" size="lg">
            <Users className="h-5 w-5 mr-2" />
            Validate and Import File
          </Button>
        )}

        {/* Progress */}
        {uploading && (
           <div className="space-y-2">
             <Progress value={uploadProgress} />
             <p className="text-sm text-center text-muted-foreground">Importing records... please wait.</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
