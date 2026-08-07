import { deactivateTenant, getTenant, listTenants, platformStats, reactivateTenant } from './super-admin.service.js';

const send = (res, data) => res.json({ success: true, data });
export async function tenantsList(req, res, next) { try { send(res, await listTenants(req.validated.query)); } catch (error) { next(error); } }
export async function stats(req, res, next) { try { send(res, await platformStats()); } catch (error) { next(error); } }
export async function tenantGet(req, res, next) { try { send(res, await getTenant(Number(req.params.id))); } catch (error) { next(error); } }
export async function tenantDeactivate(req, res, next) { try { send(res, await deactivateTenant(Number(req.params.id), { userId: req.auth.userId, req })); } catch (error) { next(error); } }
export async function tenantReactivate(req, res, next) { try { send(res, await reactivateTenant(Number(req.params.id), { userId: req.auth.userId, req })); } catch (error) { next(error); } }
