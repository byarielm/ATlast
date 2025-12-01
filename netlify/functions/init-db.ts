import { SimpleHandler } from "./core/types/api.types";
import { DatabaseService } from "./infrastructure/database/DatabaseService";
import { withErrorHandling } from "./core/middleware";
import { successResponse } from "./utils";

const initDbHandler: SimpleHandler = async () => {
  const dbService = new DatabaseService();
  await dbService.initDatabase();
  return successResponse({ message: "Database initialized successfully" });
};

export const handler = withErrorHandling(initDbHandler);
