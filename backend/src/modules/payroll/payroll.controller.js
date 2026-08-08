import { approvePayroll, bankCsv, buildPayslipPdf, generatePayroll, getMyPayroll, getPayrollItem, getPayrollItemByPeriod, getPayrollRun, listPayrollRuns, lockPayroll, payrollCsv, payrollReview } from './payroll.service.js';
import * as adminService from './payroll-admin.service.js';

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
export async function bankExport(req, res, next) { try { const csv = await bankCsv(req.auth, Number(req.params.id)); res.type('text/csv').attachment(`worknest-bank-${req.params.id}.csv`).send(csv); } catch (error) { next(error); } }
export async function pdfExport(req, res, next) { try { const pdf = await buildPayslipPdf(req.auth, Number(req.params.id)); res.type('application/pdf').attachment(`worknest-payslip-${req.params.id}.pdf`).send(pdf); } catch (error) { next(error); } }
const service = (fn, status = 200) => async (req, res, next) => { try { const result = await fn(req); send(res, result, status); } catch (error) { next(error); } };
export const salaryList = service((req) => adminService.listSalaryStructures(req.auth, req.params.employeeId ? Number(req.params.employeeId) : null));
export const salaryChange = service((req) => adminService.changeSalaryStructure(req.auth, Number(req.params.employeeId), req.validated.body), 201);
export const componentList = service((req) => adminService.listComponents(req.auth));
export const componentCreate = service((req) => adminService.createComponent(req.auth, req.validated.body), 201);
export const componentUpdate = service((req) => adminService.updateComponent(req.auth, Number(req.params.id), req.validated.body));
export const componentAssign = service((req) => adminService.assignComponent(req.auth, Number(req.params.employeeId), Number(req.params.componentId), req.validated.body), 201);
export const bonusList = service((req) => adminService.listBonuses(req.auth, req.validated.query));
export const bonusCreate = service((req) => adminService.createBonus(req.auth, req.validated.body), 201);
export const bonusApprove = service((req) => adminService.setBonusStatus(req.auth, Number(req.params.id), 'approved'));
export const bonusReject = service((req) => adminService.setBonusStatus(req.auth, Number(req.params.id), 'rejected'));
export const deductionList = service((req) => adminService.listDeductions(req.auth, req.validated.query));
export const deductionCreate = service((req) => adminService.createDeduction(req.auth, req.validated.body), 201);
export const deductionUpdate = service((req) => adminService.updateDeduction(req.auth, Number(req.params.id), req.validated.body));
export const loanList = service((req) => adminService.listLoans(req.auth));
export const loanGet = service((req) => adminService.getLoan(req.auth, Number(req.params.id)));
export const loanCreate = service((req) => adminService.createLoan(req.auth, req.validated.body), 201);
export const loanApprove = service((req) => adminService.setLoanStatus(req.auth, Number(req.params.id), 'approved', req.validated.body));
export const loanReject = service((req) => adminService.setLoanStatus(req.auth, Number(req.params.id), 'rejected'));
export const loanInstallmentList = service((req) => adminService.loanInstallments(req.auth, Number(req.params.id)));
export const bankList = service((req) => adminService.listBankAccounts(req.auth, Number(req.params.employeeId)));
export const bankCreate = service((req) => adminService.createBankAccount(req.auth, Number(req.params.employeeId), req.validated.body), 201);
export const bankUpdate = service((req) => adminService.updateBankAccount(req.auth, Number(req.params.id), req.validated.body));
export const reviewGet = service((req) => payrollReview(req.auth, Number(req.params.id)));
