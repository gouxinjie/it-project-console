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

type StructuredPayload<T extends object> = {
  version?: number;
  items?: unknown;
  notes?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

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

function parseStructuredSection<T extends object>(
  rawValue: string | null | undefined,
): StructuredSection<T> {
  if (!isNonEmptyString(rawValue)) {
    return {
      source: "empty",
      items: [],
      notes: "",
      rawText: null,
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    const parsedObject = Array.isArray(parsed) ? null : (parsed as StructuredPayload<T>);
    const items = Array.isArray(parsed)
      ? sanitizeItems(parsed as T[])
      : Array.isArray(parsedObject?.items)
        ? sanitizeItems(parsedObject.items as T[])
        : [];
    const notes = parsedObject && isNonEmptyString(parsedObject.notes) ? parsedObject.notes.trim() : "";
    return {
      source: "structured",
      items,
      notes,
      rawText: null,
    };
  } catch {
    const legacyText = rawValue.trim();
    return {
      source: "legacy-text",
      items: [],
      notes: legacyText,
      rawText: legacyText,
    };
  }
}

function serializeStructuredSection<T extends object>(
  section: EditableStructuredSection<T> | undefined,
): string | null {
  const sanitizedItems = sanitizeItems(section?.items ?? []);
  const notes = section?.notes?.trim() ?? "";

  if (sanitizedItems.length === 0 && !notes) {
    return null;
  }

  return JSON.stringify({
    version: 1,
    items: sanitizedItems,
    notes,
  });
}

export function parseExternalResource(
  resource: ProjectExternalResource | null | undefined,
): StructuredExternalResource {
  return {
    aliyun_oss: parseStructuredSection<ExternalOssItem>(resource?.aliyun_oss),
    database_config: parseStructuredSection<ExternalDatabaseItem>(resource?.database_config),
    redis_config: parseStructuredSection<ExternalRedisItem>(resource?.redis_config),
    middleware_config: parseStructuredSection<ExternalMiddlewareItem>(
      resource?.middleware_config,
    ),
    other_config: parseStructuredSection<ExternalOtherItem>(resource?.other_config),
  };
}

export function toExternalResourceFormValues(
  resource: ProjectExternalResource | null | undefined,
): StructuredExternalResourceFormValues {
  const parsed = parseExternalResource(resource);
  return {
    aliyun_oss: {
      items: parsed.aliyun_oss.items,
      notes: parsed.aliyun_oss.notes,
    },
    database_config: {
      items: parsed.database_config.items,
      notes: parsed.database_config.notes,
    },
    redis_config: {
      items: parsed.redis_config.items,
      notes: parsed.redis_config.notes,
    },
    middleware_config: {
      items: parsed.middleware_config.items,
      notes: parsed.middleware_config.notes,
    },
    other_config: {
      items: parsed.other_config.items,
      notes: parsed.other_config.notes,
    },
  };
}

export function serializeExternalResourceFormValues(
  values: StructuredExternalResourceFormValues,
): ProjectExternalResourceUpdatePayload {
  return {
    aliyun_oss: serializeStructuredSection(values.aliyun_oss),
    database_config: serializeStructuredSection(values.database_config),
    redis_config: serializeStructuredSection(values.redis_config),
    middleware_config: serializeStructuredSection(values.middleware_config),
    other_config: serializeStructuredSection(values.other_config),
  };
}

export function hasStructuredSectionContent<T extends object>(
  section: StructuredSection<T>,
): boolean {
  return section.items.length > 0 || Boolean(section.notes?.trim());
}

export function hasStructuredSectionItems<T extends object>(
  section: StructuredSection<T>,
): boolean {
  return section.items.length > 0;
}
