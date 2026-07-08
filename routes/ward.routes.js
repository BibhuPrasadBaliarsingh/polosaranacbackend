import express from "express";
import { createWard, getAllWards, updateWard, deleteWard } from "../controller/admin/ward.controller.js";



const router = express.Router();


router.post("/createward", createWard);
router.get("/getallwards", getAllWards);
router.put("/:id", updateWard);
router.delete("/:id", deleteWard);


export default router;
