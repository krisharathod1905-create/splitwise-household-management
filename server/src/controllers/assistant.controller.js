import { asyncHandler, sendSuccess } from "#utils/utils.js";
import { getAssistantReply } from "#services/assistant.service.js";

export const chatWithAssistant = asyncHandler(async (req, res) => {
  const result = await getAssistantReply(req.body);
  return sendSuccess(res, result);
});
