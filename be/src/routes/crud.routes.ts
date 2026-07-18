import { Router } from "express";
import {
  getAllItems,
  getSingleItem,
  createItem,
  updateItem,
  deleteSingleItem,
  deleteBulkItems,
  deleteAllItems,
} from "../controllers/crud.controller";

const router = Router();

// LƯU Ý: Phải đặt /bulk và /all TRƯỚC /:id để Express tránh nhận lầm 'bulk' hoặc 'all' làm id.
router.delete("/:resource/bulk", deleteBulkItems);
router.delete("/:resource/all", deleteAllItems);

router.get("/:resource", getAllItems);
router.get("/:resource/:id", getSingleItem);
router.post("/:resource", createItem);
router.put("/:resource/:id", updateItem);
router.delete("/:resource/:id", deleteSingleItem);

export default router;
