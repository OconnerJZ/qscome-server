import { Router } from "express";
import { BusinessController } from "../controllers/BusinessController";
import { authenticate } from "../middlewares/authMiddleware";
import { requireBusinessPermission, requireSelfOrAdmin } from "../middlewares/ownership";
import { validateDto } from "../middlewares/validateDto";
import {
  AddBusinessPhotoDto,
  CreateBusinessDto,
  UpdateBusinessDeliverySettingsDto,
  UpdateBusinessDto,
  UpdateBusinessFoodTypesDto,
  UpdateBusinessLocationDto,
  UpdateBusinessPaymentMethodsDto,
  UpdateBusinessSchedulesDto,
} from "../dtos/business.dto";
import { BusinessTeamController } from "../controllers/BusinessTeamController";
import { AcceptBusinessInvitationCodeDto, InviteBusinessMemberDto, TransferBusinessOwnershipDto, UpdateBusinessMemberRoleDto } from "../dtos/businessTeam.dto";
import { createRateLimiter } from "../middlewares/rateLimit";
import { BusinessPlanController } from "../controllers/BusinessPlanController";
import { AssignBusinessPlanDto } from "../dtos/businessPlan.dto";
import { authorize } from "../middlewares/roleMiddleware";

const router = Router();
const businessController = new BusinessController();
const teamController = new BusinessTeamController();
const planController = new BusinessPlanController();
const invitationCodeLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });

router.get("/", businessController.getAll);
router.get("/plans/catalog", authenticate, planController.catalog);
router.get("/owner/:ownerId", authenticate, requireSelfOrAdmin("ownerId"), businessController.getByOwner);
router.get("/invitations/:token", authenticate, teamController.preview);
router.post("/invitations/:token/accept", authenticate, teamController.accept);
router.post("/invitations/accept-code", authenticate, invitationCodeLimiter, validateDto(AcceptBusinessInvitationCodeDto), teamController.acceptCode);
router.get("/:id/team", authenticate, requireBusinessPermission("team.manage", "id"), teamController.list);
router.get("/:id/plan", authenticate, requireBusinessPermission("settings.update", "id"), planController.get);
router.patch("/:id/plan", authenticate, authorize("admin"), validateDto(AssignBusinessPlanDto), planController.assign);
router.post("/:id/invitations", authenticate, requireBusinessPermission("team.manage", "id"), validateDto(InviteBusinessMemberDto), teamController.invite);
router.delete("/:id/invitations/:invitationId", authenticate, requireBusinessPermission("team.manage", "id"), teamController.cancel);
router.patch("/:id/members/:userId", authenticate, requireBusinessPermission("team.manage", "id"), validateDto(UpdateBusinessMemberRoleDto), teamController.updateMember);
router.delete("/:id/members/:userId", authenticate, requireBusinessPermission("team.manage", "id"), teamController.removeMember);
router.post("/:id/ownership-transfers", authenticate, requireBusinessPermission("ownership.transfer", "id"), validateDto(TransferBusinessOwnershipDto), teamController.transfer);
router.get("/:id/menu", businessController.getMenu);
router.get("/:id", businessController.getById);

// Crear un negocio es una capacidad de cualquier usuario autenticado. El rol
// global no debe impedir que un cliente se convierta también en propietario;
// el acceso posterior se resuelve por business_owners.
router.post(
  "/",
  authenticate,
  validateDto(CreateBusinessDto),
  businessController.create,
);

const ownerOnly = [
  authenticate,
  requireBusinessPermission("settings.update", "id"),
] as const;

router.put("/:id", ...ownerOnly, validateDto(UpdateBusinessDto), businessController.update);
router.put("/:id/location", ...ownerOnly, validateDto(UpdateBusinessLocationDto), businessController.updateLocation);
router.put("/:id/schedules", ...ownerOnly, validateDto(UpdateBusinessSchedulesDto), businessController.updateSchedules);
router.put(
  "/:id/delivery-settings",
  ...ownerOnly,
  validateDto(UpdateBusinessDeliverySettingsDto),
  businessController.updateDeliverySettings,
);
router.put(
  "/:id/payment-methods",
  ...ownerOnly,
  validateDto(UpdateBusinessPaymentMethodsDto),
  businessController.updatePaymentMethods,
);
router.put("/:id/food-types", ...ownerOnly, validateDto(UpdateBusinessFoodTypesDto), businessController.updateFoodTypes);
router.post("/:id/photos", ...ownerOnly, validateDto(AddBusinessPhotoDto), businessController.addPhoto);
router.delete(
  "/:id/photos/:photoId",
  ...ownerOnly,
  businessController.deletePhoto,
);

export default router;
