import { clockIn, clockOut, listAttendance, myAttendance, summary } from './attendance.service.js';

const send = (res, data, status = 200) => res.status(status).json({ success: true, data });

export async function clockInHandler(req, res, next) { try { send(res, await clockIn(req.auth), 201); } catch (error) { next(error); } }
export async function gpsClockInHandler(req, res, next) { try { send(res, await clockIn(req.auth, { ...req.validated.body, source: 'gps' }), 201); } catch (error) { next(error); } }
export async function clockOutHandler(req, res, next) { try { send(res, await clockOut(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function listHandler(req, res, next) { try { send(res, await listAttendance(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function myHandler(req, res, next) { try { send(res, await myAttendance(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function employeeHandler(req, res, next) { try { send(res, await listAttendance(req.auth, req.validated.query, Number(req.params.employeeId))); } catch (error) { next(error); } }
export async function summaryHandler(req, res, next) { try { send(res, await summary(req.auth, req.validated.query)); } catch (error) { next(error); } }
