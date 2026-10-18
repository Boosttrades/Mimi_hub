import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import settingsRouter from "./settings";
import usersRouter from "./users";
import storageRouter from "./storage";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(adminRouter);
router.use(settingsRouter);
router.use(usersRouter);
router.use(storageRouter);
router.use(authRouter);

export default router;
