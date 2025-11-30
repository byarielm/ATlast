import { AuthenticatedHandler } from "./shared/types";
import { UploadRepository } from "./shared/repositories";
import { successResponse } from "./shared/utils";
import { withAuthErrorHandling } from "./shared/middleware";

const getUploadsHandler: AuthenticatedHandler = async (context) => {
  const uploadRepo = new UploadRepository();

  // Fetch all uploads for this user
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
