import { assignEmployeeShift, createShift, getShiftSchedule, listEmployeeAssignments, listShifts, replaceShiftSchedule, updateEmployeeShift, updateShift } from './shift.service.js';

const send = (res, data, status = 200) => res.status(status).json({ success: true, data });

export async function listShiftsHandler(req, res, next) { try { send(res, await listShifts(req.auth)); } catch (error) { next(error); } }
export async function createShiftHandler(req, res, next) { try { send(res, await createShift(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function updateShiftHandler(req, res, next) { try { send(res, await updateShift(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function getShiftScheduleHandler(req, res, next) { try { send(res, await getShiftSchedule(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function replaceShiftScheduleHandler(req, res, next) { try { send(res, await replaceShiftSchedule(req.auth, Number(req.params.id), req.validated.body.days)); } catch (error) { next(error); } }
export async function listEmployeeAssignmentsHandler(req, res, next) { try { send(res, await listEmployeeAssignments(req.auth, Number(req.params.employeeId))); } catch (error) { next(error); } }
export async function assignEmployeeShiftHandler(req, res, next) { try { send(res, await assignEmployeeShift(req.auth, Number(req.params.employeeId), req.validated.body), 201); } catch (error) { next(error); } }
export async function updateEmployeeShiftHandler(req, res, next) { try { send(res, await updateEmployeeShift(req.auth, Number(req.params.employeeId), Number(req.params.assignmentId), req.validated.body)); } catch (error) { next(error); } }
