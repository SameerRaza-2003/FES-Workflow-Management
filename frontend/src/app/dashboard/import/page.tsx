'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import {
    previewTaskImport,
    validateTaskImport,
    commitTaskImport,
    TaskImportRow,
    TaskImportValidationError,
} from '@/lib/import'
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    X,
    ArrowRight,
    Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 'upload' | 'preview' | 'validate' | 'complete'

export default function ImportPage() {
    const { showToast } = useToast()

    const [step, setStep] = useState<Step>('upload')
    const [file, setFile] = useState<File | null>(null)
    const [rows, setRows] = useState<TaskImportRow[]>([])
    const [validationErrors, setValidationErrors] = useState<TaskImportValidationError[]>([])
    const [validRows, setValidRows] = useState(0)
    const [invalidRows, setInvalidRows] = useState(0)
    const [loading, setLoading] = useState(false)
    const [commitResult, setCommitResult] = useState<{ created: number; failed: number } | null>(null)

    const [dragOver, setDragOver] = useState(false)

    const handleFileSelect = async (selectedFile: File) => {
        setFile(selectedFile)
        setLoading(true)

        try {
            const preview = await previewTaskImport(selectedFile)
            setRows(preview.rows)
            setStep('preview')
            showToast('success', `Parsed ${preview.total_rows} rows`)
        } catch (err) {
            console.error('Failed to parse file:', err)
            showToast('error', 'Failed to parse file. Please check the format.')
            setFile(null)
        } finally {
            setLoading(false)
        }
    }

    const handleValidate = async () => {
        setLoading(true)

        try {
            const result = await validateTaskImport(rows.map((r) => r.data))
            setValidRows(result.valid_rows)
            setInvalidRows(result.invalid_rows)
            setValidationErrors(result.errors)
            setStep('validate')

            if (result.invalid_rows > 0) {
                showToast('warning', `${result.invalid_rows} rows have validation errors`)
            } else {
                showToast('success', 'All rows are valid')
            }
        } catch (err) {
            showToast('error', 'Validation failed')
        } finally {
            setLoading(false)
        }
    }

    const handleCommit = async () => {
        setLoading(true)

        try {
            // Only commit valid rows
            const validRowsData = rows.filter(
                (row) => !validationErrors.some((e) => e.row_number === row.row_number)
            )

            const result = await commitTaskImport(validRowsData)
            setCommitResult({ created: result.created, failed: result.failed })
            setStep('complete')
            showToast('success', `Successfully created ${result.created} tasks`)
        } catch (err) {
            showToast('error', 'Failed to import tasks')
        } finally {
            setLoading(false)
        }
    }

    const reset = () => {
        setStep('upload')
        setFile(null)
        setRows([])
        setValidationErrors([])
        setValidRows(0)
        setInvalidRows(0)
        setCommitResult(null)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)

        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            handleFileSelect(droppedFile)
        } else {
            showToast('error', 'Please upload a CSV or Excel file')
        }
    }

    return (
        <>
            <TopBar title="Import Tasks" subtitle="Upload CSV or Excel file" />

            <main className="px-6 lg:px-10 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {[
                            { id: 'upload', label: 'Upload' },
                            { id: 'preview', label: 'Preview' },
                            { id: 'validate', label: 'Validate' },
                            { id: 'complete', label: 'Complete' },
                        ].map((s, i) => (
                            <div key={s.id} className="flex items-center gap-4">
                                <div
                                    className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition',
                                        step === s.id
                                            ? 'bg-emerald-500 text-white'
                                            : ['preview', 'validate', 'complete'].indexOf(step) > ['upload', 'preview', 'validate', 'complete'].indexOf(s.id)
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-zinc-100 text-zinc-400'
                                    )}
                                >
                                    {i + 1}
                                </div>
                                <span
                                    className={cn(
                                        'text-sm font-medium hidden sm:block',
                                        step === s.id ? 'text-zinc-900' : 'text-zinc-400'
                                    )}
                                >
                                    {s.label}
                                </span>
                                {i < 3 && (
                                    <div className="w-8 h-0.5 bg-zinc-200 hidden sm:block" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Upload Step */}
                    {step === 'upload' && (
                        <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                            <CardContent className="p-8">
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault()
                                        setDragOver(true)
                                    }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    className={cn(
                                        'border-2 border-dashed rounded-2xl p-12 text-center transition',
                                        dragOver
                                            ? 'border-emerald-400 bg-emerald-50'
                                            : 'border-zinc-200 hover:border-zinc-300'
                                    )}
                                >
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 flex items-center justify-center">
                                        <FileSpreadsheet className="w-8 h-8 text-zinc-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                                        Drop your file here
                                    </h3>
                                    <p className="text-sm text-zinc-500 mb-4">
                                        or click to browse (CSV, XLSX, XLS)
                                    </p>
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleFileSelect(file)
                                        }}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload">
                                        <Button asChild className="rounded-xl">
                                            <span>
                                                <Upload className="w-4 h-4 mr-2" />
                                                Select File
                                            </span>
                                        </Button>
                                    </label>
                                </div>

                                {loading && (
                                    <div className="mt-6 text-center">
                                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        <p className="text-sm text-zinc-500">Parsing file...</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Preview Step */}
                    {step === 'preview' && (
                        <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-semibold text-zinc-900">Preview Import</h3>
                                        <p className="text-sm text-zinc-500">
                                            {rows.length} rows found in {file?.name}
                                        </p>
                                    </div>
                                    <Button variant="outline" onClick={reset} className="rounded-xl">
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                </div>

                                <div className="overflow-x-auto mb-6 max-h-96">
                                    <table className="w-full text-sm">
                                        <thead className="bg-zinc-50 sticky top-0">
                                            <tr>
                                                <th className="text-left px-4 py-3 font-medium text-zinc-500">#</th>
                                                {rows[0] && Object.keys(rows[0].data).slice(0, 5).map((key) => (
                                                    <th key={key} className="text-left px-4 py-3 font-medium text-zinc-500">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {rows.slice(0, 10).map((row) => (
                                                <tr key={row.row_number} className="hover:bg-zinc-50">
                                                    <td className="px-4 py-3 text-zinc-400">{row.row_number}</td>
                                                    {Object.values(row.data).slice(0, 5).map((val, i) => (
                                                        <td key={i} className="px-4 py-3 text-zinc-700 truncate max-w-xs">
                                                            {String(val || '—')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {rows.length > 10 && (
                                        <p className="text-sm text-zinc-400 text-center py-4">
                                            Showing 10 of {rows.length} rows
                                        </p>
                                    )}
                                </div>

                                <Button
                                    onClick={handleValidate}
                                    disabled={loading}
                                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500"
                                >
                                    {loading ? 'Validating...' : 'Validate Data'}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Validate Step */}
                    {step === 'validate' && (
                        <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-zinc-900">Validation Results</h3>
                                    <Button variant="outline" onClick={reset} className="rounded-xl">
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            <span className="font-medium text-emerald-700">Valid Rows</span>
                                        </div>
                                        <p className="text-2xl font-bold text-emerald-700">{validRows}</p>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                            <span className="font-medium text-red-700">Invalid Rows</span>
                                        </div>
                                        <p className="text-2xl font-bold text-red-700">{invalidRows}</p>
                                    </div>
                                </div>

                                {validationErrors.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-medium text-zinc-900 mb-3">Errors</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {validationErrors.map((error) => (
                                                <div
                                                    key={error.row_number}
                                                    className="p-3 bg-red-50 rounded-lg border border-red-100"
                                                >
                                                    <p className="font-medium text-red-700 text-sm">
                                                        Row {error.row_number}
                                                    </p>
                                                    <ul className="text-sm text-red-600 mt-1">
                                                        {error.errors.map((e, i) => (
                                                            <li key={i}>• {e}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleCommit}
                                    disabled={loading || validRows === 0}
                                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500"
                                >
                                    {loading ? 'Importing...' : `Import ${validRows} Tasks`}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Complete Step */}
                    {step === 'complete' && commitResult && (
                        <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                            <CardContent className="p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-zinc-900 mb-2">
                                    Import Complete!
                                </h3>
                                <p className="text-zinc-500 mb-6">
                                    Successfully created {commitResult.created} tasks
                                    {commitResult.failed > 0 && `, ${commitResult.failed} failed`}
                                </p>
                                <div className="flex justify-center gap-3">
                                    <Button variant="outline" onClick={reset} className="rounded-xl">
                                        Import More
                                    </Button>
                                    <Button
                                        onClick={() => (window.location.href = '/dashboard/tasks')}
                                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500"
                                    >
                                        View Tasks
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </>
    )
}
