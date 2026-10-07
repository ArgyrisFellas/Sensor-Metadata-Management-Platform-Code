export type Role = 'viewer' | 'editor' | 'department_admin';
export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  department: number;
  department_name: string;
  is_active?: boolean;
}
export interface RecordData {
  id: number;
  [key: string]: unknown;
}
export interface Page<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface Option { value: string; label: string }
export type FieldType = 'text' | 'textarea' | 'number' | 'password' | 'select' | 'relation' | 'boolean' | 'json' | 'point' | 'geometry';
export interface Field {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: Option[];
  source?: string;
  hint?: string;
  placeholder?: string;
}
export interface Resource {
  path: string;
  title: string;
  singular: string;
  description: string;
  fields: Field[];
  columns: { key: string; label: string }[];
  filters?: Field[];
  admin?: boolean;
}
