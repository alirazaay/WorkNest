import { unlink } from 'node:fs/promises';
import { createDepartment, createEmployee, deleteDepartment, deleteEmployee, getEmployee, listDepartments, listDocuments, listEmployees, addDocument, addSalaryStructure, updateDepartment, updateEmployee, updateEmployeeStatus } from './organization.service.js';

const send = (res, data, status = 200) => res.status(status).json({ success: true, data });

export async function departmentsList(req, res, next) { try { send(res, await listDepartments(req.auth.tenantId)); } catch (error) { next(error); } }
export async function departmentsCreate(req, res, next) { try { send(res, await createDepartment(req.auth.tenantId, req.validated.body), 201); } catch (error) { next(error); } }
export async function departmentsUpdate(req, res, next) { try { send(res, await updateDepartment(req.auth.tenantId, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function departmentsDelete(req, res, next) { try { await deleteDepartment(req.auth.tenantId, Number(req.params.id)); res.status(204).send(); } catch (error) { next(error); } }

export async function employeesList(req, res, next) { try { send(res, await listEmployees(req.auth, req.query)); } catch (error) { next(error); } }
export async function employeesGet(req, res, next) { try { send(res, await getEmployee(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function employeesCreate(req, res, next) { try { send(res, await createEmployee(req.auth.tenantId, req.validated.body), 201); } catch (error) { next(error); } }
export async function employeesUpdate(req, res, next) { try { send(res, await updateEmployee(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function employeesStatus(req, res, next) { try { send(res, await updateEmployeeStatus(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function employeesDelete(req, res, next) { try { send(res, await deleteEmployee(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function salaryCreate(req, res, next) { try { send(res, await addSalaryStructure(req.auth, Number(req.params.id), req.validated.body), 201); } catch (error) { next(error); } }
export async function documentCreate(req, res, next) { try { if (!req.file) return res.status(422).json({ success: false, error: { code: 'FILE_REQUIRED', message: 'A document file is required' } }); send(res, await addDocument(req.auth, Number(req.params.id), req.file, req.validated.body.documentType), 201); } catch (error) { if (req.file?.path) await unlink(req.file.path).catch(() => {}); next(error); } }
export async function documentsList(req, res, next) { try { send(res, await listDocuments(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
