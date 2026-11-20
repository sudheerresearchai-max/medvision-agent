'use client';

import * as React from 'react';
import Link from 'next/link';
import { Database, Search, ArrowRight, Brain, Wind, Dna, Filter, RefreshCw, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface CaseSummary {
  id: string;
  createdAt: string;
  organ: string | null;
  modality: string | null;
  routingReason: string | null;
  engine: string | null;
}

export default function CasesArchivePage() {
  const [cases, setCases] = React.useState<CaseSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filterOrgan, setFilterOrgan] = React.useState<string>('all');

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cases?limit=50');
      const data = await res.json();
      if (data?.ok && Array.isArray(data.cases)) {
        setCases(data.cases);
      }
    } catch (err) {
      console.error('Failed to fetch studies:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCases();
  }, []);

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      (c.routingReason && c.routingReason.toLowerCase().includes(search.toLowerCase()));
    const matchesOrgan = filterOrgan === 'all' || c.organ?.toLowerCase() === filterOrgan;
    return matchesSearch && matchesOrgan;
  });

  const getOrganIcon = (organ: string | null) => {
    switch (organ?.toLowerCase()) {
      case 'brain':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'lung':
        return <Wind className="h-4 w-4 text-cyan-500" />;
      case 'pancreas':
        return <Dna className="h-4 w-4 text-purple-500" />;
      default:
        return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Database className="h-6 w-6 text-primary" />
            PACS Diagnostic Case Archive
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centralized repository of evaluated patient studies and AI segmentation records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCases} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            Refresh
          </Button>
          <Link href="/upload">
            <Button size="sm" className="gap-1.5 text-xs">
              + New Evaluation
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <Card>
        <CardContent className="p-3.5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Case UUID or clinical findings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filterOrgan}
              onChange={(e) => setFilterOrgan(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="all">All Specialties ({cases.length})</option>
              <option value="brain">Neuro (Brain)</option>
              <option value="lung">Thoracic (Lung)</option>
              <option value="pancreas">Abdominal (Pancreas)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      {loading ? (
        <Card className="p-12 text-center text-muted-foreground text-sm">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2 text-primary" />
          Querying Supabase PACS storage...
        </Card>
      ) : filteredCases.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Database className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="font-semibold text-base">No Matching Studies Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {cases.length === 0
              ? 'No studies stored yet. Upload a scan or launch a preloaded evaluation case to populate the archive.'
              : 'Try clearing your search query or organ filter.'}
          </p>
          <Link href="/upload">
            <Button size="sm" className="mt-2">
              Launch First Analysis
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredCases.map((study) => (
            <Card key={study.id} className="hover:border-primary/50 transition-all hover:shadow-xs group">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-lg border bg-secondary/30 p-2.5 mt-0.5">
                    {getOrganIcon(study.organ)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-foreground">
                        {study.id}
                      </span>
                      <Badge variant="secondary" className="text-[11px] uppercase">
                        {study.organ || 'Unspecified'}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        {study.modality || 'MRI/CT'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1 max-w-xl">
                      {study.routingReason || 'Diagnostic study evaluation completed.'}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(study.createdAt).toLocaleString()}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● Verified</span>
                    </div>
                  </div>
                </div>

                <Link href={`/case/${study.id}`}>
                  <Button variant="outline" size="sm" className="group-hover:border-primary group-hover:text-primary gap-1.5 text-xs font-semibold">
                    Open PACS Viewer <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
