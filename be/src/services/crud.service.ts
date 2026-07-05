import { query } from "../utils/db";

export interface ResourceConfig {
  tableName: string;
  idPrefix: string;
  searchFields: string[];
  allowedFields: string[];
  requiredFields: string[];
  numericFields?: string[];
  booleanFields?: string[];
  jsonFields?: string[];
}

export const resourceConfigs: Record<string, ResourceConfig> = {
  tables: {
    tableName: "tables",
    idPrefix: "table_",
    searchFields: ["location"],
    allowedFields: ["tableNumber", "capacity", "status", "location", "qrCode"],
    requiredFields: ["tableNumber", "capacity"],
    numericFields: ["tableNumber", "capacity"]
  },
  menu: {
    tableName: "menu_items",
    idPrefix: "dish_",
    searchFields: ["name", "description", "category"],
    allowedFields: ["name", "description", "category", "price", "image", "available", "preparationTime"],
    requiredFields: ["name", "category", "price"],
    numericFields: ["price", "preparationTime"],
    booleanFields: ["available"]
  },
  inventory: {
    tableName: "inventory_items",
    idPrefix: "inv_",
    searchFields: ["itemName", "itemCode", "category", "supplier"],
    allowedFields: ["itemName", "itemCode", "category", "quantity", "unit", "minQuantity", "supplier", "lastRestocked"],
    requiredFields: ["itemName", "itemCode", "quantity", "minQuantity"],
    numericFields: ["quantity", "minQuantity"]
  },
  payments: {
    tableName: "payments",
    idPrefix: "pay_",
    searchFields: ["paymentMethod", "status", "discountReason", "notes"],
    allowedFields: ["orderId", "amount", "paymentMethod", "status", "discountAmount", "discountReason", "notes", "completedAt"],
    requiredFields: ["orderId", "amount", "paymentMethod", "status"],
    numericFields: ["amount", "discountAmount"]
  }
};

/**
 * Normalizes a database row to a JavaScript object based on the resource config.
 */
const normalizeRow = (row: any, config: ResourceConfig): any => {
  if (!row) return null;
  const result = { ...row };

  // Convert numeric fields
  if (config.numericFields) {
    config.numericFields.forEach((field) => {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = Number(result[field]);
      }
    });
  }

  // Convert boolean fields
  if (config.booleanFields) {
    config.booleanFields.forEach((field) => {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = Boolean(result[field]);
      }
    });
  }

  // Parse JSON fields
  if (config.jsonFields) {
    config.jsonFields.forEach((field) => {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          result[field] = typeof result[field] === "string" ? JSON.parse(result[field]) : result[field];
        } catch (e) {
          console.error(`Failed to parse JSON field ${field}:`, e);
        }
      }
    });
  }

  return result;
};

/**
 * Normalizes data before saving to the database.
 */
const prepareDataForDb = (data: any, config: ResourceConfig): any => {
  const result = { ...data };

  // Convert boolean to 1/0
  if (config.booleanFields) {
    config.booleanFields.forEach((field) => {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = result[field] ? 1 : 0;
      }
    });
  }

  // Convert JSON fields to string
  if (config.jsonFields) {
    config.jsonFields.forEach((field) => {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = typeof result[field] === "object" ? JSON.stringify(result[field]) : result[field];
      }
    });
  }

  return result;
};

export const getResourceConfig = (resource: string): ResourceConfig => {
  const config = resourceConfigs[resource];
  if (!config) {
    throw new Error(`Resource '${resource}' is not configured for generic CRUD.`);
  }
  return config;
};

export const getAll = async (resource: string, queryParams: any) => {
  const config = getResourceConfig(resource);
  const { page = 1, limit = 10, q = "", sortBy = "createdAt", sortOrder = "DESC", ...filters } = queryParams;

  const parsedPage = Math.max(1, Number(page));
  const parsedLimit = Number(limit);
  const isNoPagination = limit === "-1" || limit === "all" || isNaN(parsedLimit) || parsedLimit <= 0;

  const conditions: string[] = [];
  const params: any[] = [];

  // Search keyword (q)
  if (q && config.searchFields.length > 0) {
    const searchConditions = config.searchFields.map((field) => `\`${field}\` LIKE ?`).join(" OR ");
    conditions.push(`(${searchConditions})`);
    config.searchFields.forEach(() => {
      params.push(`%${q}%`);
    });
  }

  // Dynamic filters
  Object.keys(filters).forEach((key) => {
    if (config.allowedFields.includes(key)) {
      conditions.push(`\`${key}\` = ?`);
      params.push(filters[key]);
    }
  });

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Validate sort field to prevent SQL Injection
  const validSortFields = [...config.allowedFields, "id", "createdAt"];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = ["ASC", "DESC"].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : "DESC";

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM \`${config.tableName}\` ${whereClause}`;
  const countResult = await query<any[]>(countSql, params);
  const totalItems = countResult[0]?.total || 0;

  // Fetch items
  let itemsSql = `SELECT * FROM \`${config.tableName}\` ${whereClause} ORDER BY \`${safeSortBy}\` ${safeSortOrder}`;
  const itemsParams = [...params];

  if (!isNoPagination) {
    const offset = (parsedPage - 1) * parsedLimit;
    itemsSql += ` LIMIT ? OFFSET ?`;
    itemsParams.push(parsedLimit, offset);
  }

  const rows = await query<any[]>(itemsSql, itemsParams);
  const normalizedItems = rows.map((row) => normalizeRow(row, config));

  if (isNoPagination) {
    return {
      items: normalizedItems,
      pagination: {
        page: 1,
        limit: totalItems,
        totalItems,
        totalPages: 1
      }
    };
  }

  const totalPages = Math.ceil(totalItems / parsedLimit);
  return {
    items: normalizedItems,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalItems,
      totalPages: totalPages || 1
    }
  };
};

export const getById = async (resource: string, id: string): Promise<any | null> => {
  const config = getResourceConfig(resource);
  const sql = `SELECT * FROM \`${config.tableName}\` WHERE id = ?`;
  const rows = await query<any[]>(sql, [id]);
  return rows[0] ? normalizeRow(rows[0], config) : null;
};

export const create = async (resource: string, data: any): Promise<any> => {
  const config = getResourceConfig(resource);
  
  // Validate required fields
  for (const field of config.requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      throw new Error(`Trường '${field}' là bắt buộc.`);
    }
  }

  // Filter allowed fields
  const insertData: Record<string, any> = {};
  config.allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      insertData[field] = data[field];
    }
  });

  // Auto-generate id and createdAt
  const id = `${config.idPrefix}${Date.now()}`;
  const createdAt = new Date().toISOString();
  
  insertData.id = id;
  insertData.createdAt = createdAt;

  const preparedData = prepareDataForDb(insertData, config);
  const fields = Object.keys(preparedData);
  const placeholders = fields.map(() => "?").join(", ");
  const values = Object.values(preparedData);

  const sql = `INSERT INTO \`${config.tableName}\` (${fields.map(f => `\`${f}\``).join(", ")}) VALUES (${placeholders})`;
  await query(sql, values);

  return { ...insertData, id, createdAt };
};

export const update = async (resource: string, id: string, data: any): Promise<any | null> => {
  const config = getResourceConfig(resource);
  
  const existing = await getById(resource, id);
  if (!existing) return null;

  // Filter allowed fields for update
  const updateData: Record<string, any> = {};
  let hasUpdate = false;

  config.allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
      hasUpdate = true;
    }
  });

  if (!hasUpdate) {
    return existing;
  }

  const preparedData = prepareDataForDb(updateData, config);
  const fields = Object.keys(preparedData);
  const setClause = fields.map((f) => `\`${f}\` = ?`).join(", ");
  const values = Object.values(preparedData);
  values.push(id); // for WHERE id = ?

  const sql = `UPDATE \`${config.tableName}\` SET ${setClause} WHERE id = ?`;
  await query(sql, values);

  return { ...existing, ...updateData };
};

export const deleteById = async (resource: string, id: string): Promise<boolean> => {
  const config = getResourceConfig(resource);
  const sql = `DELETE FROM \`${config.tableName}\` WHERE id = ?`;
  const result = await query<any>(sql, [id]);
  return result.affectedRows > 0;
};

export const deleteBulk = async (resource: string, ids: string[]): Promise<number> => {
  if (!ids || ids.length === 0) return 0;
  const config = getResourceConfig(resource);
  const placeholders = ids.map(() => "?").join(", ");
  const sql = `DELETE FROM \`${config.tableName}\` WHERE id IN (${placeholders})`;
  const result = await query<any>(sql, ids);
  return result.affectedRows || 0;
};

export const deleteAll = async (resource: string): Promise<boolean> => {
  const config = getResourceConfig(resource);
  const sql = `DELETE FROM \`${config.tableName}\``;
  const result = await query<any>(sql);
  return result.affectedRows >= 0;
};
