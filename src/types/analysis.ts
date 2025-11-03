/**
 * Code analysis types
 */

export interface AnalysisResult {
  repository: string;
  timestamp: Date;
  frontend?: FrontendAnalysis;
  backend?: BackendAnalysis;
  database?: DatabaseAnalysis;
  errors: AnalysisError[];
}

export interface FrontendAnalysis {
  files: ParsedFile[];
  components: Component[];
  apiCalls: APICall[];
  dependencyGraph: DependencyGraph;
  routing?: RoutingInfo;
}

export interface BackendAnalysis {
  files: ParsedFile[];
  endpoints: Endpoint[];
  databaseQueries: DatabaseQuery[];
  services: Service[];
  dependencyGraph: DependencyGraph;
  middleware: Middleware[];
}

export interface DatabaseAnalysis {
  schema: DatabaseSchema;
  tables: Table[];
  relationships: Relationship[];
  usageMap: TableUsageMap; // Which backend code uses which tables
}

export interface ParsedFile {
  path: string;
  language: string;
  ast?: any; // AST node (type depends on parser)
  imports: Import[];
  exports: Export[];
  functions?: FunctionDefinition[];
  classes?: ClassDefinition[];
  linesOfCode: number;
  complexity?: number;
}

export interface Import {
  from: string;
  default?: string;
  named?: string[];
  type: 'import' | 'require' | 'dynamic';
  line: number;
}

export interface Export {
  name: string;
  type: 'default' | 'named';
  line: number;
}

export interface Component {
  name: string;
  file: string;
  type: 'functional' | 'class' | 'hook' | 'context';
  props?: string[];
  state?: string[];
  hooks?: string[];
  line: number;
  column: number;
}

export interface APICall {
  id: string;
  file: string;
  function?: string; // Function/component containing the call
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'GRAPHQL';
  url: string | null; // null if dynamic/unresolvable
  urlPattern?: string; // Pattern if dynamic
  headers?: Record<string, string>;
  body?: any;
  line: number;
  column: number;
  confidence: number; // Confidence that URL is correctly identified
}

export interface Endpoint {
  id: string;
  file: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'GRAPHQL';
  path: string;
  pathPattern: string; // Normalized pattern
  handler: string; // Function name
  line: number;
  parameters: EndpointParameter[];
  middleware: string[]; // Middleware names
  responseType?: string;
}

export interface EndpointParameter {
  name: string;
  type: 'path' | 'query' | 'body' | 'header';
  required: boolean;
  typeHint?: string; // TypeScript type if available
}

export interface DatabaseQuery {
  id: string;
  file: string;
  function?: string;
  type: 'select' | 'insert' | 'update' | 'delete' | 'raw';
  table?: string; // If identifiable
  tables?: string[]; // Tables involved
  sql?: string; // If raw SQL
  ormMethod?: string; // e.g., 'findAll', 'create'
  line: number;
  confidence: number;
}

export interface Service {
  name: string;
  file: string;
  methods: string[];
  dependencies: string[]; // Other services/modules it depends on
}

export interface Middleware {
  name: string;
  file: string;
  appliedTo: string[]; // Endpoint IDs or patterns
  order?: number;
}

export interface Table {
  name: string;
  schema?: string;
  columns: Column[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
  primaryKey?: string[];
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  constraints?: string[];
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface Relationship {
  from: string; // Table name
  to: string; // Table name
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  foreignKey?: string;
}

export interface TableUsageMap {
  [tableName: string]: {
    endpoints: string[]; // Endpoint IDs
    queries: string[]; // Query IDs
    readOperations: number;
    writeOperations: number;
  };
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: 'file' | 'component' | 'function' | 'endpoint' | 'service' | 'module';
  name: string;
  file?: string;
  line?: number;
  metadata: Record<string, any>;
}

export interface GraphEdge {
  from: string; // Node ID
  to: string; // Node ID
  type: 'import' | 'call' | 'extends' | 'uses';
  metadata: Record<string, any>;
}

export interface RoutingInfo {
  framework: 'react-router' | 'vue-router' | 'angular-router';
  routes: Route[];
}

export interface Route {
  path: string;
  component: string;
  file: string;
}

export interface AnalysisError {
  type: 'parse-error' | 'detection-error' | 'analysis-error';
  message: string;
  file?: string;
  line?: number;
  stack?: string;
}

export interface FunctionDefinition {
  name: string;
  line: number;
  parameters: string[];
  returnType?: string;
}

export interface ClassDefinition {
  name: string;
  line: number;
  methods: string[];
  extends?: string;
  implements?: string[];
}

export interface DatabaseSchema {
  name?: string;
  tables: Table[];
  relationships: Relationship[];
}

