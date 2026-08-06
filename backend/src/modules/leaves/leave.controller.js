import { approveLeave, cancelLeave, createLeaveRequest, createLeaveType, getLeaveRequest, leaveCalendar, listBalances, listLeaveRequests, listLeaveTypes, listNotifications, markAllNotificationsRead, markNotificationRead, rejectLeave } from './leave.service.js';

const send = (res, data, status = 200) => res.status(status).json({ success: true, data });

export async function typesList(req, res, next) { try { send(res, await listLeaveTypes(req.auth.tenantId)); } catch (error) { next(error); } }
export async function typesCreate(req, res, next) { try { send(res, await createLeaveType(req.auth.tenantId, req.body), 201); } catch (error) { next(error); } }
export async function balancesMe(req, res, next) { try { send(res, await listBalances(req.auth)); } catch (error) { next(error); } }
export async function balancesEmployee(req, res, next) { try { send(res, await listBalances(req.auth, Number(req.params.employeeId))); } catch (error) { next(error); } }
export async function requestsList(req, res, next) { try { send(res, await listLeaveRequests(req.auth, req.query)); } catch (error) { next(error); } }
export async function requestGet(req, res, next) { try { send(res, await getLeaveRequest(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function requestCreate(req, res, next) { try { send(res, await createLeaveRequest(req.auth, req.body), 201); } catch (error) { next(error); } }
export async function requestApprove(req, res, next) { try { send(res, await approveLeave(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function requestReject(req, res, next) { try { send(res, await rejectLeave(req.auth, Number(req.params.id), req.body.comment)); } catch (error) { next(error); } }
export async function requestCancel(req, res, next) { try { send(res, await cancelLeave(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function calendar(req, res, next) { try { send(res, await leaveCalendar(req.auth, req.query)); } catch (error) { next(error); } }
export async function notificationsList(req, res, next) { try { send(res, await listNotifications(req.auth, req.query)); } catch (error) { next(error); } }
export async function notificationRead(req, res, next) { try { send(res, await markNotificationRead(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function notificationsReadAll(req, res, next) { try { await markAllNotificationsRead(req.auth); res.status(204).send(); } catch (error) { next(error); } }
