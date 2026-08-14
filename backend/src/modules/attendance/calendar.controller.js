import { attendanceCalendar, createHoliday, deleteHoliday, listHolidays, updateHoliday } from './calendar.service.js';

const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
export async function calendarHandler(req, res, next) { try { send(res, await attendanceCalendar(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function holidaysListHandler(req, res, next) { try { send(res, await listHolidays(req.auth, req.validated?.query || {})); } catch (error) { next(error); } }
export async function holidayCreateHandler(req, res, next) { try { send(res, await createHoliday(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function holidayUpdateHandler(req, res, next) { try { send(res, await updateHoliday(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function holidayDeleteHandler(req, res, next) { try { send(res, await deleteHoliday(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
