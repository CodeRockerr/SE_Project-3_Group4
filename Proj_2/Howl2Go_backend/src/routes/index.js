import { Router } from "express";
import healthRouter from "./health.routes.js";
import foodRouter from "./food.routes.js";
import comboRouter from "./combo.routes.js";
import userRouter from "./user.routes.js";
import cartRouter from "./cart.routes.js";
import orderRouter from "./order.routes.js";
import reviewRouter from "./review.routes.js";
import bugRouter from "./bug.routes.js";
import adminRouter from "./admin.routes.js";
import paymentRouter from "./payment.routes.js";
import recommendationsRouter from "./recommendations.routes.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/food", foodRouter);
router.use("/food", comboRouter);
router.use("/users", userRouter);
router.use("/cart", cartRouter);
router.use("/orders", orderRouter);
router.use("/payments", paymentRouter);
router.use("/reviews", reviewRouter);
router.use("/bugs", bugRouter);
router.use("/admin", adminRouter);
router.use("/recommendations", recommendationsRouter);

export default router;
