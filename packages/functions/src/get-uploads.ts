import { AuthenticatedHandler } from "./core/types";
import { UploadRepository } from "./repositories";
import { successResponse } from "./utils";
import { withAuthErrorHandling } from "./core/middleware";

const getUploadsHandler: AuthenticatedHandler = async (context) => {
  const uploadRepo = new UploadRepository();

  const uploads = await uploadRepo.getUserUploads(context.did);

  return successResponse({
    uploads: uploads.map((upload) => ({
      uploadId: upload.upload_id,
      sourcePlatform: upload.source_platform,
      createdAt: upload.created_at,
      totalUsers: upload.total_users,
      matchedUsers: upload.matched_users,
      unmatchedUsers: upload.unmatched_users,
    })),
  });
};

export const handler = withAuthErrorHandling(getUploadsHandler);
