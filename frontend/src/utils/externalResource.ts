import type {
  EditableStructuredSection,
  ExternalDatabaseItem,
  ExternalMiddlewareItem,
  ExternalOssItem,
  ExternalOtherItem,
  ExternalRedisItem,
  StructuredExternalResource,
  StructuredExternalResourceFormValues,
  StructuredSection,
} from "@/types/externalResource";
import type {
  ProjectExternalResource,
  ProjectExternalResourceUpdatePayload,
} from "@/types/project";

function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some(hasMeaningfulValue);
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasMeaningfulValue);
  }

  return value !== null && value !== undefined;
}

function sanitizeItems<T extends object>(items: T[]): T[] {
  return items
    .map((item) =>
      Object.entries(item as Record<string, unknown>).reduce<Record<string, unknown>>(
        (accumulator, [key, value]) => {
          if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed) {
              accumulator[key] = trimmed;
            }
            return accumulator;
          }

          if (value !== undefined && value !== null && value !== "") {
            accumulator[key] = value;
          }
          return accumulator;
        },
        {},
      ) as T,
    )
    .filter((item) => hasMeaningfulValue(item as Record<string, unknown>));
}

function normalizeSection<T extends object>(
  section: EditableStructuredSection<T> | StructuredSection<T> | null | undefined,
): StructuredSection<T> {
  return {
    items: sanitizeItems(section?.items ?? []),
    notes: section?.notes?.trim() ?? "",
  };
}

export function createEmptyExternalResource(): StructuredExternalResource {
  return {
    aliyun_oss: { items: [], notes: "" },
    database_config: { items: [], notes: "" },
    redis_config: { items: [], notes: "" },
    middleware_config: { items: [], notes: "" },
    other_config: { items: [], notes: "" },
  };
}

export function normalizeExternalResource(
  resource:
    | Partial<StructuredExternalResource>
    | ProjectExternalResource
    | null
    | undefined,
): StructuredExternalResource {
  return {
    aliyun_oss: normalizeSection<ExternalOssItem>(resource?.aliyun_oss),
    database_config: normalizeSection<ExternalDatabaseItem>(resource?.database_config),
    redis_config: normalizeSection<ExternalRedisItem>(resource?.redis_config),
    middleware_config: normalizeSection<ExternalMiddlewareItem>(
      resource?.middleware_config,
    ),
    other_config: normalizeSection<ExternalOtherItem>(resource?.other_config),
  };
}

export function toExternalResourceFormValues(
  resource: ProjectExternalResource | null | undefined,
): StructuredExternalResourceFormValues {
  return normalizeExternalResource(resource);
}

export function serializeExternalResourceFormValues(
  values: StructuredExternalResourceFormValues,
): ProjectExternalResourceUpdatePayload {
  return normalizeExternalResource(values);
}

export function hasStructuredSectionContent<T extends object>(
  section: StructuredSection<T>,
): boolean {
  return section.items.length > 0 || Boolean(section.notes.trim());
}

export function hasStructuredSectionItems<T extends object>(
  section: StructuredSection<T>,
): boolean {
  return section.items.length > 0;
}

export function hasExternalResourceContent(
  resource: ProjectExternalResource | StructuredExternalResource | null | undefined,
): boolean {
  const normalized = normalizeExternalResource(resource);
  return Object.values(normalized).some((section) => hasStructuredSectionContent(section));
}
