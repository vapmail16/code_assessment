-- Code Assessment Platform Database Schema

-- Create database if it doesn't exist (run manually)
-- CREATE DATABASE code_assessment;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository VARCHAR(255) NOT NULL,
    repository_url TEXT,
    tech_stack JSONB,
    assessment JSONB NOT NULL,
    lineage_graph JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    analysis_duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    
    -- Indexes
    CONSTRAINT analysis_results_repository_check CHECK (char_length(repository) > 0)
);

CREATE INDEX IF NOT EXISTS idx_analysis_results_repository ON analysis_results(repository);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_status ON analysis_results(status);

-- Impact analysis results table
CREATE TABLE IF NOT EXISTS impact_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_result_id UUID REFERENCES analysis_results(id) ON DELETE CASCADE,
    change_request JSONB NOT NULL,
    impact_analysis JSONB NOT NULL,
    affected_files TEXT[],
    breaking_changes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT impact_analyses_analysis_result_id_fk FOREIGN KEY (analysis_result_id) REFERENCES analysis_results(id)
);

CREATE INDEX IF NOT EXISTS idx_impact_analyses_analysis_result_id ON impact_analyses(analysis_result_id);
CREATE INDEX IF NOT EXISTS idx_impact_analyses_created_at ON impact_analyses(created_at DESC);

-- Validation test results table
CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id VARCHAR(255) NOT NULL,
    repository VARCHAR(255) NOT NULL,
    lineage_accuracy DECIMAL(5,4),
    impact_precision DECIMAL(5,4),
    impact_recall DECIMAL(5,4),
    impact_f1_score DECIMAL(5,4),
    success BOOLEAN DEFAULT false,
    errors TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT validation_results_accuracy_check CHECK (lineage_accuracy >= 0 AND lineage_accuracy <= 1),
    CONSTRAINT validation_results_precision_check CHECK (impact_precision >= 0 AND impact_precision <= 1)
);

CREATE INDEX IF NOT EXISTS idx_validation_results_test_case_id ON validation_results(test_case_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_repository ON validation_results(repository);
CREATE INDEX IF NOT EXISTS idx_validation_results_created_at ON validation_results(created_at DESC);

-- Performance benchmarks table
CREATE TABLE IF NOT EXISTS performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository VARCHAR(255) NOT NULL,
    files_count INTEGER,
    lines_of_code INTEGER,
    repository_size_mb DECIMAL(10,2),
    cloning_time_ms INTEGER,
    file_analysis_time_ms INTEGER,
    tech_stack_detection_time_ms INTEGER,
    parsing_time_ms INTEGER,
    graph_building_time_ms INTEGER,
    assessment_time_ms INTEGER,
    total_time_ms INTEGER NOT NULL,
    peak_memory_mb DECIMAL(10,2),
    average_memory_mb DECIMAL(10,2),
    success BOOLEAN DEFAULT true,
    errors TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_repository ON performance_benchmarks(repository);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_created_at ON performance_benchmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_total_time ON performance_benchmarks(total_time_ms);

-- Cache table for storing parsed file results
CREATE TABLE IF NOT EXISTS parsed_file_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    parsed_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(repository, file_path)
);

CREATE INDEX IF NOT EXISTS idx_parsed_file_cache_repository ON parsed_file_cache(repository);
CREATE INDEX IF NOT EXISTS idx_parsed_file_cache_expires_at ON parsed_file_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_parsed_file_cache_file_hash ON parsed_file_cache(file_hash);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for analysis_results
DROP TRIGGER IF EXISTS update_analysis_results_updated_at ON analysis_results;
CREATE TRIGGER update_analysis_results_updated_at
    BEFORE UPDATE ON analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
