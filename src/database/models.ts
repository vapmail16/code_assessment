/**
 * Database models and types
 */

import { AssessmentResult } from '../types';
import { ImpactAnalysis } from '../types';
import { LineageGraph } from '../types';
import { BenchmarkResult } from '../performance/benchmarks';

export interface AnalysisResultRow {
  id: string;
  repository: string;
  repository_url?: string | null;
  tech_stack?: any;
  assessment: AssessmentResult;
  lineage_graph?: LineageGraph | null;
  created_at: Date;
  updated_at: Date;
  analysis_duration_ms?: number | null;
  status: string;
  error_message?: string | null;
}

export interface ImpactAnalysisRow {
  id: string;
  analysis_result_id: string;
  change_request: any;
  impact_analysis: ImpactAnalysis;
  affected_files: string[];
  breaking_changes_count: number;
  created_at: Date;
}

export interface ValidationResultRow {
  id: string;
  test_case_id: string;
  repository: string;
  lineage_accuracy?: number | null;
  impact_precision?: number | null;
  impact_recall?: number | null;
  impact_f1_score?: number | null;
  success: boolean;
  errors?: string[] | null;
  created_at: Date;
}

export interface PerformanceBenchmarkRow {
  id: string;
  repository: string;
  files_count?: number | null;
  lines_of_code?: number | null;
  repository_size_mb?: number | null;
  cloning_time_ms?: number | null;
  file_analysis_time_ms?: number | null;
  tech_stack_detection_time_ms?: number | null;
  parsing_time_ms?: number | null;
  graph_building_time_ms?: number | null;
  assessment_time_ms?: number | null;
  total_time_ms: number;
  peak_memory_mb?: number | null;
  average_memory_mb?: number | null;
  success: boolean;
  errors?: string[] | null;
  created_at: Date;
}

export interface ParsedFileCacheRow {
  id: string;
  repository: string;
  file_path: string;
  file_hash: string;
  parsed_data: any;
  created_at: Date;
  expires_at?: Date | null;
}

