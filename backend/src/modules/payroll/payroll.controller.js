import { approvePayroll, buildPayslipPdf, generatePayroll, getMyPayroll, getPayrollItem, getPayrollItemByPeriod, getPayrollRun, listPayrollRuns, lockPayroll, payrollCsv } from './payroll.service.js';

const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
export async function generateHandler(req, res, next) { try { send(res, await generatePayroll(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function runsList(req, res, next) { try { send(res, await listPayrollRuns(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function runGet(req, res, next) { try { send(res, await getPayrollRun(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function runApprove(req, res, next) { try { send(res, await approvePayroll(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function runLock(req, res, next) { try { send(res, await lockPayroll(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function itemGet(req, res, next) { try { send(res, await getPayrollItem(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function itemPeriodGet(req, res, next) { try { send(res, await getPayrollItemByPeriod(req.auth, Number(req.params.employeeId), Number(req.params.month), Number(req.params.year))); } catch (error) { next(error); } }
export async function myList(req, res, next) { try { send(res, await getMyPayroll(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function csvExport(req, res, next) { try { const id = req.validated.query.runId; const csv = await payrollCsv(req.auth, id); res.type('text/csv').attachment(`worknest-payroll-${id}.csv`).send(csv); } catch (error) { next(error); } }
export async function pdfExport(req, res, next) { try { const pdf = await buildPayslipPdf(req.auth, Number(req.params.id)); res.type('application/pdf').attachment(`worknest-payslip-${req.params.id}.pdf`).send(pdf); } catch (error) { next(error); } }
