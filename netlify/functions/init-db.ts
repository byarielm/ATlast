import { SimpleHandler } from "./shared/types/api.types";
import { DatabaseService } from "./shared/services/database";
import { withErrorHandling } from "./shared/middleware";
import { successResponse } from "./shared/utils";

const initDbHandler: SimpleHandler = async () => {
  const dbService = new DatabaseService();
  await dbService.initDatabase();
  return successResponse({ message: "Database initialized successfully" });
};

export const handler = withErrorHandling(initDbHandler);
