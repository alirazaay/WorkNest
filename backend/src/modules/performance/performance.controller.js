import { createPerformanceCycle, getPerformanceCycle, listPerformanceCycles, updatePerformanceCycle } from './performance.service.js';

const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
export async function cyclesList(req, res, next) { try { send(res, await listPerformanceCycles(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function cycleGet(req, res, next) { try { send(res, await getPerformanceCycle(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function cycleCreate(req, res, next) { try { send(res, await createPerformanceCycle(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function cycleUpdate(req, res, next) { try { send(res, await updatePerformanceCycle(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
