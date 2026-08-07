import { activity, attendanceTrend, headcount, payrollTrend, summary } from './dashboard.service.js';

const send = (res, data) => res.json({ success: true, data });
export async function summaryHandler(req, res, next) { try { send(res, await summary(req.auth)); } catch (error) { next(error); } }
export async function attendanceTrendHandler(req, res, next) { try { send(res, await attendanceTrend(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function headcountHandler(req, res, next) { try { send(res, await headcount(req.auth)); } catch (error) { next(error); } }
export async function payrollTrendHandler(req, res, next) { try { send(res, await payrollTrend(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function activityHandler(req, res, next) { try { send(res, await activity(req.auth, req.validated.query)); } catch (error) { next(error); } }
