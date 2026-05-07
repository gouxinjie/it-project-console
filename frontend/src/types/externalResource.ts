export interface ExternalOssItem {
  name?: string;
  bucket_name?: string;
  endpoint?: string;
  region?: string;
  environment?: string;
  access_path?: string;
  notes?: string;
}

export interface ExternalDatabaseItem {
  name?: string;
  engine?: string;
  host?: string;
  port?: string;
  database_name?: string;
  account_name?: string;
  environment?: string;
  notes?: string;
}

export interface ExternalRedisItem {
  name?: string;
  host?: string;
  port?: string;
  database_index?: string;
  environment?: string;
  notes?: string;
}

export interface ExternalMiddlewareItem {
  name?: string;
  middleware_type?: string;
  endpoint?: string;
  environment?: string;
  notes?: string;
}

export interface ExternalOtherItem {
  name?: string;
  config_summary?: string;
  environment?: string;
  notes?: string;
}

export interface StructuredSection<T> {
  items: T[];
  notes: string;
}

export type EditableStructuredSection<T> = StructuredSection<T>;

export interface StructuredExternalResource {
  aliyun_oss: StructuredSection<ExternalOssItem>;
  database_config: StructuredSection<ExternalDatabaseItem>;
  redis_config: StructuredSection<ExternalRedisItem>;
  middleware_config: StructuredSection<ExternalMiddlewareItem>;
  other_config: StructuredSection<ExternalOtherItem>;
}

export interface StructuredExternalResourceFormValues {
  aliyun_oss: StructuredSection<ExternalOssItem>;
  database_config: StructuredSection<ExternalDatabaseItem>;
  redis_config: StructuredSection<ExternalRedisItem>;
  middleware_config: StructuredSection<ExternalMiddlewareItem>;
  other_config: StructuredSection<ExternalOtherItem>;
}
