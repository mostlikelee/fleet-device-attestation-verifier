import { Router } from "express";
import postAppleMDAWebhook from "./routes/postAppleMDAWebhook";

const router = Router();

router.post("/appleMDAWebhook", postAppleMDAWebhook);

export default router;
